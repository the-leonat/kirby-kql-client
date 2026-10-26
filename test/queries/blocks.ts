/**
 * Block types: blocks and layouts on a client WITH a `blocks` key in its schema
 * extension (`BlocksExtension`, used in test/types/blocks.test.ts). Their
 * fixtures tell blocks apart by block type (`blockTypes`).
 *
 * Content: `blocks/filled` has
 * - `text`: one block of every core block and of the custom blocks `film` (a
 *   pages field, a toggle and a structure) and `divider` (no fields), each
 *   once filled and once empty, plus a hidden text block that `toBlocks` leaves out,
 * - `layout`: a layout with two columns that hold one filled block of every
 *   block type, and a layout with one empty column.
 * `blocks/empty` has the same fields left empty. The content is stored as the
 * Panel stores it: through Kirby's blocks field, with the blueprints in
 * test/site/site/blueprints/blocks for the custom blocks.
 */
import { kql } from '../../src/index.ts'

/**
 * The test site's custom blocks, as Kirby stores them. A toggle is stored as
 * `'true'` or `'false'`, a structure as a list of objects, one per item, with
 * its fields stored the same way.
 */
export type BlocksExtension = {
	blocks: {
		film: { film: string[]; autoplay: string; credits: { name: string; role: string }[] }
		divider: {}
	}
}

/** Records this group's fixtures with blocks told apart by block type (see scripts/record.ts). */
export const blockTypes = true

const filled = "page('blocks/filled')"
const empty = "page('blocks/empty')"

export const blocksWithoutSelect = [
	kql({ query: `${filled}.text.toBlocks` }),
	kql({ query: `${empty}.text.toBlocks` }),
]

/** A single block of every block type, and none. */
export const blockWithoutSelect = [
	kql({ query: `${filled}.text.toBlocks.findBy('type', 'code')` }),
	kql({ query: `${filled}.text.toBlocks.findBy('type', 'gallery')` }),
	kql({ query: `${filled}.text.toBlocks.findBy('type', 'heading')` }),
	kql({ query: `${filled}.text.toBlocks.findBy('type', 'image')` }),
	kql({ query: `${filled}.text.toBlocks.findBy('type', 'line')` }),
	kql({ query: `${filled}.text.toBlocks.findBy('type', 'list')` }),
	kql({ query: `${filled}.text.toBlocks.findBy('type', 'markdown')` }),
	kql({ query: `${filled}.text.toBlocks.findBy('type', 'quote')` }),
	kql({ query: `${filled}.text.toBlocks.findBy('type', 'table')` }),
	kql({ query: `${filled}.text.toBlocks.findBy('type', 'text')` }),
	kql({ query: `${filled}.text.toBlocks.findBy('type', 'video')` }),
	kql({ query: `${filled}.text.toBlocks.findBy('type', 'film')` }),
	kql({ query: `${filled}.text.toBlocks.last` }),
	kql({ query: `${empty}.text.toBlocks.first` }),
]

export const layoutsWithoutSelect = [
	kql({ query: `${filled}.layout.toLayouts` }),
	kql({ query: `${empty}.layout.toLayouts` }),
]

export const layoutWithoutSelect = [
	kql({ query: `${filled}.layout.toLayouts.first` }),
	kql({ query: `${filled}.layout.toLayouts.last` }),
	kql({ query: `${empty}.layout.toLayouts.first` }),
]

export const layoutColumnsWithoutSelect = [
	kql({ query: `${filled}.layout.toLayouts.first.columns` }),
	kql({ query: `${filled}.layout.toLayouts.last.columns` }),
]

/** The two columns hold one block of every block type between them. */
export const layoutColumnWithoutSelect = [
	kql({ query: `${filled}.layout.toLayouts.first.columns.first` }),
	kql({ query: `${filled}.layout.toLayouts.first.columns.last` }),
	kql({ query: `${filled}.layout.toLayouts.last.columns.first` }),
	kql({ query: `${filled}.layout.toLayouts.last.columns.nth(1)` }),
]

export const layoutColumnBlocks = [
	kql({ query: `${filled}.layout.toLayouts.first.columns.first.blocks` }),
	kql({ query: `${filled}.layout.toLayouts.first.columns.last.blocks` }),
	kql({ query: `${filled}.layout.toLayouts.last.columns.first.blocks` }),
]

/** Through a select, every block field is a content field, as without block types. */
export const blocksWithSelect = [
	kql({
		query: `${filled}.text.toBlocks`,
		select: { type: true, text: true, autoplay: true, film: { query: 'block.film.toPages', select: ['title'] } },
	}),
	kql({
		query: `${empty}.text.toBlocks`,
		select: { type: true, text: true, autoplay: true, film: { query: 'block.film.toPages', select: ['title'] } },
	}),
]

/** Layouts → columns → blocks through selects: content fields. */
export const layoutsWithSelect = [
	kql({
		query: `${filled}.layout.toLayouts`,
		select: { id: true, columns: { select: { width: true, blocks: { query: 'layoutColumn.blocks', select: ['type', 'text'] } } } },
	}),
	kql({
		query: `${empty}.layout.toLayouts`,
		select: { id: true, columns: { select: { width: true, blocks: { query: 'layoutColumn.blocks', select: ['type', 'text'] } } } },
	}),
]
