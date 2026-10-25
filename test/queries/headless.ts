import { kql } from '../../src/index.ts'

/** Recorded through kirby-headless's `/api/kql` route with a Bearer token (see test/test-site.ts). */
export const homeWithBearerToken = kql({
	query: "page('home')",
	select: {
		headline: true,
		slug: true,
		isListed: true,
	},
})
