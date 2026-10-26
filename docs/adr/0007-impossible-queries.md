# 0007 An impossible query is a compile error with the result `never`; `strict` is opt-in

## Context

Some queries KQL can never answer: a query string that doesn't parse, a root no schema declares, a method on a string, number or boolean. KQL rejects them with a 400. They used to compile and degrade to `unknown`, so the mistake only showed at runtime as a `KqlError`.

Typing them `never` alone is not enough: `never` is assignable to everything, so `const title: string = await client.query(…)` compiles silently. An unknown method on a class without content fields (an unknown method) is different: it may be a plugin's method the schema extension doesn't describe yet, and #1 promised it would type as `unknown` (user story 31).

## Decision

The type layers give Impossible, with a message, where a query can't be answered. It carries forward through the query string and through selects: one impossible query string anywhere makes the whole query impossible, since KQL rejects the whole request. `Result` turns it into `never`, and `client.query` takes `Q & Checked<Q, S>`, which for an impossible query requires a property `'Impossible query'` holding the message. So the error shows at the query and names the problem, and `never` is the result type behind it.

A method on a value that is a scalar only sometimes (`'field' | number`) is not impossible: the other members decide. An empty query string is not impossible either: KQL answers it.

`createClient({ …, strict: true })` types its queries on a `StrictSchema`, where an unknown method is impossible too. It is opt-in, so that undescribed plugin methods keep typing as `unknown` by default.

## Consequences

- A typo in a root, an unbalanced bracket or a method on a string fails to compile. Content fields still take any key, typos included, because KQL answers them.
- A query whose impossible part sits under a missing page or an empty collection is typed `never` although KQL answers `null` or `[]` there: it fails for every value it was written for.
- `Result` is `never` for an impossible query, but only `client.query` reports the error; a query defined with `kql()` is checked where it is sent.
- Knowing whether a query is possible means walking every nested query string when the query is sent, where before nested results were only computed when read. Over the test queries this costs about 30% more type instantiations (610k to 787k) and about 0.05 s of check time on TypeScript 7. Checking in the return type instead of the parameter would not help: the parameter check itself costs under 1%; the cost is in finding out.
- A plugin's root must be declared in the schema extension's `roots`. The schema generator leaves plugin roots out of the base schema, as it does plugin methods.
