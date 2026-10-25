/**
 * Walk: follows the steps of a parsed query string through the schema and
 * gives what the last step returns (a `Returns`: class name or JSON type).
 *
 * The first step starts at the surrounding object when it names that object's
 * class without arguments (in nested queries, `page.title` inside a select on a
 * page), and at a root of the schema otherwise (`page('home')`).
 *
 * Rules for each further step:
 * - A method on `null` is an error (KQL answers 400), so a value that can be
 *   `null` loses its `null` when a step follows it with `.`.
 * - A step reached with `?.` on `null` ends the query string: the result is `null`.
 * - Unknown carries forward.
 * - A known method gives its return value: the one for the step's argument
 *   count if the class has an overload for it, else the method's.
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

/** With arguments, a name like `page('…')` is the root even inside a select on a page. */
type Start<First extends Step, S extends Schema, Surrounding extends string> =
	[First['name'], First['args']] extends [Surrounding, 0]
		? First['name']
		: First['name'] extends keyof S['roots']
			? S['roots'][First['name']]
			: unknown

/** Follows `Steps` from the value `Current`. */
export type Follow<Current, Steps extends Step[], S extends Schema> =
	Steps extends [infer Next extends Step, ...infer Rest extends Step[]]
		? Next['optional'] extends true
			? null extends Current
				? Follow<Call<Exclude<Current, null>, Next, S>, Rest, S> | null
				: Follow<Call<Current, Next, S>, Rest, S>
			: Follow<Call<Current, Next, S>, Rest, S>
		: Current

type Call<Current, Next extends Step, S extends Schema> = unknown extends Current
	? unknown
	: CallEach<Current, Next, S>

/** Distributes over a union such as `'page' | null`; the `null` member throws. */
type CallEach<Current, Next extends Step, S extends Schema> = Current extends null
	? never
	: IsClass<Current, S> extends true
		? CallMethod<Current & ClassName<S>, Next, S>
		: unknown

/** The overload for the step's argument count wins over the method's return value. */
type CallMethod<C extends ClassName<S>, Next extends Step, S extends Schema> =
	S['classes'][C] extends { overloads: { [M in Next['name']]: infer Overloads } }
		? number extends Next['args']
			? MethodReturn<C, Next['name'], S>
			: Next['args'] extends keyof Overloads
				? Overloads[Next['args']]
				: MethodReturn<C, Next['name'], S>
		: MethodReturn<C, Next['name'], S>

type MethodReturn<C extends ClassName<S>, Name extends string, S extends Schema> =
	Name extends keyof S['classes'][C]['methods']
		? S['classes'][C]['methods'][Name]
		: S['classes'][C] extends { model: true }
			? 'field'
			: unknown
