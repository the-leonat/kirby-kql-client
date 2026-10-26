/**
 * Impossible queries: queries KQL can never answer. Each one is a compile
 * error at the query and has the result type `never`
 * (test/types/impossible.test.ts), and the test site rejects it with a
 * `KqlError` (test/runtime/client.test.ts).
 *
 * They live outside test/queries because there is no result to record.
 */
import { kql } from '../src/index.ts'

/** `nothing` is no root of the schema. */
export const unknownRoot = kql({ query: 'nothing.title' })
