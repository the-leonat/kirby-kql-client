import type { Query } from './query.ts'
import type { Result } from './types/result.ts'

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
}

export interface Client {
	query<const Q extends Query>(query: Q): Promise<Result<Q>>
}

/** Thrown for every failed query. */
export class KqlError extends Error {
	override name = 'KqlError'
	/** The HTTP status, or 0 when no response arrived. */
	readonly status: number
	/**
	 * KQL's error code, or the HTTP status when KQL sent none.
	 * `'network-error'` when no response arrived, `'invalid-json'` when the
	 * response was not JSON.
	 */
	readonly code: number | string

	constructor(status: number, code: number | string, message: string, options?: ErrorOptions) {
		super(message, options)
		this.status = status
		this.code = code
	}
}

export function createClient(config: ClientConfig): Client {
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
