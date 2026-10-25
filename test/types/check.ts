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
		? Equal<Observed, ResultOn<On, Case>>
		: never
	: Equal<Observed, ResultOn<On, Q>>

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
 * Fails to compile, naming the offending test queries, unless `Names` is `never`.
 * Use it as `type _ = AllMatch<Mismatched<typeof queries, Observed>>`.
 */
export type AllMatch<Names extends never> = Names
