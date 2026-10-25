import type * as queries from '../queries/rich.ts'
import type { Observed } from '../fixtures/rich.ts'
import type { AllMatch, Mismatched } from './check.ts'

export type Rich = AllMatch<Mismatched<typeof queries, Observed>>
