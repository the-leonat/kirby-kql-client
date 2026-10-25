/**
 * anorak's production queries on a client with anorak's schema extension,
 * through kirby-headless's route with a Bearer token, as anorak queries it.
 */
import { createClient } from '../../src/index.ts'
import type * as queries from '../queries/anorak.ts'
import type { AnorakExtension } from '../queries/anorak.ts'
import type { Observed } from '../fixtures/anorak.ts'
import { headlessTestSite } from '../test-site.ts'
import type { AllMatch, Mismatched } from './check.ts'

const client = createClient<AnorakExtension>(headlessTestSite)

export type Anorak = AllMatch<Mismatched<typeof queries, Observed, typeof client>>

export type WithoutExtension = AllMatch<
	// @ts-expect-error a client without the extension doesn't know kirby-meta's `page.meta`
	Mismatched<typeof queries, Observed>
>
