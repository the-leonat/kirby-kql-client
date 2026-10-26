import type * as queries from '../queries/collections.ts'
import type { Observed } from '../fixtures/collections.ts'
import type { AllMatch, Mismatched } from './check.ts'

export type Collections = AllMatch<Mismatched<typeof queries, Observed>>
