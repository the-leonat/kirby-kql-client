# 0003 Unknown keys on blocks and structure items are content fields

## Context

Kirby's `__call` fallback reads an unknown key as a content field on pages, sites, files and users, and also on blocks and structure items. On layouts and layout columns an unknown key is a 500. Allowed methods that don't apply fall back the same way (`file.width` on a non-image gives `""`).

## Decision

The schema generator marks `block` and `structureItem` `model: true`, like page, site, file and user, so an unknown key on them gives `'field'` (a string). Other classes give `unknown` for an unknown key.

## Consequences

Block and structure item fields can be selected by name (`block.heading`). A plugin method on these classes that no schema extension describes is typed `string`, which the README lists as the content field limitation.
