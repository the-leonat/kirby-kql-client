/** How to reach the test site started with `pnpm site`. */
export const testSite = {
	url: process.env['KQL_TEST_URL'] ?? 'http://localhost:8765/api/query',
	auth: { email: 'test@example.com', password: 'kql-test-password' },
}
