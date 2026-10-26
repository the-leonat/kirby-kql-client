/**
 * Block types: the block union of a site, and the render types that use it.
 *
 * A schema extension with a `blocks` key gives the site its block union: the
 * core blocks of the schema plus the extension's custom blocks, minus every
 * block type the extension sets to `never`. Every block that renders without
 * a select (in `toBlocks`, a single block, the blocks of layout columns) then
 * renders as a member of that union, so `type` narrows `content`. Without a
 * `blocks` key, blocks render as one generic shape.
 */
import type { KirbySchema } from '../kirby-schema.ts'

/**
 * The site's block map for the schema extension `Extension`: block type =>
 * stored content, the core blocks `Core` with the custom blocks of its
 * `blocks` key merged in (a custom block replaces the core block of its block
 * type). `never` when `Extension` has no `blocks` key.
 */
export type SiteBlocks<Extension, Core = KirbySchema['blocks']> = Extension extends { blocks: infer Custom }
	? {
			[Type in keyof Core | keyof Custom]: Type extends keyof Custom
				? Custom[Type]
				: Type extends keyof Core
					? Core[Type]
					: never
		}
	: never

/** The block types of the block map `Blocks`, without the removed ones (set to `never`). */
export type KeptBlockType<Blocks> = {
	[Type in keyof Blocks]: [Blocks[Type]] extends [never] ? never : Type
}[keyof Blocks] &
	string

/** The block union of the block map `Blocks`, or its members of the block types `Type`. */
export type BlockUnion<Blocks, Type extends keyof Blocks = KeptBlockType<Blocks>> = {
	[T in Type]: { id: string; type: T; isHidden: boolean; content: StoredContent<Blocks[T]> }
}[Type]

/** A block type without fields stores `[]`, whether it is described as `never[]` or `{}`. */
type StoredContent<Content> = [keyof Content] extends [never] ? never[] : Content

/**
 * The keys every block renders with when it renders without a select. Kept
 * in step with `blockKeys` in scripts/observed-type.ts, which tells blocks
 * apart in fixtures by these keys (and fails to compile when they differ).
 */
export type BlockShape = { id: string; type: string; isHidden: boolean; content: unknown }

/**
 * A class's render type with every block in it typed by the block union
 * `Union`: an object with the keys of a block (`BlockShape`) becomes one
 * object per member of `Union`, with its other keys (a single block's
 * `isEmpty`) kept.
 */
export type WithBlockTypes<Render, Union> = Render extends readonly (infer Item)[]
	? WithBlockTypes<Item, Union>[]
	: Render extends BlockShape
		? Union extends unknown
			? { [K in keyof Render]: K extends keyof Union ? Union[K] : Render[K] }
			: never
		: Render extends object
			? { [K in keyof Render]: WithBlockTypes<Render[K], Union> }
			: Render

/**
 * One block as it renders without a select, on a client created with the
 * schema extension `Extension`. `Block<Site>` is the site's block union,
 * `Block<Site, 'film'>` the block of one block type. Without a `blocks` key
 * in `Extension`, every block has the generic shape.
 *
 *   type Site = { blocks: { film: { film: string[]; autoplay: string } } }
 *   type FilmBlock = Block<Site, 'film'>
 *   // { id: string; type: 'film'; isHidden: boolean; content: { film: string[]; autoplay: string } }
 */
export type Block<Extension = {}, Type extends BlockType<Extension> = BlockType<Extension>> = [
	SiteBlocks<Extension>,
] extends [never]
	? KirbySchema['classes']['blocks']['render'][number]
	: BlockUnion<SiteBlocks<Extension>, Type & keyof SiteBlocks<Extension>>

/** The block types of a site with the schema extension `Extension`; `string` without a `blocks` key. */
export type BlockType<Extension = {}> = [SiteBlocks<Extension>] extends [never]
	? string
	: KeptBlockType<SiteBlocks<Extension>>
