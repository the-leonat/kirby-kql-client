/** A query: a query string plus an optional select and pagination. */
export interface Query {
	/** The query string. KQL starts at `site` when it is left out. */
	query?: string
	select?: Select
	pagination?: Pagination
}

export interface Pagination {
	limit?: number
	page?: number
}

/** A record of keys, a list of keys, or a comma-separated string of keys. */
export type Select = string | readonly string[] | { readonly [key: string]: SelectEntry }

/**
 * `true` reads the key from the current object, `false` leaves it out, a string
 * is a query string, and an object is a nested query or a select without a
 * query string.
 */
export type SelectEntry = boolean | string | Query

/**
 * Defines a query outside a `query()` call while keeping its exact type,
 * so it can live in its own module and be reused.
 */
export function kql<const Q extends Query>(query: Q): Q {
	return query
}
