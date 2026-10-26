import type { KirbySchema } from './kirby-schema.ts'
import type { Query } from './query.ts'
import type { ExtendSchema, Schema, SchemaExtension, StrictSchema } from './schema.ts'
import type { Checked, Result } from './types/result.ts'

export interface ClientConfig {
	/** The full URL of the KQL endpoint, e.g. `https://example.com/api/query`. */
	url: string
	/** `{ token }` sends a Bearer token, `{ email, password }` sends Basic auth. */
	auth?: { token: string } | { email: string; password: string }
	/** Defaults to the platform's `fetch`. */
	fetch?: typeof globalThis.fetch
	/** Extra headers sent with every query. */
	headers?: Record<string, string>
	/** The content language, sent as `X-Language`. */
	language?: string
	/**
	 * Makes an unknown method (on a class without content fields, described by
	 * neither the schema nor the schema extension) a compile error at the
	 * query, with the result type `never`, instead of `unknown`. Types only:
	 * pass it as the literal `true`.
	 */
	strict?: boolean
}

/** A client whose results are typed by the schema `S`. */
export interface Client<S extends Schema = KirbySchema> {
	/** A query KQL can never answer fails to compile, and its result type is `never`. */
	query<const Q extends Query>(query: Q & Checked<Q, S>): Promise<Result<Q, S>>
}

/** The schema for Kirby and KQL with a schema extension deep-merged into it. */
export type ExtendedSchema<Extension extends SchemaExtension> = ExtendSchema<KirbySchema, Extension>

/** Thrown for every failed query. */
export class KqlError extends Error {
	override name = 'KqlError'
	/** The HTTP status, or 0 when no response arrived. */
	readonly status: number
	/**
	 * KQL's error code, or the HTTP status when KQL sent none.
	 * `'network-error'` when no response arrived, `'invalid-json'` when the
	 * response was not JSON, `'invalid-response'` when it was JSON but not an
	 * object.
	 */
	readonly code: number | string

	constructor(status: number, code: number | string, message: string, options?: ErrorOptions) {
		super(message, options)
		this.status = status
		this.code = code
	}
}

/**
 * Creates a client. Pass a schema extension as the type parameter to type the
 * roots, methods and classes your plugins add; each client keeps its own.
 *
 *   const client = createClient<MyExtension>({ url: 'https://example.com/api/query' })
 *
 * With `strict: true`, an unknown method is a compile error instead of `unknown`.
 */
export function createClient<Extension extends SchemaExtension = {}>(
	config: ClientConfig & { strict: true },
): Client<StrictSchema<ExtendedSchema<Extension>>>
export function createClient<Extension extends SchemaExtension = {}>(
	config: ClientConfig,
): Client<ExtendedSchema<Extension>>
export function createClient(config: ClientConfig): Client<any> {
	const fetch = config.fetch ?? globalThis.fetch
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Accept: 'application/json',
		...authorizationHeader(config.auth),
		...(config.language === undefined ? {} : { 'X-Language': config.language }),
		...config.headers,
	}

	return {
		async query(query) {
			let response: Response
			try {
				response = await fetch(config.url, {
					method: 'POST',
					headers,
					body: JSON.stringify(query),
				})
			} catch (error) {
				throw new KqlError(0, 'network-error', errorMessage(error), { cause: error })
			}
			let body
			try {
				body = await response.json()
			} catch (error) {
				throw new KqlError(
					response.status,
					'invalid-json',
					`The KQL endpoint did not answer with JSON (HTTP ${response.status})`,
					{ cause: error },
				)
			}
			if (typeof body !== 'object' || body === null || Array.isArray(body)) {
				throw new KqlError(
					response.status,
					'invalid-response',
					`The KQL endpoint did not answer with a JSON object (HTTP ${response.status})`,
				)
			}
			if (!response.ok || body.status === 'error') {
				// kirby-headless answers a rejected token with only `{ code, status: 'Unauthorized' }`.
				const message = body.message ?? (body.status === 'error' ? undefined : body.status)
				throw new KqlError(
					response.status,
					body.code ?? response.status,
					message ?? response.statusText,
				)
			}
			// kirby-headless leaves `result` out when it is null.
			return body.result ?? null
		},
	}
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}

function authorizationHeader(auth: ClientConfig['auth']): Record<string, string> {
	if (auth === undefined) return {}
	if ('token' in auth) return { Authorization: `Bearer ${auth.token}` }
	return { Authorization: `Basic ${base64(`${auth.email}:${auth.password}`)}` }
}

/** Base64 of the UTF-8 bytes of `text`, without Node's `Buffer`. */
function base64(text: string): string {
	let binary = ''
	for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte)
	return btoa(binary)
}
