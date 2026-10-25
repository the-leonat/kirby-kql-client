/**
 * Rich content: blocks, layouts (layouts → columns → blocks) and structures.
 *
 * Content: `rich/filled` has
 * - `text`: blocks of the types heading, text, line (a block without fields,
 *   whose content renders as `[]`), image (an image picked from the page) and
 *   films (a custom block with a pages field), plus a hidden text block that
 *   `toBlocks` leaves out,
 * - `layout`: a layout with a `theme` attribute and two columns of blocks
 *   (heading, text, films, line), and a layout without attributes (`[]`)
 *   with one empty column,
 * - `items`: a structure of two items with a title, a number and a toggle.
 * `rich/empty` has the same fields left empty.
 *
 * Without a select, KQL renders rich content with Kirby's own `toArray()`: the
 * stored content values as they are (strings, numbers, booleans, lists), not
 * as content fields. Through a select, every content value is a content field
 * and renders as a string.
 */
import { kql } from '../../src/index.ts'

const filled = "page('rich/filled')"
const empty = "page('rich/empty')"

export const blocksWithoutSelect = [
	kql({ query: `${filled}.text.toBlocks` }),
	kql({ query: `${empty}.text.toBlocks` }),
]

/** A single block renders its default fields, its content as stored. */
export const blockWithoutSelect = [
	kql({ query: `${filled}.text.toBlocks.first` }),
	kql({ query: `${filled}.text.toBlocks.nth(2)` }),
	kql({ query: `${empty}.text.toBlocks.first` }),
]

/**
 * Layouts render as stored: attributes (`[]` when there are none), and
 * columns with their blocks.
 */
export const layoutsWithoutSelect = [
	kql({ query: `${filled}.layout.toLayouts` }),
	kql({ query: `${empty}.layout.toLayouts` }),
]

/** A single layout renders its default fields, its attributes as stored. */
export const layoutWithoutSelect = [
	kql({ query: `${filled}.layout.toLayouts.first` }),
	kql({ query: `${filled}.layout.toLayouts.last` }),
	kql({ query: `${empty}.layout.toLayouts.first` }),
]

export const layoutColumnsWithoutSelect = [
	kql({ query: `${filled}.layout.toLayouts.first.columns` }),
	kql({ query: `${filled}.layout.toLayouts.last.columns` }),
]

export const layoutColumnWithoutSelect = [
	kql({ query: `${filled}.layout.toLayouts.first.columns.first` }),
	kql({ query: `${filled}.layout.toLayouts.first.columns.last` }),
	kql({ query: `${filled}.layout.toLayouts.last.columns.first` }),
	kql({ query: `${filled}.layout.toLayouts.last.columns.nth(1)` }),
]

/**
 * A structure renders its items as stored (a number stays a number, a toggle
 * a boolean), each with its `id`.
 */
export const structureWithoutSelect = [
	kql({ query: `${filled}.items.toStructure` }),
	kql({ query: `${empty}.items.toStructure` }),
]

/** A single structure item renders nothing without a select: `[]`. */
export const structureItemWithoutSelect = [
	kql({ query: `${filled}.items.toStructure.first` }),
	kql({ query: `${empty}.items.toStructure.first` }),
]

/**
 * Through a select, unknown keys on a block are content fields (`text`), and a
 * pages field in a custom block (`films`) or the image of an image block is a
 * content field that can be followed with `toPages` or `toFile`.
 */
const blockSelect = {
	id: true,
	type: true,
	isHidden: true,
	text: true,
	films: { query: 'block.films.toPages', select: ['title'] },
	image: { query: 'block.image.toFile', select: ['filename', 'alt'] },
	next: 'block.next?.type',
} as const

export const blocksWithSelect = [
	kql({ query: `${filled}.text.toBlocks`, select: blockSelect }),
	kql({ query: `${empty}.text.toBlocks`, select: blockSelect }),
]

export const blockFindOne = [
	kql({ query: `${filled}.text.toBlocks.find('b0000000-0000-4000-8000-000000000002')`, select: ['id', 'type', 'text'] }),
	kql({ query: `${filled}.text.toBlocks.find('missing')`, select: ['id', 'type', 'text'] }),
]

/**
 * Through a select, every value of a structure item is a content field and
 * renders as a string (`count: 3` gives `"3"`, a missing key `""`).
 */
const structureItemSelect = {
	id: true,
	title: true,
	count: true,
	featured: true,
	missing: true,
	countAsNumber: 'structureItem.count.toInt',
	isFeatured: 'structureItem.featured.toBool',
	previous: 'structureItem.prev?.title',
} as const

export const structureWithSelect = [
	kql({ query: `${filled}.items.toStructure`, select: structureItemSelect }),
	kql({ query: `${empty}.items.toStructure`, select: structureItemSelect }),
]

export const structureItemWithSelect = [
	kql({ query: `${filled}.items.toStructure.last`, select: structureItemSelect }),
	kql({ query: `${filled}.items.toStructure.first`, select: structureItemSelect }),
	kql({ query: `${empty}.items.toStructure.last`, select: structureItemSelect }),
]

/**
 * Layouts → columns → blocks → pages, all through selects: a layout attribute
 * read from `attrs`, columns read as a select without a query string, blocks
 * read through a nested query.
 */
const layoutSelect = {
	id: true,
	theme: 'layout.attrs.theme',
	columns: {
		select: {
			id: true,
			width: true,
			span: true,
			isEmpty: true,
			blocks: {
				query: 'layoutColumn.blocks',
				select: {
					type: true,
					text: true,
					level: true,
					films: { query: 'block.films.toPages', select: ['title', 'uid'] },
				},
			},
		},
	},
} as const

export const layoutsWithSelect = [
	kql({ query: `${filled}.layout.toLayouts`, select: layoutSelect }),
	kql({ query: `${empty}.layout.toLayouts`, select: layoutSelect }),
]

export const layoutColumnWithSelect = [
	kql({ query: `${filled}.layout.toLayouts.first.columns.first`, select: ['id', 'width', 'span', 'isEmpty'] }),
	kql({ query: `${filled}.layout.toLayouts.first.columns.nth(5)`, select: ['id', 'width', 'span', 'isEmpty'] }),
]
