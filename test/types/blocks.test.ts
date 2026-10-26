/**
 * Block types: with a `blocks` key in its schema extension, a client types
 * every block rendered without a select by its block type, from the core
 * blocks and the extension's custom blocks.
 */
import { createClient, type Block, type BlockType } from '../../src/index.ts'
import type * as blocksModule from '../queries/blocks.ts'
import type { BlocksExtension } from '../queries/blocks.ts'
import type * as richQueries from '../queries/rich.ts'
import type { PluginExtension } from '../queries/extension.ts'
import type { Observed } from '../fixtures/blocks.ts'
import type { Observed as RichObserved } from '../fixtures/rich.ts'
import { testSite } from '../test-site.ts'
import type { AllMatch, Equal, Mismatched, ResultOn } from './check.ts'

const client = createClient<BlocksExtension>(testSite)

/** The test queries, without the module's `blockTypes` flag. */
type Queries = Omit<typeof blocksModule, 'blockTypes'>

export type Blocks = AllMatch<Mismatched<Queries, Observed, typeof client>>

export type WithoutBlockTypes = AllMatch<
	// @ts-expect-error a client without block types renders every block as the generic shape
	Mismatched<Queries, Observed>
>

/** The generic shape of a block, the same on every client without a `blocks` key. */
type GenericBlock = { content: Record<string, unknown> | never[]; id: string; isHidden: boolean; type: string }

const plugin = createClient<PluginExtension>(testSite)

/** A client without a `blocks` key renders blocks as before, also with other extensions. */
export type Unchanged = [
	AllMatch<Mismatched<typeof richQueries, RichObserved, typeof plugin>>,
	AllMatch<Mismatched<typeof richQueries, RichObserved>>,
]

type TextBlocks = { query: "page('blocks/filled').text.toBlocks" }

export const unchanged: [
	Equal<ResultOn<typeof plugin, TextBlocks>, GenericBlock[]>,
	Equal<Block, GenericBlock>,
	Equal<Block<PluginExtension>, GenericBlock>,
	Equal<BlockType<PluginExtension>, string>,
] = [true, true, true, true]

/** `type` narrows `content`, in `toBlocks` and in the blocks of layout columns. */
export async function narrows() {
	for (const block of await client.query({ query: "page('blocks/filled').text.toBlocks" })) {
		if (block.type === 'film') {
			const film: string[] = block.content.film
			// @ts-expect-error a film block has no text
			block.content.text
			return film
		}
		if (block.type === 'line') {
			const empty: never[] = block.content
			return empty
		}
		// @ts-expect-error no block type `nope` is in the block union
		if (block.type === 'nope') return
	}
	const layouts = await client.query({ query: "page('blocks/filled').layout.toLayouts" })
	const block = layouts[0]?.columns[0]?.blocks[0]
	if (block?.type === 'heading') {
		const heading: { level: string; text: string } = block.content
		return heading
	}
	return undefined
}

/** The block types Kirby ships. */
type CoreBlockType = 'code' | 'gallery' | 'heading' | 'image' | 'line' | 'list' | 'markdown' | 'quote' | 'table' | 'text' | 'video'

export const block: [
	Equal<
		Block<BlocksExtension, 'film'>,
		{
			id: string
			type: 'film'
			isHidden: boolean
			content: { film: string[]; autoplay: string; credits: { name: string; role: string }[] }
		}
	>,
	Equal<Block<BlocksExtension, 'divider'>, { id: string; type: 'divider'; isHidden: boolean; content: never[] }>,
	Equal<Block<BlocksExtension, 'table'>, { id: string; type: 'table'; isHidden: boolean; content: never[] }>,
	Equal<BlockType<BlocksExtension>, CoreBlockType | 'divider' | 'film'>,
	Equal<ResultOn<typeof client, TextBlocks>, Block<BlocksExtension>[]>,
] = [true, true, true, true, true]

/** Overrides the core heading, removes the core markdown block. */
type Changed = {
	blocks: {
		heading: { level: 'h2' | 'h3'; text: string }
		markdown: never
	}
}

const changed = createClient<Changed>(testSite)

/** A single block renders its block plus `isEmpty`. */
type SingleBlock<B> = B extends unknown ? { [K in keyof B | 'isEmpty']: K extends keyof B ? B[K] : boolean } : never

export const overrideAndRemove: [
	Equal<BlockType<Changed>, Exclude<CoreBlockType, 'markdown'>>,
	Equal<Block<Changed, 'heading'>, { id: string; type: 'heading'; isHidden: boolean; content: { level: 'h2' | 'h3'; text: string } }>,
	Equal<Extract<Block<Changed>, { type: 'markdown' }>, never>,
	Equal<ResultOn<typeof changed, TextBlocks>, Block<Changed>[]>,
	Equal<
		ResultOn<typeof changed, { query: "page('blocks/filled').text.toBlocks.first" }>,
		SingleBlock<Block<Changed>> | null
	>,
	// The blocks of layout columns use the same block union.
	Equal<
		ResultOn<typeof changed, { query: "page('blocks/filled').layout.toLayouts" }>[number]['columns'][number]['blocks'],
		Block<Changed>[]
	>,
	Equal<
		ResultOn<typeof changed, { query: "page('blocks/filled').layout.toLayouts.first.columns.first.blocks" }>,
		Block<Changed>[]
	>,
	// Only the core blocks: an empty `blocks` key.
	Equal<BlockType<{ blocks: {} }>, CoreBlockType>,
] = [true, true, true, true, true, true, true, true]

// @ts-expect-error `markdown` is removed from the block union
export type Removed = Block<Changed, 'markdown'>
