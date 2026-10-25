import { kql } from '../../src/index.ts'

/**
 * Recorded through kirby-headless's `/api/kql` route with a Bearer token (see
 * test/test-site.ts). kirby-headless leaves `result` out for a missing page.
 */
export const homeWithBearerToken = [
	kql({ query: "page('home')", select: { headline: true, slug: true, isListed: true } }),
	kql({ query: "page('missing')", select: { headline: true, slug: true, isListed: true } }),
]
