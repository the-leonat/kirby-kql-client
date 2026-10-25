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
	/**
	 * Return values that depend on the argument count, by method and count.
	 * `methods` holds the return value for every other count. Example: `find`
	 * with one id gives `{ 1: 'page' | null }`, with several ids `'pages'`.
	 */
	overloads?: { [method: string]: { [argCount: number]: Returns } }
}

/**
 * A schema extension: classes and methods a project adds to the schema to
 * describe what its plugins provide. It has the shape of a schema, with every
 * part optional, and is deep-merged into it: a new class is added, a method on
 * an existing class is added or overrides the schema's.
 *
 * Example:
 *
 *   type MyExtension = {
 *     classes: {
 *       page: { methods: { readingTime: number } }   // a page method
 *       pages: { methods: { stats: 'stats' } }       // a collection method giving a new class
 *       stats: { methods: { count: number }; defaultFields: { count: number } }
 *     }
 *   }
 *   const client = createClient<MyExtension>({ url })
 */
export interface SchemaExtension {
	roots?: { [name: string]: Returns }
	classes?: { [name: string]: Partial<ClassDefinition> }
}

/**
 * `Base` with `Extension` deep-merged into it: roots and classes by name,
 * and inside a class its methods, default fields and overloads by name. A
 * method the extension describes drops the base's overloads for it. Any other
 * part of a class the extension gives replaces the base's.
 */
export type ExtendSchema<Base extends Schema, Extension extends SchemaExtension> = [
	keyof Extension,
] extends [never]
	? Base
	: {
			roots: Merge<Base['roots'], Part<Extension, 'roots'>>
			classes: MergeClasses<Base['classes'], Part<Extension, 'classes'>>
		}

type MergeClasses<Base, Extension> = {
	[Name in keyof Base | keyof Extension]: MergeClass<Part<Base, Name>, Part<Extension, Name>>
}

type MergeClass<Base, Extension> = {
	[Key in keyof Base | keyof Extension | 'methods']: Key extends 'methods' | 'defaultFields'
		? Merge<Part<Base, Key>, Part<Extension, Key>>
		: Key extends 'overloads'
			? Merge<Omit<Part<Base, Key>, keyof Part<Extension, 'methods'>>, Part<Extension, Key>>
			: Key extends keyof Extension
				? Extension[Key]
				: Key extends keyof Base
					? Base[Key]
					: never
}

/** `Extension`'s entries win over `Base`'s. */
type Merge<Base, Extension> = {
	[Key in keyof Base | keyof Extension]: Key extends keyof Extension
		? Extension[Key]
		: Key extends keyof Base
			? Base[Key]
			: never
}

/** `T[Key]`, or nothing (`{}`) when `T` has no such key. */
type Part<T, Key extends PropertyKey> = T extends { [K in Key]: infer Value } ? Value : {}

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
