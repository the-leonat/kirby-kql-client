# 0008 Block types: one closed block union per site, opted into with `blocks`

## Context

Without a select, KQL renders blocks and layouts through Kirby's own `toArray()`: each block as `{ id, type, isHidden, content }` with its stored content. The schema typed that as one generic shape (`type: string`, `content: Record<string, unknown> | never[]`), so `type` didn't narrow and `content` was untyped. The only way to do better was overriding `render` on `block`, `blocks` and the layout classes, which was undocumented and easy to get wrong (#21).

Which block types a site has is not in Kirby's source: core blocks can be removed or redefined, and custom blocks are the project's blueprints. The core blocks are: Kirby registers their blueprints in `kirby/config/blocks`.

## Decision

- The schema generator reads the core blocks from the blueprints Kirby registers (not the site's own), with each field's stored value by field type. It only knows the field types the core blocks use; another one fails the generator until a test query proves what it stores. The drift check covers the result.
- A schema extension's `blocks` key maps a block type to its stored content. It adds custom blocks, a custom block replaces the core block of the same block type, and `never` removes a core block.
- The **block union is closed**: core blocks plus custom blocks minus the removed ones. So `type === …` narrows, and an unknown block type doesn't compile.
- **One block union per site**, used wherever a block renders without a select: `toBlocks`, a single block (with `isEmpty`) and the blocks in layout columns. Not per blocks field (by the block types its `fieldsets` option allows): simpler, and slightly too wide where a field allows fewer block types.
- **Selects are unchanged**: through a select, block fields are content fields (`string`), as ADR 0003 says.
- **Without a `blocks` key, nothing changes**: blocks keep the generic shape, so existing clients don't break. `blocks: {}` opts into the core blocks only.
- `Block<Extension, Type>` names a block of the union. It is the block as it renders in `toBlocks`; a single block renders the same plus `isEmpty`.
- Content is typed as Kirby's blocks field stores it (`Form::toStoredValues()`, the path every Panel save takes), not as one might expect: a toggle is the string `'true'` or `'false'`, a select or toggles field `''` until set, a structure a list of objects with their fields stored the same way. The test site's block content is stored through that path, so the fixtures show what a Panel-edited site returns.

## Consequences

- Fixtures of the test queries on a client with block types tell blocks apart by block type (`scripts/record.ts`, `scripts/observed-type.ts`), so a single block or a layout column is only checked exactly when the cases cover every block type. The test site's `blocks` page has every block type in its blocks field and in its layouts.
- A block type the project forgot in its extension, or content written outside the Panel (a toggle as a boolean), is typed wrongly without an error. That is the same trust as any schema extension.
- The extension describes a custom block's content by hand, not from its blueprint.
- Cost (TypeScript 7.0.2, `tsc --extendedDiagnostics`): the type tests go from 2.14M to 3.52M instantiations and about 0.29 s to 0.43 s of check time, almost all of it comparing the block unions of the new fixtures key by key. In a project, four block queries on a client with block types cost about 3,400 instantiations more than on a client without them.
