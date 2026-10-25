/**
 * A small hand-written schema covering `site`, `page` and `field`.
 * It will be replaced by the schema generated from the Kirby and KQL source.
 */
export type KirbySchema = {
	roots: {
		site: 'site'
		// Kirby returns null for a missing page. Not yet `| null`: a single
		// fixture of `page('home')` cannot show both cases (see #6).
		page: 'page'
	}
	classes: {
		site: {
			model: true
			methods: {
				title: 'field'
				url: string
			}
		}
		page: {
			model: true
			methods: {
				id: string
				slug: string
				uid: string
				uri: string
				url: string
				title: 'field'
				template: string
				isListed: boolean
				isUnlisted: boolean
				isDraft: boolean
				isHomePage: boolean
			}
		}
		field: {
			render: string
			methods: {
				value: string
				isEmpty: boolean
				isNotEmpty: boolean
			}
		}
	}
}
