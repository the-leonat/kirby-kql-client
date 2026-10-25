/**
 * The test plugin's methods on a client WITHOUT a schema extension.
 *
 * The plugin (test/site/site/plugins/kql-test) adds the field method `shout`
 * (gives a field), the page method `readingTime` (gives a number) and the
 * pages method `stats` (gives a `stats` object with `count`, `titles` and
 * `longest`). The base schema knows none of them.
 *
 * Content: `plugin/filled` has a text of 250 words and two children;
 * `plugin/empty` has an empty text and no children.
 *
 * Unknown methods give `unknown`, so these result types can't equal the
 * observed type of their fixture. test/types/plugin.test.ts checks them
 * against expected types instead, and checks that each fixture fits.
 */
import { kql } from '../../src/index.ts'

const filled = "page('plugin/filled')"
const empty = "page('plugin/empty')"

/** An unknown field method, and a known method after it. */
export const unknownFieldMethod = [
	kql({ query: `${filled}.title.shout.isEmpty` }),
	kql({ query: `${empty}.text.shout.isEmpty` }),
]

/** An unknown collection method, and a select on what it gives. */
export const unknownCollectionMethod = [
	kql({ query: `${filled}.children.stats`, select: { count: true, titles: true } }),
	kql({ query: `${empty}.children.stats`, select: { count: true, titles: true } }),
]

/** A select keeps its keys; only the values of unknown methods are unknown. */
export const selectKeepsKeys = [
	kql({
		query: filled,
		select: { title: true, shout: 'page.title.shout', stats: 'page.children.stats', count: 'page.children.stats.count' },
	}),
	kql({
		query: empty,
		select: { title: true, shout: 'page.text.shout', stats: 'page.children.stats', count: 'page.children.stats.count' },
	}),
	kql({
		query: "page('missing')",
		select: { title: true, shout: 'page.title.shout', stats: 'page.children.stats', count: 'page.children.stats.count' },
	}),
]

/**
 * Known limitation: an undescribed page method reads like a content field, so
 * `readingTime` is typed `string` although the plugin gives a number.
 */
export const pageMethodAsContentField = [
	kql({ query: filled, select: { readingTime: true } }),
	kql({ query: empty, select: { readingTime: true } }),
]
