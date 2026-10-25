/**
 * Walk: follows the steps of a parsed query string through the schema and
 * gives what the last step returns (a `Returns`: class name or JSON type).
 *
 * The first step starts at the surrounding object when it names that object's
 * class (in nested queries, `page.title` inside a select on a page), and at a
 * root of the schema otherwise.
 *
 * Rules for each further step:
 * - `null` carries forward (to be confirmed by fixtures).
 * - Unknown carries forward.
 * - A known method gives its return value.
 * - An unknown key on a model (page, site, file, user) gives a content field.
 * - Anything else gives Unknown.
 */
import type { ClassName, IsClass, Schema } from '../schema.ts'
import type { Step } from './parse.ts'

/** The surrounding object's class in a nested query, or `never` at the top. */
export type Walk<Steps extends Step[], S extends Schema, Surrounding extends string = never> =
	Steps extends [infer First extends Step, ...infer Rest extends Step[]]
		? Follow<Start<First, S, Surrounding>, Rest, S>
		: unknown

type Start<First extends Step, S extends Schema, Surrounding extends string> =
	First['name'] extends Surrounding
		? First['name']
		: First['name'] extends keyof S['roots']
			? S['roots'][First['name']]
			: unknown

/** Follows `Steps` from the value `Current`. */
export type Follow<Current, Steps extends Step[], S extends Schema> =
	Steps extends [infer Next extends Step, ...infer Rest extends Step[]]
		? Follow<Call<Current, Next, S>, Rest, S>
		: Current

type Call<Current, Next extends Step, S extends Schema> = unknown extends Current
	? unknown
	: CallEach<Current, Next, S>

/** Distributes over a union such as `'page' | null`. */
type CallEach<Current, Next extends Step, S extends Schema> = Current extends null
	? null
	: IsClass<Current, S> extends true
		? CallMethod<Current & ClassName<S>, Next['name'], S>
		: unknown

type CallMethod<C extends ClassName<S>, Name extends string, S extends Schema> =
	Name extends keyof S['classes'][C]['methods']
		? S['classes'][C]['methods'][Name]
		: S['classes'][C] extends { model: true }
			? 'field'
			: unknown
