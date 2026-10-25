import { kql } from '../../src/index.ts'

export const homeBasics = kql({
	query: "page('home')",
	select: {
		headline: true,
		slug: true,
		isListed: true,
	},
})
