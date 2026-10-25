/**
 * Pagination: where KQL wraps a collection's result in `{ data, pagination }`
 * and where it ignores pagination. One test query per rule in the KQL source
 * (`Kql::selectFromCollection`): the result is wrapped when a collection with
 * a select has a pagination, from the query's `pagination` key or from
 * `paginate()` in the query string.
 *
 * Content: `pagination/filled` has seven children (One … Seven),
 * `pagination/empty` has none.
 *
 * `paginate()` is blocked by KQL by default; the test site allows it for
 * pages (`kql.methods.allowed` in test/site/site/config/config.php).
 */
import { kql } from '../../src/index.ts'

const filled = "page('pagination/filled')"
const empty = "page('pagination/empty')"

/**
 * The `pagination` key on a collection with a select wraps the result. A page
 * past the end is clamped to the last page; without `page`, the first page is
 * given; an empty collection has page 0 of 0.
 */
export const paginationWithSelect = [
	kql({ query: `${filled}.children`, select: ['title'], pagination: { limit: 3, page: 2 } }),
	kql({ query: `${filled}.children`, select: ['title'], pagination: { limit: 3, page: 9 } }),
	kql({ query: `${filled}.children`, select: ['title'], pagination: { limit: 3 } }),
	kql({ query: `${empty}.children`, select: ['title'], pagination: { limit: 3, page: 1 } }),
]

/** Without a select, the `pagination` key is ignored: the ids of all items. */
export const paginationWithoutSelect = [
	kql({ query: `${filled}.children`, pagination: { limit: 3, page: 2 } }),
	kql({ query: `${empty}.children`, pagination: { limit: 3, page: 1 } }),
]

/** On a single object, the `pagination` key is ignored. */
export const paginationOnSingleObject = [
	kql({ query: filled, select: ['title'], pagination: { limit: 3, page: 2 } }),
	kql({ query: "page('missing')", select: ['title'], pagination: { limit: 3, page: 2 } }),
]

/** `pagination` on a nested query wraps that query's result. */
export const paginationOnNestedQuery = [
	kql({
		query: filled,
		select: { title: true, children: { query: 'page.children', select: ['title'], pagination: { limit: 2, page: 3 } } },
	}),
	kql({
		query: empty,
		select: { title: true, children: { query: 'page.children', select: ['title'], pagination: { limit: 2, page: 3 } } },
	}),
	kql({
		query: "page('missing')",
		select: { title: true, children: { query: 'page.children', select: ['title'], pagination: { limit: 2, page: 3 } } },
	}),
]

/**
 * A select without a query string ignores a `pagination` key; it reads its
 * pagination from `options.pagination` instead.
 */
const withoutQueryString = {
	childrenAndDrafts: { select: ['title'], pagination: { limit: 2, page: 1 } },
	children: { select: ['title'], options: { pagination: { limit: 2, page: 1 } } },
} as const

export const paginationOnSelectWithoutQueryString = [
	kql({ query: filled, select: withoutQueryString }),
	kql({ query: empty, select: withoutQueryString }),
	kql({ query: "page('missing')", select: withoutQueryString }),
]

/**
 * `paginate()` in the query string with a select wraps the result, with or
 * without a `pagination` key: `paginate(2, 3)` is page 3 of 2 items each; a
 * `pagination` key paginates the 2 items `paginate(2)` gives once more.
 */
export const paginateWithSelect = [
	kql({ query: `${filled}.children.paginate(3)`, select: ['title'] }),
	kql({ query: `${filled}.children.paginate(2, 3)`, select: ['title'] }),
	kql({ query: `${filled}.children.paginate(2)`, select: ['title'], pagination: { limit: 3 } }),
	kql({ query: `${empty}.children.paginate(3)`, select: ['title'] }),
]

/** Without a select, `paginate()` gives the ids of the items on the page, unwrapped. */
export const paginateWithoutSelect = [
	kql({ query: `${filled}.children.paginate(3)` }),
	kql({ query: `${empty}.children.paginate(3)` }),
]

/**
 * `filterBy` and `sortBy` after `paginate()` keep the pagination (Kirby clones
 * the collection along with it), so the result stays wrapped, with the
 * pagination of the whole collection, not of the filtered page.
 */
export const filterByAfterPaginate = [
	kql({ query: `${filled}.children.paginate(3).filterBy('title', '!=', 'One')`, select: ['title'] }),
	kql({ query: `${empty}.children.paginate(3).filterBy('title', '!=', 'One')`, select: ['title'] }),
]

export const sortByAfterPaginate = [
	kql({ query: `${filled}.children.paginate(3).sortBy('title', 'desc')`, select: ['title'] }),
	kql({ query: `${empty}.children.paginate(3).sortBy('title', 'desc')`, select: ['title'] }),
]

/** A single item after `paginate()` is not wrapped. */
export const firstAfterPaginate = [
	kql({ query: `${filled}.children.paginate(3, 2).first`, select: ['title'] }),
	kql({ query: `${empty}.children.paginate(3, 2).first`, select: ['title'] }),
]

/**
 * KNOWN LIMITATION (test/types/pagination.test.ts): paginating a page's
 * children leaves the pagination on that page's children for the rest of the
 * request (Kirby keeps one `children` collection per page, and `paginate()`
 * sets the pagination on it before slicing). A later `page.children` with a
 * select is then wrapped too, with all its items but the earlier pagination.
 * The result type can't see this: it gives `again` as a plain list.
 */
export const staleWrapperAfterPaginatingChildren = [
	kql({
		query: filled,
		select: {
			paged: { query: 'page.children', select: ['title'], pagination: { limit: 2, page: 1 } },
			again: { query: 'page.children', select: ['title'] },
		},
	}),
	kql({
		query: filled,
		select: {
			paged: { query: 'page.children.paginate(2)', select: ['title'] },
			again: { query: 'page.children', select: ['title'] },
		},
	}),
	kql({
		query: "page('missing')",
		select: {
			paged: { query: 'page.children', select: ['title'], pagination: { limit: 2, page: 1 } },
			again: { query: 'page.children', select: ['title'] },
		},
	}),
]
