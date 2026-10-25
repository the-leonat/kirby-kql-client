/**
 * Single relations (`toPage`, `toFile`, `toUser`) and `null`.
 *
 * Content: `relations/filled` links a page, an image, a file of unknown type
 * and two users; `relations/empty` has the same fields left empty.
 *
 * A test query written as a list of queries has cases: every case must have
 * the same result type, and that type must equal what all their fixtures show
 * together (as if they were the items of one list).
 */
import { kql } from '../../src/index.ts'

export const toPageWithSelect = [
	kql({ query: "page('relations/filled').link.toPage", select: { title: true, slug: true, isListed: true } }),
	kql({ query: "page('relations/empty').link.toPage", select: { title: true, slug: true, isListed: true } }),
]

/**
 * An image, a file of unknown type, and no file. Image methods such as `width`
 * give a number on an image and an empty content field on any other file;
 * `alt` is a content field from the file's meta data.
 */
const fileSelect = {
	filename: true,
	alt: true,
	width: true,
	height: true,
	ratio: true,
	isPortrait: true,
	type: true,
	template: true,
	mime: true,
	niceSize: true,
} as const

export const toFileWithSelect = [
	kql({ query: "page('relations/filled').cover.toFile", select: fileSelect }),
	kql({ query: "page('relations/filled').attachment.toFile", select: fileSelect }),
	kql({ query: "page('relations/empty').cover.toFile", select: fileSelect }),
]

/**
 * An admin with a name, an editor without one (whose role has no description),
 * and no user. `bio` is a content field from the user's content file.
 */
export const toUserWithSelect = [
	kql({ query: "page('relations/filled').author.toUser", select: ['email', 'username', 'name', 'bio', 'isAdmin', 'role'] }),
	kql({ query: "page('relations/filled').reviewer.toUser", select: ['email', 'username', 'name', 'bio', 'isAdmin', 'role'] }),
	kql({ query: "page('relations/empty').author.toUser", select: ['email', 'username', 'name', 'bio', 'isAdmin', 'role'] }),
]

/** Without a select, a user renders its default fields. */
export const toUserWithoutSelect = [
	kql({ query: "page('relations/filled').author.toUser" }),
	kql({ query: "page('relations/filled').reviewer.toUser" }),
	kql({ query: "page('relations/empty').author.toUser" }),
]

/**
 * Relations read inside a select on the page that holds them: as nested queries
 * with a select, and as query strings without one.
 */
const relationsSelect = {
	link: { query: 'page.link.toPage', select: ['title'] },
	cover: { query: 'page.cover.toFile', select: ['filename'] },
	author: { query: 'page.author.toUser', select: ['name'] },
	linkTitle: 'page.link.toPage?.title',
	coverFilename: 'page.cover.toFile?.filename',
	authorIsAdmin: 'page.author.toUser?.isAdmin',
} as const

export const relationsInsideSelect = [
	kql({ query: "page('relations/filled')", select: relationsSelect }),
	kql({ query: "page('relations/empty')", select: relationsSelect }),
	kql({ query: "page('missing')", select: relationsSelect }),
]

/**
 * A method called on `null` is an error (400), so a result means no step before
 * it was `null`. The empty case is a runtime test (test/runtime/relations.test.ts).
 */
export const methodAfterToPage = kql({ query: "page('relations/filled').link.toPage.title" })

/**
 * Inside a select on a page, `page` alone is that page, but `page('…')` with an
 * id is the root: it finds any page, or gives `null`.
 */
export const pageRootInsideSelect = [
	kql({ query: "page('relations')", select: { home: { query: "page('home')", select: ['title'] } } }),
	kql({ query: "page('relations')", select: { home: { query: "page('missing')", select: ['title'] } } }),
	kql({ query: "page('missing')", select: { home: { query: "page('home')", select: ['title'] } } }),
]

/** `?.` on `null` ends the whole query string with `null`, including the steps after it. */
export const optionalChainAfterToPage = [
	kql({ query: "page('relations/filled').link.toPage?.title.upper" }),
	kql({ query: "page('relations/empty').link.toPage?.title.upper" }),
]
