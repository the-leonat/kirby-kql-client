# kirby-kql-client

A typed client for the Kirby Query Language (KQL): every query has a result type that matches exactly what the KQL endpoint returns.

## Queries and results

**Query**:
A request object sent to the KQL endpoint, made of a query string and an optional select.
_Avoid_: Request, KQL object

**Query string**:
The dotted method chain inside a query, such as `page.director.toPage`, read from left to right starting at a class.
_Avoid_: Path, expression

**Select**:
The part of a query that picks which keys of the current value appear in the result, given as a record, a list of keys, or a comma-separated string.
_Avoid_: Fields, projection

**Result**:
The JSON value the KQL endpoint returns for a query, and the type the client assigns to it.
_Avoid_: Response, data

**Default fields**:
The keys a class renders when a query selects nothing from it.
_Avoid_: toArray fields, default select

## Schema

**Schema**:
The description of everything KQL can reach: its classes, each class's methods and what they return, and each class's default fields.
_Avoid_: Registry, type map, manifest

**Class**:
One kind of value in the schema, named by its KQL alias, such as `page`, `files`, `field` or `block`.
_Avoid_: Model, type, interceptor

**Content field**:
A key on a page, site, file or user that is not a method, and therefore reads that model's stored content as a string.
_Avoid_: Custom field, blueprint field

**Schema extension**:
Classes and methods a project adds to the schema to describe what its plugins provide.
_Avoid_: Custom types, plugin types, registration

**Unknown method**:
A method on a class other than page, site, file or user that neither the schema nor a schema extension describes; its result, and everything after it in the query string, is unknown. On those four classes the same key is a content field instead.
_Avoid_: Custom method, unregistered method

## Verification

**Test site**:
The small Kirby installation inside this repo that exists only to answer test queries and to generate the schema from.
_Avoid_: Demo instance, demo site, backend

**Test query**:
A query kept in the repo whose result type is checked against what the test site really returns.
_Avoid_: Example query, sample

**Case**:
One of several queries that make up a single test query, such as the same query on filled and on empty content. Every case must have the same result type, and it must equal the observed type of all their fixtures merged.
_Avoid_: Variant, scenario

**Fixture**:
The recorded result of one test query from the test site.
_Avoid_: Snapshot, recording, response
