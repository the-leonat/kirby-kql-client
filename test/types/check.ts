import type { Result } from '../../src/index.ts'

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
export type Mismatched<Queries, Observed> = {
	[Name in keyof Queries]: Name extends keyof Observed
		? false extends EqualForEachCase<Observed[Name], Queries[Name]>
			? Name
			: never
		: Name
}[keyof Queries]

/** `true`, `false` or `boolean` (some cases match, some don't). */
type EqualForEachCase<Observed, Q> = Q extends readonly (infer Case)[]
	? Case extends unknown
		? Equal<WidenToIndex<Observed, Result<Case>>, Result<Case>>
		: never
	: Equal<WidenToIndex<Observed, Result<Q>>, Result<Q>>

/**
 * Turns each observed object that sits where the result type `R` has a string
 * index signature into that index signature, with its values merged.
 * Everything else stays as observed. Each member of an observed union is paired
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
		? { [key: string]: WidenToIndex<Required<O>[keyof O], R[string & keyof R]> }
		: { [K in keyof O]: K extends keyof R ? WidenToIndex<O[K], R[K]> : O[K] }

/**
 * Fails to compile, naming the offending test queries, unless `Names` is `never`.
 * Use it as `type _ = AllMatch<Mismatched<typeof queries, Observed>>`.
 */
export type AllMatch<Names extends never> = Names
