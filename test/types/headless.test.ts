import type * as queries from '../queries/headless.ts'
import type { Observed } from '../fixtures/headless.ts'
import type { AllMatch, Mismatched } from './check.ts'

export type Headless = AllMatch<Mismatched<typeof queries, Observed>>
