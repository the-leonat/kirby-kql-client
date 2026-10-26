// The public API. Everything else (the type layers, the generated schema,
// the select and pagination shapes) is internal and may change.
export { createClient, KqlError } from './client.js';
export { kql } from './query.js';
