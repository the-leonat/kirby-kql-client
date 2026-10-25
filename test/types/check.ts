import type { Client, Result } from '../../src/index.ts'

/** True only if `A` and `B` are identical types: neither is narrower or wider. */
export type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false

/**
 * The names of the test queries whose result type differs from the observed
 * type of their fixture, or that have no fixture. `never` when all match.
 *
 * A test query given as a list of queries has cases: the result type of every
 * case must equal the observed type merged from all their fixtures.
 *
 * Where the result type has a string index signature, such as a page's
 * `content` (`Record<string, string>`), its keys are content field names that
 * no type can list, so the fixture shows concrete keys instead. There, the
 * observed object counts as the index signature of its values merged: it
 * matches only if every value matches the index signature's value exactly.
 */
export type Mismatched<Queries, Observed, On extends Client<any> = Client> = {
	[Name in keyof Queries]: Name extends keyof Observed
		? false extends EqualForEachCase<Observed[Name], Queries[Name], On>
			? Name
			: never
		: Name
}[keyof Queries]

/** `true`, `false` or `boolean` (some cases match, some don't). */
type EqualForEachCase<Observed, Q, On extends Client<any>> = Q extends readonly (infer Case)[]
	? Case extends unknown
		? Equal<WidenToIndex<Observed, ResultOn<On, Case>>, ResultOn<On, Case>>
		: never
	: Equal<WidenToIndex<Observed, ResultOn<On, Q>>, ResultOn<On, Q>>

/** The result type the client `On` gives the query `Q`, e.g. `ResultOn<typeof client, typeof query>`. */
export type ResultOn<On extends Client<any>, Q> = On extends Client<infer S> ? Result<Q, S> : never

/**
 * The names of the test queries whose fixture does not fit the expected type
 * (its observed type is not assignable to it), or that have no fixture.
 *
 * For result types that hold `unknown`, which no observed type can equal:
 * the test checks the result type against `Expected` with `Mismatched`, and
 * the fixture against `Expected` with `Unfit`.
 */
export type Unfit<Expected, Observed> = {
	[Name in keyof Expected]: Name extends keyof Observed
		? Observed[Name] extends Expected[Name]
			? never
			: Name
		: Name
}[keyof Expected]

/**
 * Turns each observed object that sits where the result type `R` has a string
 * index signature into that index signature, with its values merged. Keys
 * that `R` names beside the index signature are compared as usual, and an
 * index signature of `unknown` takes any values. Everything else stays as
 * observed. Each member of an observed union is paired
 * with the member of `R` of the same kind (array, object, or anything else).
 */
type WidenToIndex<O, R> = O extends readonly (infer Item)[]
	? Extract<R, readonly unknown[]> extends readonly (infer RItem)[]
		? WidenToIndex<Item, RItem>[]
		: O
	: O extends object
		? WidenObject<O, Exclude<Extract<R, object>, readonly unknown[]>>
		: O

type WidenObject<O extends object, R> = [R] extends [never]
	? O
	: string extends keyof R
		? {
				[K in keyof R]: string extends K
					? WidenValues<Required<O>[Exclude<keyof O, NamedKeys<R>>], R[K]>
					: K extends keyof O
						? WidenToIndex<O[K], R[K]>
						: never
			}
		: { [K in keyof O]: K extends keyof R ? WidenToIndex<O[K], R[K]> : O[K] }

/** An index signature of `unknown` (stored content of any JSON type) takes any values. */
type WidenValues<O, V> = unknown extends V ? unknown : WidenToIndex<O, V>

/** The keys `R` names beside its index signature, such as a structure item's `id`. */
type NamedKeys<R> = keyof { [K in keyof R as string extends K ? never : number extends K ? never : K]: 0 }

/**
 * Fails to compile, naming the offending test queries, unless `Names` is `never`.
 * Use it as `type _ = AllMatch<Mismatched<typeof queries, Observed>>`.
 */
export type AllMatch<Names extends never> = Names
