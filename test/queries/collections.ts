/**
 * Collections (`pages`, `files`, `users`) and query strings with arguments.
 *
 * Content: `collections/filled` has three listed children and one unlisted one,
 * an image and a file of unknown type, and fields that list two of its children
 * (`related`), both files (`gallery`) and both users (`team`).
 * `collections/empty` has no children, no files and the same fields left empty.
 *
 * Collections never give `null`: an empty one gives `[]`. Each collection
 * source has a filled and an empty case, so the fixture shows the item type.
 */
import { kql } from '../../src/index.ts'

const filled = "page('collections/filled')"
const empty = "page('collections/empty')"

export const childrenWithSelect = [
	kql({ query: `${filled}.children`, select: ['title', 'slug', 'isListed'] }),
	kql({ query: `${empty}.children`, select: ['title', 'slug', 'isListed'] }),
]

export const filesWithSelect = [
	kql({ query: `${filled}.files`, select: ['filename', 'type'] }),
	kql({ query: `${empty}.files`, select: ['filename', 'type'] }),
]

export const imagesWithSelect = [
	kql({ query: `${filled}.images`, select: ['filename', 'extension'] }),
	kql({ query: `${empty}.images`, select: ['filename', 'extension'] }),
]

export const toPagesWithSelect = [
	kql({ query: `${filled}.related.toPages`, select: ['title', 'uid'] }),
	kql({ query: `${empty}.related.toPages`, select: ['title', 'uid'] }),
]

export const toFilesWithSelect = [
	kql({ query: `${filled}.gallery.toFiles`, select: ['filename', 'alt'] }),
	kql({ query: `${empty}.gallery.toFiles`, select: ['filename', 'alt'] }),
]

export const toUsersWithSelect = [
	kql({ query: `${filled}.team.toUsers`, select: ['email', 'isAdmin'] }),
	kql({ query: `${empty}.team.toUsers`, select: ['email', 'isAdmin'] }),
]

/** Collections read inside a select on the page that holds them. */
const collectionsSelect = {
	children: { select: ['title'] },
	images: { query: 'page.images', select: ['filename'] },
	team: { query: 'page.team.toUsers.sortBy("email")', select: ['email'] },
	firstChild: { query: 'page.children.first', select: ['title'] },
} as const

export const collectionsInsideSelect = [
	kql({ query: filled, select: collectionsSelect }),
	kql({ query: empty, select: collectionsSelect }),
	kql({ query: "page('missing')", select: collectionsSelect }),
]

/** Methods that refine a collection keep it a collection. */
export const listed = kql({ query: `${filled}.children.listed`, select: ['title'] })

export const sortBy = kql({ query: `${filled}.children.sortBy('title', 'desc')`, select: ['title'] })

export const limit = kql({ query: `${filled}.children.limit(2)`, select: ['title'] })

export const not = kql({ query: `${filled}.children.not('collections/filled/beta')`, select: ['title'] })

export const filterBy = kql({ query: `${filled}.children.filterBy('isListed', false)`, select: ['title'] })

/** Dots, quotes and brackets inside arguments don't split the query string. */
export const filterByWithDotsAndBrackets = kql({
	query: `${filled}.children.filterBy('title', 'in', ['Alpha.Beta', 'Gamma (3)']).sortBy('title')`,
	select: ['title'],
})

/** `first`, `last`, `nth` and `findBy` give one item, or `null` on an empty collection. */
export const childrenFirst = [
	kql({ query: `${filled}.children.first`, select: ['title'] }),
	kql({ query: `${empty}.children.first`, select: ['title'] }),
]

export const filesLast = [
	kql({ query: `${filled}.files.last`, select: ['filename'] }),
	kql({ query: `${empty}.files.last`, select: ['filename'] }),
]

export const toUsersNth = [
	kql({ query: `${filled}.team.toUsers.nth(1)`, select: ['email'] }),
	kql({ query: `${empty}.team.toUsers.nth(1)`, select: ['email'] }),
]

export const childrenFindBy = [
	kql({ query: `${filled}.children.findBy('slug', 'gamma')`, select: ['title'] }),
	kql({ query: `${filled}.children.findBy('slug', 'missing')`, select: ['title'] }),
]

/**
 * `find` with one id gives one item or `null`; with several ids, or with one
 * list of ids, it gives a collection of the items found.
 */
export const findOne = [
	kql({ query: `${filled}.children.find('alpha')`, select: ['title'] }),
	kql({ query: `${filled}.children.find('missing')`, select: ['title'] }),
]

export const findSeveral = [
	kql({ query: `${filled}.children.find('alpha', 'beta')`, select: ['title'] }),
	kql({ query: `${filled}.children.find('missing', 'unknown')`, select: ['title'] }),
]

export const findList = [
	kql({ query: `${filled}.children.find(['alpha'])`, select: ['title'] }),
	kql({ query: `${filled}.children.find(['missing'])`, select: ['title'] }),
]

/** `page.find` and `site.find` search the children the same way. */
export const pageFindOne = [
	kql({ query: `${filled}.find('gamma')`, select: ['title'] }),
	kql({ query: `${filled}.find('missing')`, select: ['title'] }),
]

export const siteFindSeveral = [
	kql({ query: "site.find('home', 'relations')", select: ['title'] }),
	kql({ query: "site.find('missing', 'unknown')", select: ['title'] }),
]

export const filesFindOne = [
	kql({ query: `${filled}.files.find('photo.png')`, select: ['filename'] }),
	kql({ query: `${empty}.files.find('photo.png')`, select: ['filename'] }),
]

/**
 * On a collection, `next` and `prev` move its pointer and give the item there,
 * or `false` past either end: from the first of the two users, `next` gives the
 * second and `prev` gives `false`. A select on `false` gives `null`.
 */
export const usersNextAndPrev = [
	kql({ query: 'users.next', select: ['email'] }),
	kql({ query: 'users.prev', select: ['email'] }),
]
