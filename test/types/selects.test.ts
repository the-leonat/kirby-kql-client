import type * as queries from '../queries/selects.ts'
import type { Observed } from '../fixtures/selects.ts'
import type { AllMatch, Mismatched } from './check.ts'

export type Selects = AllMatch<Mismatched<typeof queries, Observed>>
