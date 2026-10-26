/**
 * Defines a query outside a `query()` call while keeping its exact type,
 * so it can live in its own module and be reused.
 */
export function kql(query) {
    return query;
}
