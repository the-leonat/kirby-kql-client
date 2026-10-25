# 0001 paginate() is typed, but works only where the site allows it

## Context

KQL blocks `paginate()` in a query string by default (403). It is not in the generated schema, because the schema generator follows KQL's allow-list, not a site's config.

## Decision

`paginate(…)` on any collection class gives that collection paginated through a rule in `src/types/walk.ts`, not through schema data. The test site allows it on pages only (`kql.methods.allowed => ['Kirby\Cms\Pages::paginate']`), the narrowest entry the pagination test queries need; on files and users it stays blocked, which a runtime test proves.

## Consequences

Sites that use `paginate()` must allow it themselves (the README shows how). Against a site that doesn't, a query with `paginate()` is typed as paginated but throws a `KqlError` 403. The README recommends the `pagination` key instead.
