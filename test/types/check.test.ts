/**
 * Proves the type test can fail: a wrong observed type for a real test query
 * is rejected whether it is narrower or wider than the result type.
 */
import type { homeBasics } from '../queries/fields.ts'
import type { AllMatch, Mismatched } from './check.ts'

type Queries = { homeBasics: typeof homeBasics }

export type Correct = AllMatch<
	Mismatched<Queries, { homeBasics: { headline: string; slug: string; isListed: boolean } }>
>

export type TooNarrow = AllMatch<
	// @ts-expect-error `isListed: false` is narrower than `boolean`
	Mismatched<Queries, { homeBasics: { headline: string; slug: string; isListed: false } }>
>

export type TooWide = AllMatch<
	// @ts-expect-error `headline: string | null` is wider than `string`
	Mismatched<Queries, { homeBasics: { headline: string | null; slug: string; isListed: boolean } }>
>

export type MissingKey = AllMatch<
	// @ts-expect-error the observed type lacks `slug`
	Mismatched<Queries, { homeBasics: { headline: string; isListed: boolean } }>
>

export type ExtraKey = AllMatch<
	// @ts-expect-error the observed type has a key the select does not ask for
	Mismatched<Queries, { homeBasics: { headline: string; slug: string; isListed: boolean; title: string } }>
>

export type MissingFixture = AllMatch<
	// @ts-expect-error a test query without a fixture fails
	Mismatched<Queries, {}>
>
