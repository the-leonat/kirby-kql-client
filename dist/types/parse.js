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
export {};
