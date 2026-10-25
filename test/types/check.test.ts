/**
 * Proves the type test can fail: a wrong observed type for a real test query
 * is rejected whether it is narrower or wider than the result type, and a
 * test query with cases is rejected unless every case matches.
 */
import type { homeBasics } from '../queries/fields.ts'
import type { toPageWithSelect } from '../queries/relations.ts'
import type { blocksWithoutSelect, structureWithoutSelect } from '../queries/rich.ts'
import { kql } from '../../src/index.ts'
import type { AllMatch, Mismatched } from './check.ts'

type Queries = { homeBasics: typeof homeBasics }

export type Correct = AllMatch<
	Mismatched<Queries, { homeBasics: { headline: string; slug: string; isListed: boolean } | null }>
>

export type TooNarrow = AllMatch<
	// @ts-expect-error `isListed: false` is narrower than `boolean`
	Mismatched<Queries, { homeBasics: { headline: string; slug: string; isListed: false } | null }>
>

export type TooWide = AllMatch<
	// @ts-expect-error `headline: string | null` is wider than `string`
	Mismatched<Queries, { homeBasics: { headline: string | null; slug: string; isListed: boolean } | null }>
>

export type MissingKey = AllMatch<
	// @ts-expect-error the observed type lacks `slug`
	Mismatched<Queries, { homeBasics: { headline: string; isListed: boolean } | null }>
>

export type ExtraKey = AllMatch<
	// @ts-expect-error the observed type has a key the select does not ask for
	Mismatched<Queries, { homeBasics: { headline: string; slug: string; isListed: boolean; title: string } | null }>
>

export type MissingFixture = AllMatch<
	// @ts-expect-error a test query without a fixture fails
	Mismatched<Queries, {}>
>

type CaseQueries = { toPageWithSelect: typeof toPageWithSelect }
type PageTitle = { title: string; slug: string; isListed: boolean }

export type CasesCorrect = AllMatch<Mismatched<CaseQueries, { toPageWithSelect: PageTitle | null }>>

export type CasesTooNarrow = AllMatch<
	// @ts-expect-error the cases' result type is wider than an observed type without `null`
	Mismatched<CaseQueries, { toPageWithSelect: PageTitle }>
>

export type OneCaseDiffers = AllMatch<
	// @ts-expect-error one case (`homeBasics`) has a different result type than the other
	Mismatched<{ mixed: [(typeof toPageWithSelect)[0], (typeof homeBasics)[0]] }, { mixed: PageTitle | null }>
>

/**
 * A page's `content` is typed `Record<string, string> | never[]`; the fixture
 * shows its concrete field names. Those match only if every value is a string.
 */
type IndexQueries = { content: typeof contentQuery }
const contentQuery = kql({ query: "page('selects/filled').content" })

export type IndexCorrect = AllMatch<
	Mismatched<IndexQueries, { content: { title: string; uuid: string; link?: string } | Array<never> }>
>

export type IndexWrongValue = AllMatch<
	// @ts-expect-error a content field observed as a number does not match `string`
	Mismatched<IndexQueries, { content: { title: string; count: number } | Array<never> }>
>

export type IndexNotAnObject = AllMatch<
	// @ts-expect-error an observed string is not an object keyed by field names
	Mismatched<IndexQueries, { content: string | Array<never> }>
>

export type IndexMissingEmpty = AllMatch<
	// @ts-expect-error the observed type lacks the `[]` of a page without content
	Mismatched<IndexQueries, { content: { title: string } }>
>

/**
 * A record in the result type (here the stored content of a block,
 * `Record<string, unknown> | never[]`) takes any observed keys, but everything
 * around it is still compared exactly.
 */
type RecordQueries = { blocksWithoutSelect: typeof blocksWithoutSelect }
type Block<Content> = { content: Content; id: string; isHidden: boolean; type: string }

export type RecordCorrect = AllMatch<
	Mismatched<RecordQueries, { blocksWithoutSelect: Block<{ text?: string; crop?: boolean } | Array<never>>[] }>
>

export type RecordMissingEmpty = AllMatch<
	// @ts-expect-error without a block whose content is `[]`, the result type is wider
	Mismatched<RecordQueries, { blocksWithoutSelect: Block<{ text?: string }>[] }>
>

export type RecordBesideWrongKey = AllMatch<
	// @ts-expect-error keys beside the record are compared exactly
	Mismatched<RecordQueries, { blocksWithoutSelect: { content: { text?: string } | Array<never>; id: number; isHidden: boolean; type: string }[] }>
>

/** A key the record names beside its index signature (a structure item's `id`) must be observed. */
type StructureQueries = { structureWithoutSelect: typeof structureWithoutSelect }

export type StructureCorrect = AllMatch<
	Mismatched<StructureQueries, { structureWithoutSelect: { id: string; title: string; count: number }[] }>
>

export type StructureWithoutId = AllMatch<
	// @ts-expect-error the observed items lack `id`
	Mismatched<StructureQueries, { structureWithoutSelect: { title: string; count: number }[] }>
>

export type StructureWrongId = AllMatch<
	// @ts-expect-error the observed `id` is a number
	Mismatched<StructureQueries, { structureWithoutSelect: { id: number; title: string }[] }>
>
