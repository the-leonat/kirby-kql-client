/**
 * anorak's query builders, each in its own module as in anorak, with the
 * transformers removed. They are generic over the query string, so each call
 * keeps the exact query string it was given (user story 3).
 *
 * The test queries that use them are in test/queries/anorak.ts.
 */
import { kql } from '../../../src/index.ts'

/** An image with the srcset of one of the test site's srcset presets. */
export function image<const Q extends string, const Srcset extends string = 'default'>(
	query: Q,
	srcset?: Srcset,
) {
	return kql({
		query,
		select: {
			alt: true,
			src: 'file.url',
			srcset: `file.srcset('${(srcset ?? 'default') as Srcset}')`,
			width: true,
			height: true,
		},
	})
}
