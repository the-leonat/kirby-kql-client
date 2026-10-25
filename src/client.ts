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
	/** KQL's error code, or the HTTP status when KQL sent none. */
	readonly code: number | string

	constructor(status: number, code: number | string, message: string) {
		super(message)
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
			const response = await fetch(config.url, {
				method: 'POST',
				headers,
				body: JSON.stringify(query),
			})
			const body = await response.json()
			if (!response.ok || body.status === 'error') {
				throw new KqlError(response.status, body.code ?? response.status, body.message)
			}
			return body.result
		},
	}
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
