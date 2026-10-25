/**
 * The observed type of a fixture: the TypeScript type of a JSON value, with the
 * items of each array merged into one type. An object key seen once as a string
 * and once as `null` becomes `string | null`.
 */

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }

interface Shape {
	scalars: Set<'null' | 'boolean' | 'number' | 'string'>
	/** The merged items of every array seen here, or undefined if none was. */
	array?: Shape
	/** Every object seen here: the merged shape of each key, and in how many objects it was present. */
	object?: { count: number; keys: Map<string, { shape: Shape; count: number }> }
}

export function observedType(value: unknown): string {
	return print(describe(value as Json), '')
}

const empty = (): Shape => ({ scalars: new Set() })

function describe(value: Json): Shape {
	if (value === null) return { scalars: new Set(['null']) }
	if (Array.isArray(value)) return { scalars: new Set(), array: value.map(describe).reduce(merge, empty()) }
	if (typeof value === 'object') {
		const keys = new Map(Object.entries(value).map(([key, item]) => [key, { shape: describe(item), count: 1 }]))
		return { scalars: new Set(), object: { count: 1, keys } }
	}
	return { scalars: new Set([typeof value as 'boolean' | 'number' | 'string']) }
}

function merge(a: Shape, b: Shape): Shape {
	return {
		scalars: new Set([...a.scalars, ...b.scalars]),
		...(a.array || b.array ? { array: merge(a.array ?? empty(), b.array ?? empty()) } : {}),
		...(a.object || b.object ? { object: mergeObjects(a.object, b.object) } : {}),
	}
}

function mergeObjects(a: Shape['object'], b: Shape['object']): NonNullable<Shape['object']> {
	const keys = new Map(a?.keys)
	for (const [key, entry] of b?.keys ?? []) {
		const seen = keys.get(key)
		keys.set(key, seen ? { shape: merge(seen.shape, entry.shape), count: seen.count + entry.count } : entry)
	}
	return { count: (a?.count ?? 0) + (b?.count ?? 0), keys }
}

function print(shape: Shape, indent: string): string {
	const members: string[] = [...shape.scalars].filter((s) => s !== 'null')
	if (shape.array) members.push(`Array<${print(shape.array, indent)}>`)
	if (shape.object) members.push(printObject(shape.object, indent))
	if (shape.scalars.has('null')) members.push('null')
	return members.length === 0 ? 'never' : members.join(' | ')
}

function printObject(object: NonNullable<Shape['object']>, indent: string): string {
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
