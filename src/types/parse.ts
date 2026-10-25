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
 */

export interface Step {
	name: string
	args: number
	/** Reached with `?.`: on `null`, the whole query string gives `null`. */
	optional: boolean
}

export type Parse<QueryString extends string> = ToSteps<SplitTopLevel<QueryString, '.'>>

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

type CountArgs<Args extends string> = Trim<Args> extends ''
	? 0
	: SplitTopLevel<Args, ','>['length']

type Open = '(' | '[' | '{'
type Close = ')' | ']' | '}'
type QuoteChar = "'" | '"'

/**
 * Splits `S` on `Separator` wherever the separator is outside brackets and quotes.
 * Walks one character at a time; `Depth` counts open brackets, `Quote` is the
 * quote character of the string literal currently open, or '' outside one.
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
						? SplitTopLevel<Rest, Separator, Pop<Depth>, '', `${Current}${Char}`, Parts>
						: SplitTopLevel<Rest, Separator, Depth, '', `${Current}${Char}`, Parts>
		: Char extends '\\'
			? Rest extends `${infer Escaped}${infer AfterEscape}`
				? SplitTopLevel<AfterEscape, Separator, Depth, Quote, `${Current}${Char}${Escaped}`, Parts>
				: [...Parts, `${Current}${Char}`]
			: Char extends Quote
				? SplitTopLevel<Rest, Separator, Depth, '', `${Current}${Char}`, Parts>
				: SplitTopLevel<Rest, Separator, Depth, Quote, `${Current}${Char}`, Parts>
	: [...Parts, Current]

type Pop<List extends unknown[]> = List extends [...infer Init, unknown] ? Init : []

type Whitespace = ' ' | '\n' | '\t' | '\r'

export type Trim<S extends string> = S extends `${Whitespace}${infer Rest}`
	? Trim<Rest>
	: S extends `${infer Rest}${Whitespace}`
		? Trim<Rest>
		: S
