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

/** The core blocks with the custom blocks merged in: a custom block replaces the core block of its block type. */
export type SiteBlocks<Core, Custom> = {
	[Type in keyof Core | keyof Custom]: Type extends keyof Custom
		? Custom[Type]
		: Type extends keyof Core
			? Core[Type]
			: never
}

/** The block types of `Blocks` that are not removed (`never`). */
export type BlockTypeName<Blocks> = {
	[Type in keyof Blocks]: [Blocks[Type]] extends [never] ? never : Type
}[keyof Blocks] &
	string

/** The block union of `Blocks`, or its members of the block types `Type`. */
export type BlockUnion<Blocks, Type extends keyof Blocks = BlockTypeName<Blocks>> = {
	[T in Type]: { id: string; type: T; isHidden: boolean; content: StoredContent<Blocks[T]> }
}[Type]

/** A block type without fields stores `[]`, whether it is described as `never[]` or `{}`. */
type StoredContent<Content> = [keyof Content] extends [never] ? never[] : Content

/**
 * A class's render type with every block in it typed by the block union
 * `Union`: an object with the keys of a block (`id`, `type`, `isHidden`,
 * `content`) becomes one object per member of `Union`, with its other keys
 * (a single block's `isEmpty`) kept.
 */
export type WithBlockTypes<Render, Union> = Render extends readonly (infer Item)[]
	? WithBlockTypes<Item, Union>[]
	: Render extends { id: string; type: string; isHidden: boolean; content: unknown }
		? Union extends unknown
			? { [K in keyof Render]: K extends keyof Union ? Union[K] : Render[K] }
			: never
		: Render extends object
			? { [K in keyof Render]: WithBlockTypes<Render[K], Union> }
			: Render

/** The custom blocks of a schema extension's `blocks` key merged into Kirby's core blocks. */
type ExtensionBlocks<Extension> = Extension extends { blocks: infer Custom }
	? SiteBlocks<KirbySchema['blocks'], Custom>
	: never

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
export type Block<Extension = {}, Type extends BlockType<Extension> = BlockType<Extension>> = Extension extends {
	blocks: unknown
}
	? BlockUnion<ExtensionBlocks<Extension>, Type & keyof ExtensionBlocks<Extension>>
	: KirbySchema['classes']['blocks']['render'][number]

/** The block types of a site with the schema extension `Extension`; `string` without a `blocks` key. */
export type BlockType<Extension = {}> = Extension extends { blocks: unknown }
	? BlockTypeName<ExtensionBlocks<Extension>>
	: string
