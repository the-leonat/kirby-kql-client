/**
 * Values without a select: each renders its class's default fields, or the
 * render type of its class.
 *
 * Content: `selects/filled` is listed and has a listed child, a draft, an image
 * and a file of unknown type, and links both files and
 * `selects/without-content`. `selects/filled/child` links `selects/filled`. `selects/empty` is unlisted and has none of these,
 * with the same fields left empty. `selects/without-content` has no content
 * file at all. The site has a draft and a file.
 */
import { kql } from '../../src/index.ts'

/** A collection without a select renders the ids of its items. */
export const collectionsWithoutSelect = [
	kql({ query: "page('selects/filled').children" }),
	kql({ query: "page('selects/empty').children" }),
	kql({ query: "page('selects/filled').drafts" }),
	kql({ query: "page('selects/filled').files" }),
	kql({ query: "page('selects/empty').files" }),
	kql({ query: 'users' }),
]

/**
 * A page renders its default fields. `content` holds the page's content
 * fields by name, all strings; a page without a content file gives `[]`.
 */
export const pageWithoutSelect = [
	kql({ query: "page('selects/filled')" }),
	kql({ query: "page('selects/empty')" }),
	kql({ query: "page('selects/without-content')" }),
	kql({ query: "page('missing')" }),
]

/** A page reached through a relation renders the same default fields. */
export const toPageWithoutSelect = [
	kql({ query: "page('selects/filled/child').link.toPage" }),
	kql({ query: "page('selects/filled').link.toPage" }),
	kql({ query: "page('selects/empty').link.toPage" }),
]

/**
 * A file renders its default fields: an image, a file of unknown type (whose
 * `width` and `height` are empty content fields) and no file. `url` is the
 * media URL; the test site and `pnpm record` keep it the same in every
 * checkout and on every port.
 */
export const toFileWithoutSelect = [
	kql({ query: "page('selects/filled').cover.toFile" }),
	kql({ query: "page('selects/filled').attachment.toFile" }),
	kql({ query: "page('selects/empty').cover.toFile" }),
]

/** The site renders its default fields; `title` is a content field. */
export const siteWithoutSelect = kql({ query: 'site' })

/** `kirby` renders the site and the site's URL. */
export const kirbyWithoutSelect = kql({ query: 'kirby' })
