/**
 * Impossible queries: a compile error at the query, naming the problem, and
 * the result type `never`.
 */
import { createClient } from '../../src/index.ts'
import * as impossible from '../impossible.ts'
import { testSite } from '../test-site.ts'
import type { Equal, ProblemOn, ResultOn } from './check.ts'

const client = createClient(testSite)

export function unclosedBracket() {
	// @ts-expect-error the bracket of `page(` is never closed
	return client.query(impossible.unclosedBracket)
}

export function unclosedQuote() {
	// @ts-expect-error the quote of `'home` is never closed
	return client.query(impossible.unclosedQuote)
}

export function unopenedBracket() {
	// @ts-expect-error the last `)` closes no bracket
	return client.query(impossible.unopenedBracket)
}

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

export function inQueryString() {
	// @ts-expect-error the select's `teaser` starts at no root
	return client.query(impossible.inQueryString)
}

export function inNestedQuery() {
	// @ts-expect-error the nested query's `slug` calls a method on a string
	return client.query(impossible.inNestedQuery)
}

export function inSelectWithoutQueryString() {
	// @ts-expect-error the inner select's `listed` calls a method on a boolean
	return client.query(impossible.inSelectWithoutQueryString)
}

export const nested: [
	Equal<ResultOn<typeof client, typeof impossible.inQueryString>, never>,
	Equal<Awaited<ReturnType<typeof inQueryString>>, never>,
	Equal<ResultOn<typeof client, typeof impossible.inNestedQuery>, never>,
	Equal<ResultOn<typeof client, typeof impossible.inSelectWithoutQueryString>, never>,
	Equal<ProblemOn<typeof client, typeof impossible.inQueryString>, 'unknown root "nothing"'>,
	Equal<ProblemOn<typeof client, typeof impossible.inNestedQuery>, 'method "upper" called on a string'>,
	Equal<ProblemOn<typeof client, typeof impossible.inSelectWithoutQueryString>, 'method "not" called on a boolean'>,
] = [true, true, true, true, true, true, true]

export const results: [
	Equal<ResultOn<typeof client, typeof impossible.unclosedBracket>, never>,
	Equal<Awaited<ReturnType<typeof unclosedBracket>>, never>,
	Equal<ResultOn<typeof client, typeof impossible.unclosedQuote>, never>,
	Equal<ResultOn<typeof client, typeof impossible.unopenedBracket>, never>,
	Equal<ResultOn<typeof client, typeof impossible.unknownRoot>, never>,
	Equal<Awaited<ReturnType<typeof unknownRoot>>, never>,
	Equal<ResultOn<typeof client, typeof impossible.methodOnString>, never>,
	Equal<Awaited<ReturnType<typeof methodOnString>>, never>,
	Equal<ResultOn<typeof client, typeof impossible.methodOnBoolean>, never>,
	Equal<ResultOn<typeof client, typeof impossible.methodOnNumber>, never>,
] = [true, true, true, true, true, true, true, true, true, true]

export const problems: [
	Equal<ProblemOn<typeof client, typeof impossible.unclosedBracket>, `unclosed bracket in "page('home'.title"`>,
	Equal<ProblemOn<typeof client, typeof impossible.unclosedQuote>, `unclosed quote in "page('home).title"`>,
	Equal<ProblemOn<typeof client, typeof impossible.unopenedBracket>, `unopened bracket in "page('home').title)"`>,
	Equal<ProblemOn<typeof client, typeof impossible.unknownRoot>, 'unknown root "nothing"'>,
	Equal<ProblemOn<typeof client, typeof impossible.methodOnString>, 'method "upper" called on a string'>,
	Equal<ProblemOn<typeof client, typeof impossible.methodOnBoolean>, 'method "not" called on a boolean'>,
	Equal<ProblemOn<typeof client, typeof impossible.methodOnNumber>, 'method "round" called on a number'>,
] = [true, true, true, true, true, true, true]

/**
 * An empty query string is not impossible: KQL answers it, with an object
 * that is no class's rendering (`{ site: { blueprints: null, … } }`), so its
 * result type stays `unknown`.
 */
type Empty = { query: '' }

export const empty: [Equal<ResultOn<typeof client, Empty>, unknown>, Equal<ProblemOn<typeof client, Empty>, never>] = [true, true]

/**
 * A method after a value that is a JSON scalar only sometimes is not
 * impossible: `width` gives a number for an image, a field for any other file.
 */
type WidthThenMethod = { query: "page('collections/filled').files.first.width.isEmpty" }

export const possible: [
	Equal<ResultOn<typeof client, WidthThenMethod>, boolean>,
	Equal<ProblemOn<typeof client, WidthThenMethod>, never>,
] = [true, true]
