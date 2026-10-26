/**
 * Parse: turns a query string into steps of method name plus argument count.
 *
 *   Parse<"page('a.b').children?.filterBy('x', 'in', ['y'])">
 *   = [
 *       { name: 'page'; args: 1; optional: false },
 *       { name: 'children'; args: 0; optional: false },
 *       { name: 'filterBy'; args: 3; optional: true },
 *     ]
 *
 * Dots and commas only separate steps and arguments outside brackets and quotes.
 * A step reached with `?.` instead of `.` is `optional`.
 *
 * A query string with a bracket or quote left open, or a closing bracket
 * without an opening one, doesn't parse: it is Impossible (KQL answers 400).
 * An empty query string gives no steps.
 */
import type { Impossible } from './impossible.ts'

export interface Step {
	name: string
	/** The argument count; `number` for a single list argument (see CountArgs). */
	args: number
	/** Reached with `?.`: on `null`, the whole query string gives `null`. */
	optional: boolean
}

export type Parse<QueryString extends string> = Trim<QueryString> extends ''
	? []
	: SplitTopLevel<QueryString, '.'> extends infer Parts
		? Parts extends string[]
			? ToSteps<Parts>
			: Parts extends Unbalanced<infer Problem>
				? Impossible<`${Problem} in "${QueryString}"`>
				: never
		: never

/** A part ending in `?` was followed by `?.`, which makes the next step optional. */
type ToSteps<Parts extends string[], Optional extends boolean = false> = Parts extends [
	infer Part extends string,
	...infer Rest extends string[],
]
	? Trim<Part> extends `${infer Body}?`
		? [ToStep<Trim<Body>, Optional>, ...ToSteps<Rest, true>]
		: [ToStep<Trim<Part>, Optional>, ...ToSteps<Rest, false>]
	: []

type ToStep<Part extends string, Optional extends boolean> = Part extends `${infer Name}(${infer Args})`
	? { name: Trim<Name>; args: CountArgs<Args>; optional: Optional }
	: { name: Part; args: 0; optional: Optional }

/**
 * A single list argument, as in `find(['a', 'b'])`, stands for any number of
 * arguments: Kirby methods such as `find` spread it. Its count is `number`.
 */
type CountArgs<Args extends string> = Trim<Args> extends ''
	? 0
	: SplitTopLevel<Args, ','> extends infer Parts extends string[]
		? Parts extends [infer Only extends string]
			? Trim<Only> extends `[${string}]`
				? number
				: 1
			: Parts['length']
		: never

type Open = '(' | '[' | '{'
type Close = ')' | ']' | '}'
type QuoteChar = "'" | '"'

/** A query string that doesn't parse, and why. */
interface Unbalanced<Problem extends string> {
	unbalanced: Problem
}

/**
 * Splits `S` on `Separator` wherever the separator is outside brackets and quotes.
 * Walks one character at a time; `Depth` counts open brackets, `Quote` is the
 * quote character of the string literal currently open, or '' outside one.
 * Gives Unbalanced if a bracket or quote is left open or a bracket closes
 * none.
 */
type SplitTopLevel<
	S extends string,
	Separator extends string,
	Depth extends unknown[] = [],
	Quote extends string = '',
	Current extends string = '',
	Parts extends string[] = [],
> = S extends `${infer Char}${infer Rest}`
	? Quote extends ''
		? Char extends Separator
			? Depth extends []
				? SplitTopLevel<Rest, Separator, Depth, '', '', [...Parts, Current]>
				: SplitTopLevel<Rest, Separator, Depth, '', `${Current}${Char}`, Parts>
			: Char extends QuoteChar
				? SplitTopLevel<Rest, Separator, Depth, Char, `${Current}${Char}`, Parts>
				: Char extends Open
					? SplitTopLevel<Rest, Separator, [...Depth, Char], '', `${Current}${Char}`, Parts>
					: Char extends Close
						? Depth extends []
							? Unbalanced<'unopened bracket'>
							: SplitTopLevel<Rest, Separator, Pop<Depth>, '', `${Current}${Char}`, Parts>
						: SplitTopLevel<Rest, Separator, Depth, '', `${Current}${Char}`, Parts>
		: Char extends '\\'
			? Rest extends `${infer Escaped}${infer AfterEscape}`
				? SplitTopLevel<AfterEscape, Separator, Depth, Quote, `${Current}${Char}${Escaped}`, Parts>
				: Unbalanced<'unclosed quote'>
			: Char extends Quote
				? SplitTopLevel<Rest, Separator, Depth, '', `${Current}${Char}`, Parts>
				: SplitTopLevel<Rest, Separator, Depth, Quote, `${Current}${Char}`, Parts>
	: Quote extends ''
		? Depth extends []
			? [...Parts, Current]
			: Unbalanced<'unclosed bracket'>
		: Unbalanced<'unclosed quote'>

type Pop<List extends unknown[]> = List extends [...infer Init, unknown] ? Init : []

type Whitespace = ' ' | '\n' | '\t' | '\r'

export type Trim<S extends string> = S extends `${Whitespace}${infer Rest}`
	? Trim<Rest>
	: S extends `${infer Rest}${Whitespace}`
		? Trim<Rest>
		: S
