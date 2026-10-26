/**
 * Render: turns what a query string returns into its JSON type.
 *
 * - `null` renders as `null`, a JSON type as itself, Unknown as `unknown`,
 *   Impossible as itself.
 * - A select on a boolean, number or string gives `null` (e.g. on the `false`
 *   that `next` gives past the end of a collection).
 * - A class without a select renders as its render type, or else its default fields.
 * - A class with a select renders as the select shape: one object per item
 *   for a collection, one object otherwise.
 * - A collection with a select and a pagination (`IsPaginated`, from the
 *   query's `pagination`, or a `Paginated` collection from `paginate(…)`) is wrapped
 *   in `{ data, pagination }`. Without a select, or on a single object, the
 *   pagination is ignored.
 */
import type { ClassName, IsClass, Schema } from '../schema.ts'
import type { Select } from '../query.ts'
import type { Impossible } from './impossible.ts'
import type { SelectShape } from './select.ts'
import type { Paginated } from './walk.ts'

/** `NoSelect` stands for a query without a select. */
export type NoSelect = undefined

/** The `pagination` of a paginated result: which page of how many, and its items' place. */
export interface PaginationInfo {
	page: number
	pages: number
	offset: number
	limit: number
	total: number
}

export type Render<R, Sel, S extends Schema, IsPaginated extends boolean = false> = unknown extends R
	? unknown
	: RenderEach<R, Sel, S, IsPaginated>

/** Distributes over a union such as `'page' | null`. */
type RenderEach<R, Sel, S extends Schema, IsPaginated extends boolean> = R extends null | Impossible
	? R
	: R extends Paginated<infer C>
		? RenderEach<C, Sel, S, true>
		: IsClass<R, S> extends true
			? RenderClass<R & ClassName<S>, Sel, S, IsPaginated>
			: [Sel, R] extends [Select, boolean | number | string]
				? null
				: R

type RenderClass<C extends ClassName<S>, Sel, S extends Schema, IsPaginated extends boolean> = Sel extends Select
	? S['classes'][C] extends { item: infer Item extends ClassName<S> }
		? IsPaginated extends true
			? { data: SelectShape<Item, Sel, S>[]; pagination: PaginationInfo }
			: SelectShape<Item, Sel, S>[]
		: SelectShape<C, Sel, S>
	: RenderDefault<S['classes'][C], S>

type RenderDefault<Definition, S extends Schema> = Definition extends { render: infer R }
	? R
	: Definition extends { defaultFields: infer Fields }
		? { -readonly [Key in keyof Fields]: Render<Fields[Key], NoSelect, S> }
		: unknown
