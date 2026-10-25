/**
 * Select forms: a record, a list of keys and a comma-separated string, keys
 * set to `false`, and selects without a query string.
 *
 * Content: the pages under `selects/` (see test/queries/defaultFields.ts).
 */
import { kql } from '../../src/index.ts'

/**
 * The same keys as a record, a list and a comma-separated string (with spaces
 * around the commas) give the same result. The unlisted, empty page has no
 * `num`.
 */
export const selectForms = [
	kql({
		query: "page('selects/filled')",
		select: { title: true, headline: true, num: true, isListed: true, children: true },
	}),
	kql({ query: "page('selects/filled')", select: ['title', 'headline', 'num', 'isListed', 'children'] }),
	kql({ query: "page('selects/filled')", select: 'title, headline,num , isListed,children' }),
	kql({ query: "page('selects/empty')", select: ['title', 'headline', 'num', 'isListed', 'children'] }),
	kql({
		query: "page('missing')",
		select: { title: true, headline: true, num: true, isListed: true, children: true },
	}),
]

/** Keys set to `false` are left out. */
export const falseKeys = [
	kql({ query: "page('selects/filled')", select: { title: true, headline: false, num: false } }),
	kql({ query: "page('missing')", select: { title: true, headline: false, num: false } }),
]

/**
 * A select without a query string reads its key from the current object and
 * selects from what that gives: a single page (or `null` for a top-level
 * page's parent), the page's content, and collections.
 */
const withoutQueryString = {
	parent: { select: ['title', 'num'] },
	content: { select: ['title', 'headline'] },
	children: { select: ['title'] },
	files: { select: { filename: true, type: true } },
} as const

export const selectWithoutQueryString = [
	kql({ query: "page('selects/filled/child')", select: withoutQueryString }),
	kql({ query: "page('selects/filled')", select: withoutQueryString }),
	kql({ query: "page('selects')", select: withoutQueryString }),
	kql({ query: "page('missing')", select: withoutQueryString }),
]

/** A select that leaves out every key gives an empty JSON array, not `{}`. */
export const allKeysFalse = [
	kql({ query: "page('selects/filled')", select: { title: false, headline: false } }),
	kql({ query: "page('selects/filled')", select: {} }),
	kql({ query: "page('missing')", select: { title: false, headline: false } }),
]
