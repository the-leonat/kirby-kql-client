import { kql } from '../../../src/index.ts'

/** A director's downloads and social links, read from the surrounding page. */
export function bio() {
	return kql({
		query: 'page',
		select: {
			press: {
				query: 'page.press.toFile',
				select: { url: true },
			},
			bio: {
				query: 'page.bio.toFile',
				select: { url: true },
			},
			social: {
				query: 'page.social.toStructure',
				select: ['name', 'url'],
			},
		},
	})
}
