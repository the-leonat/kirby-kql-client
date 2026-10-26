/** Thrown for every failed query. */
export class KqlError extends Error {
    name = 'KqlError';
    /** The HTTP status, or 0 when no response arrived. */
    status;
    /**
     * KQL's error code, or the HTTP status when KQL sent none.
     * `'network-error'` when no response arrived, `'invalid-json'` when the
     * response was not JSON, `'invalid-response'` when it was JSON but not an
     * object.
     */
    code;
    constructor(status, code, message, options) {
        super(message, options);
        this.status = status;
        this.code = code;
    }
}
/**
 * Creates a client. Pass a schema extension as the type parameter to type the
 * methods and classes your plugins add; each client keeps its own.
 *
 *   const client = createClient<MyExtension>({ url: 'https://example.com/api/query' })
 */
export function createClient(config) {
    const fetch = config.fetch ?? globalThis.fetch;
    const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...authorizationHeader(config.auth),
        ...(config.language === undefined ? {} : { 'X-Language': config.language }),
        ...config.headers,
    };
    return {
        async query(query) {
            let response;
            try {
                response = await fetch(config.url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(query),
                });
            }
            catch (error) {
                throw new KqlError(0, 'network-error', errorMessage(error), { cause: error });
            }
            let body;
            try {
                body = await response.json();
            }
            catch (error) {
                throw new KqlError(response.status, 'invalid-json', `The KQL endpoint did not answer with JSON (HTTP ${response.status})`, { cause: error });
            }
            if (typeof body !== 'object' || body === null || Array.isArray(body)) {
                throw new KqlError(response.status, 'invalid-response', `The KQL endpoint did not answer with a JSON object (HTTP ${response.status})`);
            }
            if (!response.ok || body.status === 'error') {
                // kirby-headless answers a rejected token with only `{ code, status: 'Unauthorized' }`.
                const message = body.message ?? (body.status === 'error' ? undefined : body.status);
                throw new KqlError(response.status, body.code ?? response.status, message ?? response.statusText);
            }
            // kirby-headless leaves `result` out when it is null.
            return body.result ?? null;
        },
    };
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function authorizationHeader(auth) {
    if (auth === undefined)
        return {};
    if ('token' in auth)
        return { Authorization: `Bearer ${auth.token}` };
    return { Authorization: `Basic ${base64(`${auth.email}:${auth.password}`)}` };
}
/** Base64 of the UTF-8 bytes of `text`, without Node's `Buffer`. */
function base64(text) {
    let binary = '';
    for (const byte of new TextEncoder().encode(text))
        binary += String.fromCharCode(byte);
    return btoa(binary);
}
