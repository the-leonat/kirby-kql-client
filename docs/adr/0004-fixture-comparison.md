# 0004 Fixtures are compared exactly, with cases and widened index signatures

## Context

Every test query's result type must equal the type observed in its fixture. A single recording can't show `null`, or both an empty and a filled list, and content-keyed records (a page's `content`, a structure item's fields) have keys no type can list.

## Decision

A test query may be a list of queries, its cases. The fixture holds every case's result, their observed types are merged like list items, and every case's result type must equal the merged type. Where the result type has a string index signature, the observed object is compared as that index signature with its values merged (`WidenToIndex` in `test/types/check.ts`).

## Consequences

Nullable and list results are proven by adding empty or missing cases. The index-signature widening is a deliberate relaxation: concrete content keys are not checked, only the type of their values.
