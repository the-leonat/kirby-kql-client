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
		? Equal<Observed, Result<Case>>
		: never
	: Equal<Observed, Result<Q>>

/**
 * Fails to compile, naming the offending test queries, unless `Names` is `never`.
 * Use it as `type _ = AllMatch<Mismatched<typeof queries, Observed>>`.
 */
export type AllMatch<Names extends never> = Names
