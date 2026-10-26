/**
 * Impossible: what a query KQL can never answer gives, in place of a value,
 * with the problem as its message. It travels up unchanged: a method on it, a
 * select on it and a select that contains it are impossible too, and one
 * impossible query string makes the whole query impossible, because KQL
 * rejects the whole request.
 *
 * At the top, `Result` turns it into `never`, and `client.query` accepts the
 * message instead of the query, so the query fails to compile.
 */
declare const problem: unique symbol

export interface Impossible<Message extends string = string> {
	[problem]: Message
}

/** The message of each impossible member of `R`; `never` if there is none. */
export type Problem<R> = R extends Impossible<infer Message> ? `Impossible query: ${Message}` : never

/** `never` if `R` holds an impossible member, `R` otherwise. */
export type Possible<R> = [Extract<R, Impossible>] extends [never] ? R : never
