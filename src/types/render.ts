/**
 * Render: turns what a query string returns into its JSON type.
 *
 * - `null` renders as `null`, a JSON type as itself, Unknown as `unknown`.
 * - A class without a select renders as its render type, or else its default fields.
 * - A class with a select renders as the select shape: one object per item
 *   for a collection, one object otherwise.
 */
import type { ClassName, IsClass, Schema } from '../schema.ts'
import type { Select } from '../query.ts'
import type { SelectShape } from './select.ts'

/** `NoSelect` stands for a query without a select. */
export type NoSelect = undefined

export type Render<R, Sel, S extends Schema> = unknown extends R ? unknown : RenderEach<R, Sel, S>

/** Distributes over a union such as `'page' | null`. */
type RenderEach<R, Sel, S extends Schema> = R extends null
	? null
	: IsClass<R, S> extends true
		? RenderClass<R & ClassName<S>, Sel, S>
		: R

type RenderClass<C extends ClassName<S>, Sel, S extends Schema> = Sel extends Select
	? S['classes'][C] extends { item: infer Item extends ClassName<S> }
		? SelectShape<Item, Sel, S>[]
		: SelectShape<C, Sel, S>
	: RenderDefault<S['classes'][C], S>

type RenderDefault<Definition, S extends Schema> = Definition extends { render: infer R }
	? R
	: Definition extends { defaultFields: infer Fields }
		? { -readonly [Key in keyof Fields]: Render<Fields[Key], NoSelect, S> }
		: unknown
