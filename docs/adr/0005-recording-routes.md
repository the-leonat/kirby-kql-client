# 0005 Fixtures are recorded through KQL's route, except the headless and anorak groups

## Context

KQL serves `/api/query` with Kirby's API auth (Basic on the test site); kirby-headless serves `/api/kql` with a Bearer token and a slightly different envelope (status `"OK"`, `result` left out when null). Anorak, the first project to use this client, queries through kirby-headless.

## Decision

`pnpm record` records each group of test queries through `testSite` (`/api/query`, Basic auth), except the groups listed in `testSiteByGroup` in `test/test-site.ts`: `headless` and `anorak` go through `headlessTestSite` (`/api/kql`, Bearer token).

## Consequences

Both routes and both auth schemes are proven end to end, and anorak's queries are proven on the route anorak uses. A new group recorded through another endpoint must be added to `testSiteByGroup`.
