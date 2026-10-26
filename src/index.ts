// The public API. Everything else (the type layers, the generated schema,
// the select and pagination shapes) is internal and may change.
export { createClient, KqlError } from './client.ts'
export type { Client, ClientConfig, ExtendedSchema } from './client.ts'
export { kql } from './query.ts'
export type { Query } from './query.ts'
export type { Result } from './types/result.ts'
export type { PaginationInfo } from './types/render.ts'
export type { Schema, SchemaExtension, StrictSchema } from './schema.ts'
export type { Block, BlockType } from './types/blocks.ts'
