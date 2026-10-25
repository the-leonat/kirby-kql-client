/**
 * A consumer of the packed package: `pnpm test:pack` installs the tarball
 * into a fresh project and type-checks this file there, against the
 * published declarations (no `skipLibCheck`), with TypeScript 5.4 and the
 * TypeScript this repo builds with.
 *
 * It pins the public API: what the package exports, and that results are
 * typed through it, with and without a schema extension.
 */
import * as pkg from 'kirby-kql-client'
import { createClient, kql, KqlError } from 'kirby-kql-client'
import type {
	Client,
	ClientConfig,
	ExtendedSchema,
	PaginationInfo,
	Query,
	Result,
	Schema,
	SchemaExtension,
} from 'kirby-kql-client'
// The type layers and the generated schema are internal.
// @ts-expect-error
import type { KirbySchema } from 'kirby-kql-client'
// @ts-expect-error
import type { ExtendSchema } from 'kirby-kql-client'
// @ts-expect-error
import type { Select } from 'kirby-kql-client'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false
function assert<T extends true>(): T | void {}

/** The runtime exports, exactly. */
assert<Equal<keyof typeof pkg, 'createClient' | 'kql' | 'KqlError'>>()

const config: ClientConfig = {
	url: 'https://example.com/api/query',
	auth: { email: 'editor@example.com', password: 'secret' },
	language: 'en',
}

/** A query typed inline, without `as const`. */
export async function inline() {
	const client = createClient(config)
	const home = await client.query({
		query: "page('home')",
		select: {
			title: true,
			isListed: true,
			cover: { query: 'page.cover.toFile', select: ['url', 'alt'] },
		},
	})
	assert<
		Equal<
			typeof home,
			{
				title: string
				isListed: boolean
				cover: { url: string; alt: string } | null
			} | null
		>
	>()
}

/** A query in its own constant, and its result type named from it. */
const children = kql({ query: 'site.children', select: ['title', 'slug'], pagination: { limit: 3, page: 1 } })
assert<
	Equal<Result<typeof children>, { data: { title: string; slug: string }[]; pagination: PaginationInfo }>
>()

/** A schema extension for a page method and a new class. */
type Extension = {
	classes: {
		page: { methods: { readingTime: number } }
		pages: { methods: { stats: 'stats' } }
		stats: { methods: { count: number }; defaultFields: { count: number } }
	}
}
assert<Equal<Extension extends SchemaExtension ? true : false, true>>()
assert<Equal<ExtendedSchema<Extension> extends Schema ? true : false, true>>()

const extended: Client<ExtendedSchema<Extension>> = createClient<Extension>({
	url: 'https://example.com/api/kql',
	auth: { token: 'token' },
})
export async function withExtension() {
	const stats = await extended.query({ query: 'site.children.stats' })
	assert<Equal<typeof stats, { count: number }>>()
	const page = await extended.query({ query: "page('blog')", select: { readingTime: true } })
	assert<Equal<typeof page, { readingTime: number } | null>>()
}

/** A query builder generic over its query string. */
function teaser<const Q extends string>(query: Q) {
	return kql({ query, select: { title: true, url: true } })
}
const teaserQuery = teaser("page('home')")
assert<Equal<Result<typeof teaserQuery>, { title: string; url: string } | null>>()
assert<Equal<typeof teaserQuery extends Query ? true : false, true>>()

/** Errors carry the HTTP status and KQL's code. */
export async function errors() {
	try {
		await createClient(config).query({ query: 'site' })
	} catch (error) {
		if (error instanceof KqlError) {
			assert<Equal<typeof error.status, number>>()
			assert<Equal<typeof error.code, number | string>>()
			assert<Equal<typeof error.message, string>>()
		}
	}
}
