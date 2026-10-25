/**
 * The test plugin's methods on a client WITH a schema extension
 * (`PluginExtension`, used in test/types/extension.test.ts).
 *
 * The extension adds the plugin's methods to the `field`, `page` and `pages`
 * classes, adds the plugin's own class `stats`, and overrides the existing
 * method `file.width`: the base schema allows for the content field a
 * non-image gives, a site with only images knows it is a number.
 *
 * Content: as in test/queries/plugin.ts.
 */
import { kql } from '../../src/index.ts'

export type PluginExtension = {
	classes: {
		field: { methods: { shout: 'field' } }
		page: { methods: { readingTime: number } }
		pages: { methods: { stats: 'stats' } }
		file: { methods: { width: number } }
		stats: {
			methods: { count: number; titles: string[]; longest: 'page' | null }
			defaultFields: { count: number; titles: string[] }
		}
	}
}

const filled = "page('plugin/filled')"
const empty = "page('plugin/empty')"

/** A field method that gives a field, and a known method after it. */
export const fieldMethod = [
	kql({ query: `${filled}.title.shout.isEmpty` }),
	kql({ query: `${empty}.text.shout.isEmpty` }),
]

export const pageMethod = [
	kql({ query: filled, select: { readingTime: true, shout: 'page.title.shout' } }),
	kql({ query: empty, select: { readingTime: true, shout: 'page.text.shout' } }),
	kql({ query: "page('missing')", select: { readingTime: true, shout: 'page.title.shout' } }),
]

/** A collection method that gives the new class, rendered by its default fields. */
export const collectionMethod = [
	kql({ query: `${filled}.children.stats` }),
	kql({ query: `${empty}.children.stats` }),
]

/** A select on the new class, with a method that gives a page or null. */
export const newClassWithSelect = [
	kql({ query: `${filled}.children.stats`, select: { count: true, longest: { select: ['title'] } } }),
	kql({ query: `${empty}.children.stats`, select: { count: true, longest: { select: ['title'] } } }),
]

export const newClassMethod = [
	kql({ query: `${filled}.children.stats.titles` }),
	kql({ query: `${empty}.children.stats.titles` }),
]

/** `file.width`, overridden to a number. */
export const overriddenMethod = [
	kql({ query: "page('collections/filled').images", select: ['filename', 'width'] }),
	kql({ query: "page('collections/empty').images", select: ['filename', 'width'] }),
]
