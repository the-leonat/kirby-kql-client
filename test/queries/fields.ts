import { kql } from '../../src/index.ts'

/** `page('…')` gives `null` for a missing page, so a select on it does too. */
export const homeBasics = [
	kql({ query: "page('home')", select: { headline: true, slug: true, isListed: true } }),
	kql({ query: "page('missing')", select: { headline: true, slug: true, isListed: true } }),
]
