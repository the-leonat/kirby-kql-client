import type * as queries from '../queries/relations.ts'
import type { Observed } from '../fixtures/relations.ts'
import type { AllMatch, Mismatched } from './check.ts'

export type Relations = AllMatch<Mismatched<typeof queries, Observed>>
