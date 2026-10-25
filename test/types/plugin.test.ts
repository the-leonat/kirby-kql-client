/**
 * Plugin methods without a schema extension: their results are `unknown`, and
 * an undescribed page method reads like a content field.
 */
import type * as queries from '../queries/plugin.ts'
import type { Observed } from '../fixtures/plugin.ts'
import type { AllMatch, Mismatched, Unfit } from './check.ts'

/** What the result types must be, written from the glossary's rules. */
type Expected = {
	unknownFieldMethod: unknown
	unknownCollectionMethod: unknown
	selectKeepsKeys: { title: string; shout: unknown; stats: unknown; count: unknown } | null
	pageMethodAsContentField: { readingTime: string } | null
}

type WithoutKnownLimitation = Omit<Expected, 'pageMethodAsContentField'>

export type ResultTypes = AllMatch<Mismatched<typeof queries, Expected>>

export type Fixtures = AllMatch<Unfit<WithoutKnownLimitation, Observed>>

export type KnownLimitation = AllMatch<
	// @ts-expect-error the plugin's `readingTime` gives a number, not the content field's string
	Unfit<Pick<Expected, 'pageMethodAsContentField'>, Observed>
>
