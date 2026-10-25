/**
 * Plugin methods with a schema extension passed to `createClient`: they get
 * their real types. A second client with another extension, and a client
 * without one, keep their own types for the same query.
 */
import { createClient } from '../../src/index.ts'
import type * as queries from '../queries/extension.ts'
import type { PluginExtension } from '../queries/extension.ts'
import type { Observed } from '../fixtures/extension.ts'
import { testSite } from '../test-site.ts'
import type { AllMatch, Equal, Mismatched, ResultOn } from './check.ts'

const client = createClient<PluginExtension>(testSite)

export type Extension = AllMatch<Mismatched<typeof queries, Observed, typeof client>>

export type WithoutExtension = AllMatch<
	// @ts-expect-error a client without the extension doesn't know the plugin's methods
	Mismatched<typeof queries, Observed>
>

/** Describes only `shout`, and as a JSON type rather than a field. */
type OtherExtension = { classes: { field: { methods: { shout: string } } } }

const other = createClient<OtherExtension>(testSite)
const plain = createClient(testSite)

type Shout = { query: "page('plugin/filled').title.shout.isEmpty" }

export const separate: [
	Equal<ResultOn<typeof client, Shout>, boolean>,
	Equal<ResultOn<typeof other, Shout>, unknown>,
	Equal<ResultOn<typeof plain, Shout>, unknown>,
	Equal<ResultOn<typeof other, { query: "page('plugin/filled').title.shout" }>, string>,
] = [true, true, true, true]
