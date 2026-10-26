/**
 * Runtime tests of `client.query()` against the running test site (`pnpm site`):
 * the failures that throw `KqlError`, and a `null` result that does not.
 * Expected values are what the test site answers (Kirby 5.6, KQL 3, kirby-headless 8.2).
 *
 * Usage: pnpm test:site
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createClient, KqlError, type ClientConfig, type Query } from '../../src/index.ts'
import * as impossible from '../impossible.ts'
import { headlessTestSite, testSite, testSiteOrigin } from '../test-site.ts'

/** Asserts that `query` rejects with a `KqlError` carrying exactly these values. */
async function assertThrowsKqlError(
	config: ClientConfig,
	query: Query,
	expected: { status: number; code: number | string; message: string },
) {
	await assert.rejects(createClient(config).query(query), (error) => {
		assert.ok(error instanceof KqlError, `expected a KqlError, got ${String(error)}`)
		assert.deepEqual(
			{ status: error.status, code: error.code, message: error.message },
			expected,
		)
		return true
	})
}

test('a forbidden method throws KqlError 403', async () => {
	await assertThrowsKqlError(testSite, { query: 'site.kirby' }, {
		status: 403,
		code: 403,
		message: 'The method "Kirby\\Cms\\Site::kirby()" is not allowed in the API context',
	})
})

test('paginate() throws KqlError 403 unless the site allows it', async () => {
	// The test site allows `Kirby\Cms\Pages::paginate` only (kql.methods.allowed),
	// for the pagination test queries; on files it keeps KQL's default.
	await assertThrowsKqlError(
		testSite,
		{ query: "page('collections/filled').files.paginate(1)", select: ['filename'] },
		{
			status: 403,
			code: 403,
			message: 'The method "Kirby\\Cms\\Files::paginate()" is not allowed in the API context',
		},
	)
})

test('an invalid query string throws KqlError 400', async () => {
	await assertThrowsKqlError(testSite, { query: "page('home'..title" }, {
		status: 400,
		code: 400,
		message: 'Access to non-existing property "page(\'home\'" on array',
	})
})

// Impossible queries: a compile error, so they are passed as a plain `Query`.

test('an unknown root throws KqlError 400', async () => {
	await assertThrowsKqlError(testSite, impossible.unknownRoot as Query, {
		status: 400,
		code: 400,
		message: 'Access to non-existing property "nothing" on array',
	})
})

for (const [name, type] of [
	['methodOnString', 'string'],
	['methodOnBoolean', 'boolean'],
	['methodOnNumber', 'integer'],
] as const) {
	test(`a method called on a JSON scalar throws KqlError 400 (${type})`, async () => {
		const query = impossible[name] as Query
		const method = query.query?.split('.').at(-1)
		await assertThrowsKqlError(testSite, query, {
			status: 400,
			code: 400,
			message: `Access to method/property "${method}" on ${type}`,
		})
	})
}

test('wrong Basic credentials throw KqlError 403', async () => {
	await assertThrowsKqlError(
		{ ...testSite, auth: { email: 'nobody@example.com', password: 'wrong-password' } },
		{ query: 'site.title' },
		{ status: 403, code: 403, message: 'Invalid login' },
	)
})

test('missing credentials throw KqlError 401', async () => {
	await assertThrowsKqlError({ url: testSite.url }, { query: 'site.title' }, {
		status: 401,
		code: 401,
		message: 'Unauthenticated',
	})
})

test('a wrong Bearer token throws KqlError 401', async () => {
	await assertThrowsKqlError(
		{ ...headlessTestSite, auth: { token: 'wrong-token' } },
		{ query: 'site.title' },
		{ status: 401, code: 401, message: 'Unauthorized' },
	)
})

test('an unreachable URL throws KqlError with status 0', async () => {
	await assertThrowsKqlError({ url: 'http://127.0.0.1:1/api/query' }, { query: 'site.title' }, {
		status: 0,
		code: 'network-error',
		message: 'fetch failed',
	})
})

test('a response that is not JSON throws KqlError with its HTTP status', async () => {
	// The site root renders a page, not KQL: an HTML 404, because the test site has no templates.
	await assertThrowsKqlError({ ...testSite, url: `${testSiteOrigin}/` }, { query: 'site.title' }, {
		status: 404,
		code: 'invalid-json',
		message: 'The KQL endpoint did not answer with JSON (HTTP 404)',
	})
})

for (const body of ['null', '42', '"ok"', '[]']) {
	test(`a JSON body that is not an object (${body}) throws KqlError with its HTTP status`, async () => {
		// No KQL endpoint answers like this; a stand-in `fetch` does, as a misconfigured proxy might.
		const fetch = async () => new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } })
		await assertThrowsKqlError({ url: testSite.url, fetch }, { query: 'site.title' }, {
			status: 200,
			code: 'invalid-response',
			message: 'The KQL endpoint did not answer with a JSON object (HTTP 200)',
		})
	})
}

test('a method called on an empty relation throws KqlError 400', async () => {
	// The filled case is the test query relations/methodAfterToPage. Because the
	// empty case throws, the result type of `….toPage.title` has no `null`.
	await assertThrowsKqlError(testSite, { query: "page('relations/empty').link.toPage.title" }, {
		status: 400,
		code: 400,
		message: 'Access to method/property "title" on null',
	})
})

test('a method called on a missing page throws KqlError 400', async () => {
	await assertThrowsKqlError(testSite, { query: "page('missing').title" }, {
		status: 400,
		code: 400,
		message: 'Access to method/property "title" on null',
	})
})

test('a null result resolves to null', async () => {
	assert.equal(await createClient(testSite).query({ query: "page('missing')" }), null)
})

test('a null result from kirby-headless, which leaves `result` out, resolves to null', async () => {
	assert.equal(await createClient(headlessTestSite).query({ query: "page('missing')" }), null)
})
