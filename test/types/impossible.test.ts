/**
 * Impossible queries: a compile error at the query, naming the problem, and
 * the result type `never`.
 */
import { createClient, type Query } from '../../src/index.ts'
import * as impossible from '../impossible.ts'
import { testSite } from '../test-site.ts'
import type { Equal, ResultOn } from './check.ts'

const client = createClient(testSite)

/** What `client.query` accepts for the query `Q`: `Q` itself, or the problem when it is impossible. */
type Accepted<Q extends Query> = Parameters<typeof client.query<Q>>[0]

export function unknownRoot() {
	// @ts-expect-error `nothing` is no root
	return client.query(impossible.unknownRoot)
}

export const results: [
	Equal<ResultOn<typeof client, typeof impossible.unknownRoot>, never>,
	Equal<Awaited<ReturnType<typeof unknownRoot>>, never>,
] = [true, true]

export const problems: [
	Equal<Accepted<typeof impossible.unknownRoot>, 'Impossible query: unknown root "nothing"'>,
] = [true]
