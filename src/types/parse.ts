/**
 * Parse: turns a query string into steps of method name plus argument count.
 *
 *   Parse<"page('a.b').children.filterBy('x', 'in', ['y'])">
 *   = [{ name: 'page'; args: 1 }, { name: 'children'; args: 0 }, { name: 'filterBy'; args: 3 }]
 *
 * Dots and commas only separate steps and arguments outside brackets and quotes.
 */

export interface Step {
	name: string
	args: number
}

export type Parse<QueryString extends string> = ToSteps<SplitTopLevel<QueryString, '.'>>

type ToSteps<Parts extends string[]> = {
	[I in keyof Parts]: ToStep<Parts[I]>
}

type ToStep<Part extends string> = Part extends `${infer Name}(${infer Args})`
	? { name: Trim<Name>; args: CountArgs<Args> }
	: { name: Trim<Part>; args: 0 }

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
