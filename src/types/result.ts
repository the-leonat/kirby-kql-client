/**
 * Result: the JSON type the KQL endpoint returns for a query.
 *
 *   const query = kql({ query: "page('home')", select: { title: true } })
 *   type HomeTitle = Result<typeof query> // { title: string }
 */
import type { KirbySchema } from '../kirby-schema.ts'
import type { Schema } from '../schema.ts'
import type { Possible, Problem } from './impossible.ts'
import type { Parse } from './parse.ts'
import type { NoSelect, Render } from './render.ts'
import type { Walk } from './walk.ts'

/** `never` for a query KQL can never answer. */
export type Result<Q, S extends Schema = KirbySchema> = Possible<Evaluate<Q, S>>

/**
 * What `client.query` accepts for the query `Q`: `Q` itself, or, for a query
 * KQL can never answer, the message naming the problem, so that the query
 * fails to compile.
 */
export type Checked<Q, S extends Schema> = [Problem<Evaluate<Q, S>>] extends [never] ? Q : Problem<Evaluate<Q, S>>

/** Evaluates a query, at the top or nested inside an object of class `Surrounding`. */
export type Evaluate<Q, S extends Schema, Surrounding extends string = never> = Render<
	Walk<Parse<QueryStringOf<Q>>, S, Surrounding>,
	SelectOf<Q>,
	S,
	HasPagination<Q>
>

/**
 * True if `Holder` (a query, or the `options` of a select without a query
 * string) has a pagination. KQL ignores an empty one.
 */
export type HasPagination<Holder> = Holder extends { pagination: infer P extends object }
	? [keyof P] extends [never]
		? false
		: true
	: false

/** KQL starts at `site` when the query string is left out. */
type QueryStringOf<Q> = Q extends { query: infer QS extends string } ? QS : 'site'

type SelectOf<Q> = Q extends { select: infer Sel } ? Sel : NoSelect
