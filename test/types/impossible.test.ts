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

export function methodOnString() {
	// @ts-expect-error a string has no methods
	return client.query(impossible.methodOnString)
}

export function methodOnBoolean() {
	// @ts-expect-error a boolean has no methods
	return client.query(impossible.methodOnBoolean)
}

export function methodOnNumber() {
	// @ts-expect-error a number has no methods
	return client.query(impossible.methodOnNumber)
}

export const results: [
	Equal<ResultOn<typeof client, typeof impossible.unknownRoot>, never>,
	Equal<Awaited<ReturnType<typeof unknownRoot>>, never>,
	Equal<ResultOn<typeof client, typeof impossible.methodOnString>, never>,
	Equal<Awaited<ReturnType<typeof methodOnString>>, never>,
	Equal<ResultOn<typeof client, typeof impossible.methodOnBoolean>, never>,
	Equal<ResultOn<typeof client, typeof impossible.methodOnNumber>, never>,
] = [true, true, true, true, true, true]

export const problems: [
	Equal<Accepted<typeof impossible.unknownRoot>, 'Impossible query: unknown root "nothing"'>,
	Equal<Accepted<typeof impossible.methodOnString>, 'Impossible query: method "upper" called on a string'>,
	Equal<Accepted<typeof impossible.methodOnBoolean>, 'Impossible query: method "not" called on a boolean'>,
	Equal<Accepted<typeof impossible.methodOnNumber>, 'Impossible query: method "round" called on a number'>,
] = [true, true, true, true]

/**
 * A method after a value that is a JSON scalar only sometimes is not
 * impossible: `width` gives a number for an image, a field for any other file.
 */
type WidthThenMethod = { query: "page('collections/filled').files.first.width.isEmpty" }

export const possible: [
	Equal<ResultOn<typeof client, WidthThenMethod>, boolean>,
	Equal<Accepted<WidthThenMethod>, WidthThenMethod>,
] = [true, true]
