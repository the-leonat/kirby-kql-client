/** Where the test site started with `pnpm site` answers. */
export const testSiteOrigin = process.env['KQL_TEST_ORIGIN'] ?? 'http://localhost:8765'

/** KQL's own route on the test site, authenticated with Basic auth. */
export const testSite = {
	url: process.env['KQL_TEST_URL'] ?? `${testSiteOrigin}/api/query`,
	auth: { email: 'test@example.com', password: 'kql-test-password' },
}

/** `kirby-headless`'s KQL route on the test site, authenticated with a Bearer token. */
export const headlessTestSite = {
	url: `${testSiteOrigin}/api/kql`,
	auth: { token: 'kql-test-token' },
}

/**
 * The endpoint each group of test queries is recorded from, when it is not
 * `testSite`.
 */
export const testSiteByGroup: Record<string, typeof testSite | typeof headlessTestSite> = {
	headless: headlessTestSite,
}
