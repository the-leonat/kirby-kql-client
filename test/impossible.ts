/**
 * Impossible queries: queries KQL can never answer. Each one is a compile
 * error at the query and has the result type `never`
 * (test/types/impossible.test.ts), and the test site rejects it with a
 * `KqlError` (test/runtime/client.test.ts).
 *
 * They live outside test/queries because there is no result to record.
 */
import { kql } from '../src/index.ts'

/** Query strings that don't parse: a bracket or a quote left open, a bracket never opened. */
export const unclosedBracket = kql({ query: "page('home'.title" })
export const unclosedQuote = kql({ query: "page('home).title" })
export const unopenedBracket = kql({ query: "page('home').title)" })

/** `nothing` is no root of the schema. */
export const unknownRoot = kql({ query: 'nothing.title' })

/** `slug` gives a string, `isListed` a boolean and `count` a number: none has methods. */
export const methodOnString = kql({ query: "page('home').slug.upper" })
export const methodOnBoolean = kql({ query: "page('home').isListed.not" })
export const methodOnNumber = kql({ query: "page('home').children.count.round" })

/**
 * An impossible query string inside a select makes the whole query
 * impossible: KQL rejects the whole request. (Only when it evaluates it,
 * though: a select on a missing page or an empty collection never is.)
 */
export const inQueryString = kql({ query: "page('home')", select: { title: true, teaser: 'nothing.title' } })
export const inNestedQuery = kql({
	query: 'site',
	select: { children: { query: 'site.children', select: { title: true, slug: 'page.slug.upper' } } },
})
export const inSelectWithoutQueryString = kql({
	query: 'site',
	select: { children: { select: { listed: 'page.isListed.not' } } },
})
