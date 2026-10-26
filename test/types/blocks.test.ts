/**
 * Block types: with a `blocks` key in its schema extension, a client types
 * every block rendered without a select by its block type, from the core
 * blocks and the extension's custom blocks.
 */
import { createClient } from '../../src/index.ts'
import type * as queries from '../queries/blocks.ts'
import type { BlocksExtension } from '../queries/blocks.ts'
import type { Observed } from '../fixtures/blocks.ts'
import { testSite } from '../test-site.ts'
import type { AllMatch, Mismatched } from './check.ts'

const client = createClient<BlocksExtension>(testSite)

export type Blocks = AllMatch<Mismatched<typeof queries, Observed, typeof client>>
