# 0004 Fixtures are compared exactly, with cases and widened index signatures

## Context

Every test query's result type must equal the type observed in its fixture. A single recording can't show `null`, or both an empty and a filled list, and content-keyed records (a page's `content`, a structure item's fields) have keys no type can list.

## Decision

A test query may be a list of queries, its cases. The fixture holds every case's result, their observed types are merged like list items, and every case's result type must equal the merged type. Where the result type has a string index signature, the observed object is compared as that index signature with its values merged (`WidenToIndex` in `test/types/check.ts`).

The comparison goes key by key (`DeepEqual`): objects by their keys, each with its optionality and readonly, then each key's values; lists by their items; a union by its members, each object member paired with an object member on the other side. A single `Equal` of the whole type is not enough: TypeScript stops comparing nested types of one recursive generic type after a few levels and assumes the rest identical, without an error. Whether it stops depends on how the result type is built: until a select checked its entries for impossible query strings, which changed how its shape is built, `Equal` missed a film's videos lacking `null` in `layoutBuilder` (fixed by adding a film without videos to the test site), and a `string | null` seven objects deep in `directorPage` (the canary in `test/types/check.test.ts`). Key by key, no single comparison is deep.

## Consequences

Nullable and list results are proven by adding empty or missing cases. The index-signature widening is a deliberate relaxation: concrete content keys are not checked, only the type of their values. Comparing key by key costs about 70% more type instantiations in the type tests (1.09M to 1.89M) and about 0.2 s of check time on TypeScript 7.
