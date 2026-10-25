/**
 * The schema: everything KQL can reach, as plain type data.
 *
 * A method's return value (a `Returns`) is either
 * - a class name, written as a string literal such as `'page'` or `'field'`, or
 * - a JSON type, written as the TypeScript type itself such as `string` or `boolean`,
 * either one optionally with `| null`.
 *
 * Example:
 *
 *   type MySchema = {
 *     roots: { site: 'site' }
 *     classes: {
 *       site: { model: true; methods: { title: 'field'; isHomePage: boolean } }
 *       field: { render: string; methods: { isEmpty: boolean } }
 *     }
 *   }
 */
export interface Schema {
	/** Names a query string may start with, such as `site` or `page(…)`. */
	roots: { [name: string]: Returns }
	/** Classes by their KQL alias. */
	classes: { [name: string]: ClassDefinition }
}

export interface ClassDefinition {
	methods: { [name: string]: Returns }
	/** Keys the class renders when a query selects nothing from it. */
	defaultFields?: { [key: string]: Returns }
	/** The JSON type the class always renders as, e.g. a field renders as `string`. */
	render?: unknown
	/** The class of each item; marks this class as a collection. */
	item?: string
	/** Enables content fields: unknown keys read the model's content as a field. */
	model?: true
}

/** A class name (string literal) or a JSON type, optionally `| null`. */
export type Returns = unknown

/** The class names of a schema. */
export type ClassName<S extends Schema> = keyof S['classes'] & string

/** True if `R` (one member of a `Returns`) is a class name rather than a JSON type. */
export type IsClass<R, S extends Schema> = R extends string
	? string extends R
		? false
		: R extends ClassName<S>
			? true
			: false
	: false
