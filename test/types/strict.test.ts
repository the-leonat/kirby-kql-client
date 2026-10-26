/**
 * `strict` on `createClient`: an unknown method is an impossible query, not
 * `unknown`. Content fields and described methods type as without it.
 */
import { createClient, type Query } from '../../src/index.ts'
import * as plugin from '../queries/plugin.ts'
import type * as extension from '../queries/extension.ts'
import type { PluginExtension } from '../queries/extension.ts'
import type * as anorak from '../queries/anorak.ts'
import type { AnorakExtension } from '../queries/anorak.ts'
import type { Observed as ObservedExtension } from '../fixtures/extension.ts'
import type { Observed as ObservedAnorak } from '../fixtures/anorak.ts'
import { headlessTestSite, testSite } from '../test-site.ts'
import type { AllMatch, Equal, Mismatched, ResultOn } from './check.ts'

const strict = createClient({ ...testSite, strict: true })

/** What `strict.query` accepts for the query `Q`. */
type Accepted<Q extends Query> = Parameters<typeof strict.query<Q>>[0]

export function unknownFieldMethod() {
	// @ts-expect-error `shout` is an unknown method of `field`
	return strict.query(plugin.unknownFieldMethod[0]!)
}

export function unknownCollectionMethod() {
	// @ts-expect-error `stats` is an unknown method of `pages`
	return strict.query(plugin.unknownCollectionMethod[0]!)
}

export function unknownMethodInSelect() {
	// @ts-expect-error the select's `shout` and `stats` are unknown methods
	return strict.query(plugin.selectKeepsKeys[0]!)
}

type FieldMethod = (typeof plugin.unknownFieldMethod)[0]
type CollectionMethod = (typeof plugin.unknownCollectionMethod)[0]

export const unknownMethods: [
	Equal<ResultOn<typeof strict, FieldMethod>, never>,
	Equal<Awaited<ReturnType<typeof unknownFieldMethod>>, never>,
	Equal<ResultOn<typeof strict, CollectionMethod>, never>,
	Equal<ResultOn<typeof strict, (typeof plugin.selectKeepsKeys)[0]>, never>,
	Equal<Accepted<FieldMethod>, 'Impossible query: unknown method "shout" on "field"'>,
	Equal<Accepted<CollectionMethod>, 'Impossible query: unknown method "stats" on "pages"'>,
] = [true, true, true, true, true, true]

/** Without `strict`, the same methods stay `unknown`. */
const plain = createClient(testSite)

export const withoutStrict: [
	Equal<ResultOn<typeof plain, FieldMethod>, unknown>,
	Equal<ResultOn<typeof plain, CollectionMethod>, unknown>,
] = [true, true]

/** An unknown key on a page is a content field, with `strict` too. */
export const contentField: Equal<
	ResultOn<typeof strict, (typeof plugin.pageMethodAsContentField)[0]>,
	{ readingTime: string } | null
> = true

/** Described methods type exactly as without `strict`. */
const strictExtension = createClient<PluginExtension>({ ...testSite, strict: true })
const strictAnorak = createClient<AnorakExtension>({ ...headlessTestSite, strict: true })

export type Extension = AllMatch<Mismatched<typeof extension, ObservedExtension, typeof strictExtension>>
export type Anorak = AllMatch<Mismatched<typeof anorak, ObservedAnorak, typeof strictAnorak>>
