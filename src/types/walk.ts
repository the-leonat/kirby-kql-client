/**
 * Walk: follows the steps of a parsed query string through the schema and
 * gives what the last step returns (a `ReturnValue`: class name or JSON type).
 *
 * The first step starts at the surrounding object when it names that object's
 * class without arguments (in nested queries, `page.title` inside a select on a
 * page), and at a root of the schema otherwise (`page('home')`). A first step
 * that names neither is Impossible: KQL answers 400.
 *
 * Rules for each further step:
 * - A method on `null` is an error (KQL answers 400), so a value that can be
 *   `null` loses its `null` when a step follows it with `.`.
 * - A step reached with `?.` on `null` ends the query string: the result is `null`.
 * - Unknown and Impossible carry forward.
 * - A known method gives its return value: the one for the step's argument
 *   count if the class has an overload for it, else the method's.
 * - An unknown key on a model (page, site, file, user, block, structure item)
 *   gives a content field.
 * - Anything else gives Unknown.
 * - `paginate(…)` on a collection gives that collection Paginated. A method on a
 *   Paginated collection that gives the same collection keeps it Paginated (Kirby
 *   clones the collection together with its pagination, as `filterBy` and
 *   `sortBy` do); anything else, such as `first`, drops it. `paginate` is in
 *   no schema because KQL blocks it unless a site allows it
 *   (`kql.methods.allowed`); this rule types it for the sites that do.
 *   `children`, `drafts` and `index` on a Paginated `pages` give `pages` too, but
 *   build a new collection without the pagination, so they drop it.
 */
import type { ClassName, IsClass, Schema } from '../schema.ts'
import type { Impossible } from './impossible.ts'
import type { Step } from './parse.ts'

/**
 * A collection class `C` with a pagination, as `paginate(…)` in a query
 * string gives it. With a select, it renders wrapped in `{ data, pagination }`.
 */
export interface Paginated<C extends string = string> {
	paginated: C
}

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
			: Impossible<`unknown root "${First['name']}"`>

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
	: UnlessPossible<CallEach<Current, Next, S>>

/**
 * The possible members of `R`, or `R` if none is: a step is impossible only
 * if it is for every member of the value before it.
 */
type UnlessPossible<R> = [Exclude<R, Impossible>] extends [never] ? R : Exclude<R, Impossible>

/**
 * Distributes over a union such as `'page' | null`; the `null` member throws.
 * Impossible stays impossible, and a method on a JSON scalar is impossible.
 */
type CallEach<Current, Next extends Step, S extends Schema> = Current extends Impossible
	? Current
	: Current extends null
		? never
		: Current extends Paginated<infer C>
			? Next['name'] extends NewCollection
				? Call<C, Next, S>
				: KeepPaginated<C, Call<C, Next, S>>
			: IsClass<Current, S> extends true
				? [Next['name'], S['classes'][Current & ClassName<S>]] extends ['paginate', { item: string }]
					? Paginated<Current & string>
					: CallMethod<Current & ClassName<S>, Next, S>
				: Current extends Scalar
					? Impossible<`method "${Next['name']}" called on a ${ScalarName<Current>}`>
					: unknown

type Scalar = boolean | number | string

type ScalarName<Value extends Scalar> = Value extends boolean ? 'boolean' : Value extends number ? 'number' : 'string'

/**
 * Methods of `pages` that build a new collection (the children, drafts or
 * descendants of its pages) instead of cloning it, so the pagination is lost.
 */
type NewCollection = 'children' | 'drafts' | 'index'

/** A method on a Paginated collection `C` that gives `C` again keeps it Paginated. */
type KeepPaginated<C extends string, R> = [R] extends [C] ? ([C] extends [R] ? Paginated<C> : R) : R

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
