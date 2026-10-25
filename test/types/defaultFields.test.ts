import type * as queries from '../queries/defaultFields.ts'
import type { Observed } from '../fixtures/defaultFields.ts'
import type { AllMatch, Mismatched } from './check.ts'

export type DefaultFields = AllMatch<Mismatched<typeof queries, Observed>>
