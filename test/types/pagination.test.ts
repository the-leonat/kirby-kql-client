/**
 * Pagination. Every test query but one has a result type equal to its
 * fixture's observed type; the stale wrapper after paginating a page's
 * children is a known limitation, checked against hand-written types.
 */
import type * as queries from '../queries/pagination.ts'
import type { Observed } from '../fixtures/pagination.ts'
import type { PaginationInfo } from '../../src/index.ts'
import type { AllMatch, Mismatched, Unfit } from './check.ts'

type Stale = 'staleWrapperAfterPaginatingChildren'

export type Pagination = AllMatch<Mismatched<Omit<typeof queries, Stale>, Observed>>

type Title = { title: string }
type Wrapped = { data: Title[]; pagination: PaginationInfo }

/** What the result type says: the later `page.children` is a plain list. */
type Typed = { [Name in Stale]: { paged: Wrapped; again: Title[] } | null }

/** What KQL really sends: the later `page.children` is wrapped too. */
type Sent = { [Name in Stale]: { paged: Wrapped; again: Wrapped } | null }

export type StaleResultType = AllMatch<Mismatched<Pick<typeof queries, Stale>, Typed>>

export type StaleFixture = AllMatch<Unfit<Sent, Observed>>

export type KnownLimitation = AllMatch<
	// @ts-expect-error KQL wraps the later `page.children` too, the result type doesn't
	Unfit<Typed, Observed>
>
