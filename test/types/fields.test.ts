import type * as queries from '../queries/fields.ts'
import type { Observed } from '../fixtures/fields.ts'
import type { AllMatch, Mismatched } from './check.ts'

export type Fields = AllMatch<Mismatched<typeof queries, Observed>>
