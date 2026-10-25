import { kql } from '../../../src/index.ts'

/** kirby-meta's page meta object (`page.meta`), described by `AnorakExtension`. */
export function pageMeta<const Q extends string>(query: Q) {
	return kql({
		query,
		select: {
			title: true,
			description: true,
			robots: true,
			canonicalUrl: true,
			jsonld: true,
			social: true,
		},
	})
}
