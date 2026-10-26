# kirby-kql-client

A typed client for the [Kirby Query Language](https://github.com/getkirby/kql) (KQL): the result type of every query is derived from the query itself.

```ts
import { createClient } from 'kirby-kql-client'

const client = createClient({ url: 'https://example.com/api/query' })

const home = await client.query({
	query: "page('home')",
	select: { title: true, isListed: true, cover: 'page.cover.toFile.url' },
})
// typeof home: { title: string; isListed: boolean; cover: string } | null
```

No result types written by hand, no `as const`, no `any`. The types come from a schema generated from the Kirby and KQL source, and every one of them is checked against what a real KQL endpoint returns.

- Framework independent: runs wherever `fetch` does (Node 18+, browsers, Bun, Deno, edge runtimes). Pass your own `fetch` for SvelteKit loaders or tests.
- No runtime dependencies, ESM only.
- TypeScript 5.4 or later.
- Kirby 5.6 with KQL 3.0.

> **Status:** not published yet. The package is private until v1 is released; see [Development](#development).

## Contents

- [Install](#install)
- [Connect: endpoints and auth](#connect-endpoints-and-auth)
- [Typed queries](#typed-queries)
- [Selects and nested queries](#selects-and-nested-queries)
- [Reusable queries and query builders](#reusable-queries-and-query-builders)
- [Pagination](#pagination)
- [Plugins: schema extensions](#plugins-schema-extensions)
- [Impossible queries](#impossible-queries)
- [Errors](#errors)
- [Known limitations](#known-limitations)
- [API](#api)
- [Development](#development)

## Install

```sh
npm install kirby-kql-client
```

Until the package is published, build a tarball from this repo with `pnpm pack` and install that file.

## Connect: endpoints and auth

`url` is the full URL of the KQL endpoint. Two routes serve KQL:

| Route | Served by | Auth |
| --- | --- | --- |
| `/api/query` | the official [KQL plugin](https://github.com/getkirby/kql) | Kirby's API auth: Basic auth or a Panel session; off with `'kql' => ['auth' => false]` |
| `/api/kql` | [kirby-headless](https://github.com/johannschopplich/kirby-headless) | a Bearer token (`headless.token`) |

Basic auth on `/api/query` needs `'api' => ['basicAuth' => true]` in the site's config, and HTTPS unless `'api' => ['allowInsecure' => true]` is set too.

```ts
// client.ts
import { createClient } from 'kirby-kql-client'

/** KQL's own route, with Basic auth (a Kirby user's email and password). */
export const client = createClient({
	url: 'https://example.com/api/query',
	auth: { email: 'api@example.com', password: 'secret' },
})

/** kirby-headless's route, with a Bearer token. */
export const headless = createClient({
	url: 'https://example.com/api/kql',
	auth: { token: 'my-token' },
})
```

The other options:

```ts
import { createClient } from 'kirby-kql-client'

const client = createClient({
	url: 'https://example.com/api/query',
	// The content language, sent as the `X-Language` header.
	language: 'de',
	// Extra headers for every query. They override the client's own.
	headers: { 'X-Requested-With': 'my-app' },
	// Defaults to the platform's `fetch`, e.g. SvelteKit's `fetch` in a load function.
	fetch: globalThis.fetch,
	// Types only: an unknown method is a compile error instead of `unknown`.
	// See "Strict: unknown methods as errors".
	strict: true,
})
```

## Typed queries

A query is a plain object: a query string, an optional select and an optional pagination. Write it inline; the client infers its exact type without `as const`.

```ts
import { client } from './client.js'

const news = await client.query({
	query: "page('news').children.listed.sortBy('date', 'desc')",
	select: {
		title: true,
		date: 'page.date.toDate',
		isUnlisted: true,
		readingMinutes: 'page.minutes.toInt',
		author: { query: 'page.author.toUser', select: ['name', 'email'] },
	},
})
// typeof news: { title: string; date: string | number | null; isUnlisted: boolean; readingMinutes: number; author: { name: string; email: string } | null }[]
```

What the types say, and why:

- **Content fields** (`page.title`, `page.customer`, any key that is not a method) are `string`: KQL always sends a field as a string.
- **Methods** are typed by what Kirby's method returns: `isUnlisted` is `boolean`, `toInt` is `number`.
- **Relations** such as `toPage`, `toFile` and `toUser` can be empty, so they are `… | null`. So is `page('…')`: a missing page is `null`, not an error. Handle it, for example with a 404 in your route.
- **Collections** such as `children`, `toPages` and `toFiles` are arrays. Collection methods (`listed`, `filterBy`, `sortBy`, `limit`, `not`, …) keep the collection; `first`, `last` and `find('id')` give a single item or `null`, and `find('a', 'b')` gives a collection.
- **Without a select**, a value renders its default fields: a page renders `id`, `title`, `url`, `content` and so on; a collection renders the ids of its items.

```ts
import { client } from './client.js'

const first = await client.query({ query: 'site.children.listed.first', select: ['title'] })
// typeof first: { title: string } | null

const ids = await client.query({ query: 'site.children' })
// typeof ids: string[]

const page = await client.query({ query: "page('about')" })
// `content` is `[]` for a page without a content file: narrow before reading it.
if (page !== null && !Array.isArray(page.content)) {
	const text: string | undefined = page.content['text']
}
```

KQL fails with an error, not `null`, when a query string calls a method on an empty value (`page('missing').children`). That is why a query string that goes on after `page('…')` or `toPage` has no `null` in its type: if the value is missing, `query()` throws a `KqlError` instead. To read from something that may be missing, select from it: `{ query: "page('missing')", select: ['title'] }` gives `null`.

Or use `?.`: on an empty value it ends the query string there, and the whole result is `null` instead of an error. `.` and `?.` differ only on an empty value.

```ts
import { client } from './client.js'

// With `.`, an empty `cover` field makes KQL answer 400 and `query()` throw.
const cover = await client.query({ query: "page('about').cover.toFile.url" })
// typeof cover: string

// With `?.`, an empty `cover` field gives `null`.
const maybeCover = await client.query({ query: "page('about').cover.toFile?.url" })
// typeof maybeCover: string | null
```

## Selects and nested queries

A select picks the keys of the result. It can be a record, a list of keys or a comma-separated string, and all three give the same shape. A key set to `false` is left out.

```ts
import { client } from './client.js'

const asRecord = await client.query({ query: 'site', select: { title: true, url: true, children: false } })
const asList = await client.query({ query: 'site', select: ['title', 'url'] })
const asString = await client.query({ query: 'site', select: 'title, url' })
// typeof asRecord: { title: string; url: string }
// typeof asList: { title: string; url: string }
// typeof asString: { title: string; url: string }
```

Each key of a record select can be

- `true`: the key read from the current object (a method or a content field),
- a query string, starting at the surrounding object by its class name (`page.`, `file.`, `user.`, `block.`, …),
- a nested query `{ query, select, pagination }`, so one request returns a page with its related pages and files,
- a select without a query string `{ select }`, which reads the key from the current object and selects from it.

```ts
import { client } from './client.js'

const project = await client.query({
	query: "page('projects/alpha')",
	select: {
		title: true,
		// A query string from the surrounding page.
		client: 'page.client',
		// A nested query.
		gallery: { query: 'page.images.sortBy("sort")', select: { url: true, alt: true } },
		// A select without a query string: reads `children` from the page.
		children: { select: ['title', 'slug'] },
	},
})
// typeof project: { title: string; client: string; gallery: { url: string; alt: string }[]; children: { title: string; slug: string }[] } | null
```

Blocks, layouts and structures are typed too: `page.text.toBlocks`, `page.layout.toLayouts` and `page.items.toStructure` give collections you can select from, with each block's or structure item's fields as content fields (`block.heading`, `structureItem.title`).

## Reusable queries and query builders

`kql()` defines a query outside a `query()` call and keeps its exact type. `Result` names a query's result type, for example for a component's props.

```ts
// queries.ts
import { kql, type Result } from 'kirby-kql-client'

export const navigation = kql({
	query: 'site.children.listed',
	select: { title: true, url: true },
})

export type Navigation = Result<typeof navigation>
// typeof navigation.query: 'site.children.listed'
```

```ts
import { client } from './client.js'
import { navigation, type Navigation } from './queries.js'

const items: Navigation = await client.query(navigation)
// typeof items: { title: string; url: string }[]
```

A query builder is a function that takes a query string and returns a query. Give it a `const` type parameter for the query string and the result keeps its exact type, across modules and through other builders:

```ts
// image.ts
import { kql } from 'kirby-kql-client'

export function image<const Q extends string>(query: Q) {
	return kql({
		query,
		select: { url: true, alt: true, width: true, height: true },
	})
}
```

```ts
// film.ts
import { kql } from 'kirby-kql-client'
import { image } from './image.js'

export function film<const Q extends string>(query: Q) {
	return kql({
		query,
		select: {
			title: true,
			cover: image('page.cover.toFile'),
			stills: image('page.stills.toFiles'),
		},
	})
}
```

```ts
import { client } from './client.js'
import { film } from './film.js'

const alpha = await client.query(film("page('films/alpha')"))
// typeof alpha: { title: string; cover: { url: string; alt: string; width: string | number; height: string | number } | null; stills: { url: string; alt: string; width: string | number; height: string | number }[] } | null
```

(`width` and `height` are `string | number`: see [Known limitations](#known-limitations).)

## Pagination

A collection **with a select** and a `pagination` is a paginated result: its items come wrapped as `{ data, pagination }`.

```ts
import type { PaginationInfo } from 'kirby-kql-client'
import { client } from './client.js'

const posts = await client.query({
	query: "page('blog').children.listed",
	select: ['title', 'url'],
	pagination: { limit: 10, page: 2 },
})
// typeof posts: { data: { title: string; url: string }[]; pagination: PaginationInfo }

const { page, pages, total } = posts.pagination
```

`pagination` is `{ page, pages, offset, limit, total }`. A page past the end gives the last page; an empty collection gives page 0 of 0.

**Always pass `page`.** Without it, KQL reads the page from the request URL (`/page:2`), which the client never sets, so you always get page 1.

KQL applies pagination only in some places, and the types follow it exactly:

- **With a select, on a collection**: wrapped, as above. This works in nested queries too (`{ query, select, pagination }`).
- **Without a select**: no wrapper. The result is the plain list of ids of the whole collection.
- **On a single object**: ignored.
- **On a select without a query string** (`children: { select: […] }`), KQL ignores a `pagination` key. Use `options` instead: `children: { select: ['title'], options: { pagination: { limit: 5, page: 1 } } }`.

`paginate()` in the query string (`page.children.paginate(10, 2)`) is typed as paginated as well, but KQL blocks it unless the site allows it:

```php
// site/config/config.php
'kql' => [
	'methods' => [
		'allowed' => ['Kirby\Cms\Pages::paginate'], // add Files::paginate, Users::paginate as needed
	],
],
```

Prefer the `pagination` key. If you use `paginate()`, filter and sort **before** it: `filterBy` and `sortBy` after `paginate()` only see the items of the current page and keep the pagination of the whole collection.

`children`, `drafts` and `index` after `paginate()` give the children, drafts or descendants of the pages on the current page as a new collection, without a pagination: a plain list, not wrapped.

## Plugins: schema extensions

Plugins add roots, methods and classes that the generated schema doesn't know. A **schema extension** describes them. It has the shape of the schema, with every part optional, and is deep-merged into it: a new root or class is added, and a method on an existing class is added or overrides the schema's.

A root or method returns either a class name as a string literal (`'page'`, `'field'`, `'stats'`) or a JSON type written as the TypeScript type itself (`number`, `string[]`), optionally `| null`.

```ts
// kirby.ts
import { createClient } from 'kirby-kql-client'

export type SiteExtension = {
	// A root the plugin registers in `Kirby\Query\Query::$entries`: `featured('blog')`.
	roots: { featured: 'page' | null }
	classes: {
		// A field method that gives a field.
		field: { methods: { shout: 'field' } }
		// A page method that gives a number.
		page: { methods: { readingTime: number } }
		// A collection method that gives a class of the plugin's own.
		pages: { methods: { stats: 'stats' } }
		// The plugin's class: its methods, and what it renders without a select.
		stats: {
			methods: { count: number; titles: string[]; longest: 'page' | null }
			defaultFields: { count: number; titles: string[] }
		}
		// An override: this site only has images, so `width` is always a number.
		file: { methods: { width: number } }
	}
}

export const kirby = createClient<SiteExtension>({ url: 'https://example.com/api/query' })
```

```ts
import type { ExtendedSchema, Result } from 'kirby-kql-client'
import { kql } from 'kirby-kql-client'
import { kirby, type SiteExtension } from './kirby.js'

const stats = await kirby.query({ query: "page('blog').children.stats" })
// typeof stats: { count: number; titles: string[] }

const post = await kirby.query({
	query: "page('blog/hello')",
	select: { readingTime: true, loud: 'page.title.shout', longest: { query: 'page.siblings.stats.longest', select: ['title'] } },
})
// typeof post: { readingTime: number; loud: string; longest: { title: string } | null } | null

const featured = await kirby.query({ query: "featured('blog')", select: ['title'] })
// typeof featured: { title: string } | null

// A reusable query's result type on the extended schema:
const blog = kql({ query: "page('blog').children", select: { readingTime: true } })
type Blog = Result<typeof blog, ExtendedSchema<SiteExtension>>
const posts: Blog = await kirby.query(blog)
```

- The extension is a type parameter only: nothing changes at runtime.
- Each client carries its own extension, so one app can query several sites.
- A class that is a collection needs `item: '<class of its items>'`. A new class without `defaultFields` or `render` renders `unknown` without a select.
- You can use the client without any extension. A method the schema doesn't know is typed `unknown`, and so is everything after it in the query string; a select on it still gives its known keys, with `unknown` values. With [`strict`](#strict-unknown-methods-as-errors), it is a compile error instead.
- A root the schema doesn't know is a compile error: KQL rejects it (see [Impossible queries](#impossible-queries)). Declare a plugin's roots in `roots`.

**The content field limitation.** On a page, site, file or user (and a block or structure item), a key the schema doesn't know reads a content field, so it is typed `string`. A plugin's page method that returns a number or an object is therefore typed `string` until you describe it in an extension. Describe every plugin method on these classes that doesn't return a field.

**Allowing plugin methods in KQL.** KQL blocks plugin methods on pages, sites, files, users and collections unless the method's docblock contains `@kql-allowed` (or the site lists it in `kql.methods.allowed`). Field methods need nothing. A plugin's own class needs a KQL interceptor (`kql.interceptors` in the site's config) or an entry in `kql.classes.allowed`.

```php
'pageMethods' => [
	/**
	 * @kql-allowed
	 */
	'readingTime' => function (): int {
		return (int)ceil(str_word_count($this->text()->value()) / 200);
	},
],
```

## Impossible queries

Some queries KQL can never answer, whatever the content: it rejects them with a 400. Such a query is a compile error at the query, and its result type is `never`:

- a query string that doesn't parse: a bracket or quote left open, or a bracket that closes none,
- a root that neither the schema nor your schema extension declares (`nothing.title`),
- a method on a string, number or boolean (`page.slug.upper`: `slug` is a string).

```ts
import { client } from './client.js'

// @ts-expect-error `nothing` is no root
const nothing = client.query({ query: 'nothing.title' })
// typeof nothing: Promise<never>
```

The error names the problem:

```
Property ''Impossible query'' is missing in type '{ query: "nothing.title"; }'
but required in type '{ 'Impossible query': "unknown root \"nothing\""; }'.
```

Why both: `never` alone is assignable to everything, so `const title: string = await client.query(…)` would compile without a word. The error makes the mistake show at the query, and `never` is the result type behind it.

- An impossible query string anywhere in a select makes the whole query impossible: KQL rejects the whole request. (KQL only notices when it evaluates it, so a select on a missing page still gives `null`; the query fails on every page it was written for.)
- `Result<typeof query>` is `never` for an impossible query, but only `client.query` reports the error: a query defined with `kql()` is checked where it is sent.
- A method on a value that is a string or number only sometimes, such as a file's `width` (a number for an image, a field otherwise), is not impossible.

Not impossible, because KQL answers them: an unknown key on a page, site, file, user, block or structure item (a content field, typos included), a select on a string, number or boolean (`null`), and an empty query string.

### Strict: unknown methods as errors

By default, a method that neither the schema nor your schema extension describes, on a class other than page, site, file, user, block or structure item, is typed `unknown`: it may be a plugin's. With `strict: true`, it is an impossible query instead, so a typo or a forgotten extension shows at the query.

```ts
import { createClient } from 'kirby-kql-client'

const strict = createClient({ url: 'https://example.com/api/query', strict: true })

// @ts-expect-error `stats` is an unknown method of `pages`
const stats = strict.query({ query: "page('blog').children.stats" })
// typeof stats: Promise<never>
```

`strict` changes types only. Pass it as the literal `true` in the `createClient` call: a `boolean` variable is not strict. It is off by default, so a site with undescribed plugin methods still type-checks. For a reusable query's result type on a strict client, use `Result<typeof query, StrictSchema<ExtendedSchema<YourExtension>>>`.

## Errors

Every failed query throws a `KqlError` with the HTTP `status`, a `code` and a `message`. There is no other error type to handle, and `null` results are never turned into errors.

```ts
import { KqlError } from 'kirby-kql-client'
import { client } from './client.js'

try {
	await client.query({ query: 'site.kirby' })
} catch (error) {
	if (error instanceof KqlError) {
		console.error(error.status, error.code, error.message)
		// 403 403 The method "Kirby\Cms\Site::kirby()" is not allowed in the API context
	}
}
```

| Failure | `status` | `code` |
| --- | --- | --- |
| KQL rejects the query (a blocked method, an invalid query string) | 400, 403, … | KQL's code, or the HTTP status |
| Missing or wrong credentials | 401 or 403 | the HTTP status |
| No response (network failure, unreachable URL) | `0` | `'network-error'` |
| A response that isn't JSON | the HTTP status | `'invalid-json'` |
| A JSON response that isn't an object (`null`, a number, a list) | the HTTP status | `'invalid-response'` |

The original error, where there is one, is the error's `cause`.

## Known limitations

- **Plugin methods on models without an extension** are typed `string` (see [the content field limitation](#plugins-schema-extensions)).
- **`file.width` and `file.height`** are `string | number`: an image gives a number, any other file reads a content field. Override them in an extension if your files are all images.
- **The same page's children, paginated and not, in one request.** Paginating `page.children` stores the pagination on the page's children, so a later unpaginated `page.children` with a select in the same request also comes back wrapped. Query them in separate requests.
- **`content: true` on a block** is typed `Record<string, string>`, but block content holds the stored JSON values. Select the block's fields instead (`block.heading`), or render the block without a select.
- **`layout.attrs.class`** and a select key named `class` fail in KQL (they hit KQL's internal `class()`). Name the attribute differently.
- Several queries in one request (KQL's `queries` key) are not supported.

## API

| Export | |
| --- | --- |
| `createClient<Extension>(config)` | Creates a client. `config`: `url`, `auth?`, `fetch?`, `headers?`, `language?`, `strict?`. |
| `client.query(query)` | Sends a query, resolves to its typed result, throws `KqlError`. An impossible query fails to compile. |
| `kql(query)` | Defines a query outside `query()` with its exact type. |
| `KqlError` | The error every failed query throws: `status`, `code`, `message`, `cause`. |
| `Result<Q, S?>` | The result type of the query `Q`, on the schema `S` (default: Kirby's). |
| `Query` | What a query may contain. |
| `Schema`, `SchemaExtension` | The shape of the schema and of an extension. |
| `ExtendedSchema<Extension>` | Kirby's schema with an extension merged in, for `Result<Q, ExtendedSchema<E>>`. |
| `StrictSchema<S>` | The schema `S` with `strict` on, for `Result<Q, StrictSchema<ExtendedSchema<E>>>`. |
| `Client<S?>`, `ClientConfig` | The client's type and its config. |
| `PaginationInfo` | The `pagination` of a paginated result. |

## Development

```sh
pnpm install
pnpm test          # type tests: every test query's result type against its fixture
pnpm build         # dist/: ESM and declarations
pnpm test:pack     # packs the package, installs it in a fresh project and type-checks
                   # test/pack/consumer.ts and this README's examples (TypeScript 5.4 and current)
```

The types are proven against a small Kirby site in `test/site` (Kirby, KQL, PHP 8.5):

```sh
pnpm site:install  # Composer install of the test site
pnpm site          # serve it on http://localhost:8765, or on KQL_TEST_ORIGIN if set
pnpm record        # re-record the fixtures from the running site
pnpm test:site     # runtime tests against the running site
pnpm schema        # regenerate src/kirby-schema.ts from the test site
pnpm ci:drift      # all of the above; fails if the schema or fixtures drift
```

Each test query's result type must equal the type observed in its fixture, exactly, with one deliberate relaxation: where the result type has a string index signature (a page's `content`, a structure item's fields), the fixture's concrete content keys can't be named by any type, so the observed object is compared as that index signature with its values merged (`WidenToIndex` in `test/types/check.ts`).

`GLOSSARY.md` defines the project's terms, and `docs/adr/` records the decisions behind them.

### Releasing

`package.json` has `"private": true` so that nothing can be published by accident. Remove it only for a release, and only with the maintainer's explicit approval. The repo stays private until v1.

## License

[MIT](LICENSE)
