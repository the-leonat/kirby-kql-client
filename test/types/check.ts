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
		? EqualAsRecords<Observed, Result<Case>>
		: never
	: EqualAsRecords<Observed, Result<Q>>

type EqualAsRecords<Observed, R> = Equal<AsRecords<Observed, R>, R>

/**
 * The observed type, read with the records the result type has: where the
 * result type has a record (an index signature, such as the stored content of
 * a block, `Record<string, unknown>`), the observed object at that place
 * becomes a record of its observed values. The keys of a record depend on the
 * content, so only its values are compared; a record of `unknown` takes any
 * values. Keys the record names beside its index signature are compared as
 * usual. Everything else stays as observed.
 */
export type AsRecords<Observed, R> = Observed extends readonly unknown[]
	? Observed extends readonly []
		? Observed
		: Array<AsRecords<Observed[number], ItemOf<R>>>
	: Observed extends object
		? AsRecordObject<Observed, ObjectOf<R>>
		: Observed

type AsRecordObject<Observed, R> = string extends keyof R
	? {
			[Key in keyof R]: string extends Key
				? RecordValues<Observed[Exclude<keyof Observed, KnownKeys<R>>], R[Key]>
				: Key extends keyof Observed
					? AsRecords<Observed[Key], R[Key]>
					: never
		}
	: { [Key in keyof Observed]: AsRecords<Observed[Key], PropertyOf<R, Key>> }

type RecordValues<Observed, Value> = unknown extends Value ? unknown : AsRecords<Observed, Value>

type ItemOf<R> = R extends readonly (infer Item)[] ? Item : never
type ObjectOf<R> = Exclude<R, readonly unknown[] | boolean | number | string | null | undefined>
type PropertyOf<R, Key> = R extends unknown ? (Key extends keyof R ? R[Key] : never) : never
type KnownKeys<R> = keyof { [Key in keyof R as string extends Key ? never : number extends Key ? never : Key]: 0 }

/**
 * Fails to compile, naming the offending test queries, unless `Names` is `never`.
 * Use it as `type _ = AllMatch<Mismatched<typeof queries, Observed>>`.
 */
export type AllMatch<Names extends never> = Names
