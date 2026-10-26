/**
 * The observed type of a fixture: the TypeScript type of a JSON value, with the
 * items of each array merged into one type. An object key seen once as a string
 * and once as `null` becomes `string | null`.
 *
 * With `blockTypes`, blocks rendered without a select (objects with exactly
 * the keys `content`, `id`, `isHidden` and `type`, and maybe `isEmpty`) are
 * told apart by their block type: blocks of one block type merge, and the
 * observed type has one object per block type, each with its `type` as a
 * string literal.
 */

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }

export interface ObservedTypeOptions {
	/** Tells blocks apart by their block type. */
	blockTypes?: boolean
}

interface Shape {
	/** `null`, `boolean`, `number`, `string`, or a string literal (written as JSON). */
	scalars: Set<string>
	/** The merged items of every array seen here, or undefined if none was. */
	array?: Shape
	/** Every object seen here. */
	object?: ObjectShape
	/** Every block seen here, merged by block type. */
	blocks?: Map<string, ObjectShape>
}

/** Objects merged: the merged shape of each key, and in how many objects it was present. */
interface ObjectShape {
	count: number
	keys: Map<string, { shape: Shape; count: number }>
}

export function observedType(value: unknown, options: ObservedTypeOptions = {}): string {
	return print(describe(value as Json, options), '')
}

/** The observed type of the results of several cases of one test query, merged like list items. */
export function observedTypeOfCases(values: unknown[], options: ObservedTypeOptions = {}): string {
	return print((values as Json[]).map((value) => describe(value, options)).reduce(merge, empty()), '')
}

const empty = (): Shape => ({ scalars: new Set() })

function describe(value: Json, options: ObservedTypeOptions): Shape {
	if (value === null) return { scalars: new Set(['null']) }
	if (Array.isArray(value)) {
		return { scalars: new Set(), array: value.map((item) => describe(item, options)).reduce(merge, empty()) }
	}
	if (typeof value === 'object') {
		const keys = new Map(Object.entries(value).map(([key, item]) => [key, { shape: describe(item, options), count: 1 }]))
		const object = { count: 1, keys }
		if (options.blockTypes && isBlock(value)) {
			keys.set('type', { shape: { scalars: new Set([JSON.stringify(value.type)]) }, count: 1 })
			return { scalars: new Set(), blocks: new Map([[value.type, object]]) }
		}
		return { scalars: new Set(), object }
	}
	return { scalars: new Set([typeof value]) }
}

const blockKeys = ['content', 'id', 'isHidden', 'type']

function isBlock(value: { [key: string]: Json }): value is { [key: string]: Json; type: string } {
	const keys = Object.keys(value).filter((key) => key !== 'isEmpty')
	return (
		typeof value['type'] === 'string' &&
		keys.length === blockKeys.length &&
		blockKeys.every((key) => keys.includes(key))
	)
}

function merge(a: Shape, b: Shape): Shape {
	return {
		scalars: new Set([...a.scalars, ...b.scalars]),
		...(a.array || b.array ? { array: merge(a.array ?? empty(), b.array ?? empty()) } : {}),
		...(a.object || b.object ? { object: mergeObjects(a.object, b.object) } : {}),
		...(a.blocks || b.blocks ? { blocks: mergeBlocks(a.blocks, b.blocks) } : {}),
	}
}

function mergeObjects(a: ObjectShape | undefined, b: ObjectShape | undefined): ObjectShape {
	const keys = new Map(a?.keys)
	for (const [key, entry] of b?.keys ?? []) {
		const seen = keys.get(key)
		keys.set(key, seen ? { shape: merge(seen.shape, entry.shape), count: seen.count + entry.count } : entry)
	}
	return { count: (a?.count ?? 0) + (b?.count ?? 0), keys }
}

function mergeBlocks(a: Shape['blocks'], b: Shape['blocks']): Map<string, ObjectShape> {
	const blocks = new Map(a)
	for (const [type, object] of b ?? []) blocks.set(type, mergeObjects(blocks.get(type), object))
	return blocks
}

function print(shape: Shape, indent: string): string {
	const members: string[] = [...shape.scalars].filter((s) => s !== 'null')
	if (shape.array) members.push(`Array<${print(shape.array, indent)}>`)
	if (shape.object) members.push(printObject(shape.object, indent))
	for (const [, object] of [...(shape.blocks ?? [])].sort(([a], [b]) => (a < b ? -1 : 1))) {
		members.push(printObject(object, indent))
	}
	if (shape.scalars.has('null')) members.push('null')
	return members.length === 0 ? 'never' : members.join(' | ')
}

function printObject(object: ObjectShape, indent: string): string {
	if (object.keys.size === 0) return '{}'
	const inner = `${indent}\t`
	const lines = [...object.keys].map(([key, { shape, count }]) => {
		const optional = count < object.count ? '?' : ''
		return `${inner}${printKey(key)}${optional}: ${print(shape, inner)}`
	})
	return `{\n${lines.join('\n')}\n${indent}}`
}

function printKey(key: string): string {
	return /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)
}
