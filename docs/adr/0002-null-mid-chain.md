# 0002 A method on null is an error; `?.` ends the query string with null

## Context

KQL answers 400 (`Access to method/property "x" on null`) when a query string calls a method on an empty value. With `?.`, Kirby's query parser stops at the empty value and the whole query string gives `null`. `page('…')` gives `null` for a missing page.

## Decision

The `page` root is `'page' | null`. A step reached with `.` drops the `null` of the value before it (KQL would have thrown); a step reached with `?.` on a nullable value makes the whole result `| null`. Both rules live in `src/types/walk.ts`; the 400 is proven by runtime tests, the `null` by test queries with cases.

## Consequences

`page('x').children` is typed `pages`, not nullable: a missing page surfaces as a thrown `KqlError`, not as `null`. Every top-level `page('…')` test query needs a missing-page case.
