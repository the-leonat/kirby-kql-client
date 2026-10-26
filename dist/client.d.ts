import type { KirbySchema } from './kirby-schema.ts';
import type { Query } from './query.ts';
import type { ExtendSchema, Schema, SchemaExtension } from './schema.ts';
import type { Result } from './types/result.ts';
export interface ClientConfig {
    /** The full URL of the KQL endpoint, e.g. `https://example.com/api/query`. */
    url: string;
    /** `{ token }` sends a Bearer token, `{ email, password }` sends Basic auth. */
    auth?: {
        token: string;
    } | {
        email: string;
        password: string;
    };
    /** Defaults to the platform's `fetch`. */
    fetch?: typeof globalThis.fetch;
    /** Extra headers sent with every query. */
    headers?: Record<string, string>;
    /** The content language, sent as `X-Language`. */
    language?: string;
}
/** A client whose results are typed by the schema `S`. */
export interface Client<S extends Schema = KirbySchema> {
    query<const Q extends Query>(query: Q): Promise<Result<Q, S>>;
}
/** The schema for Kirby and KQL with a schema extension deep-merged into it. */
export type ExtendedSchema<Extension extends SchemaExtension> = ExtendSchema<KirbySchema, Extension>;
/** Thrown for every failed query. */
export declare class KqlError extends Error {
    name: string;
    /** The HTTP status, or 0 when no response arrived. */
    readonly status: number;
    /**
     * KQL's error code, or the HTTP status when KQL sent none.
     * `'network-error'` when no response arrived, `'invalid-json'` when the
     * response was not JSON, `'invalid-response'` when it was JSON but not an
     * object.
     */
    readonly code: number | string;
    constructor(status: number, code: number | string, message: string, options?: ErrorOptions);
}
/**
 * Creates a client. Pass a schema extension as the type parameter to type the
 * methods and classes your plugins add; each client keeps its own.
 *
 *   const client = createClient<MyExtension>({ url: 'https://example.com/api/query' })
 */
export declare function createClient<Extension extends SchemaExtension = {}>(config: ClientConfig): Client<ExtendedSchema<Extension>>;
