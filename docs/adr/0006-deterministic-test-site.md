# 0006 The test site is deterministic

## Context

The drift check (`pnpm ci:drift`) fails when re-recording changes any committed file. Kirby writes `Uuid:` fields into content on first read, media URLs embed a token salted with the content root and the file's mtime, and URLs embed the host and port.

## Decision

The test site has a fixed base URL (`http://kql-test-site.example`) and a fixed content salt in its config; `pnpm record` sets every content file's mtime to a fixed date; every page and file has a pre-set 16-character uuid committed in its content file.

## Consequences

Fixtures are the same on every checkout, path and port. New test site content must come with its uuids set, or the first recording writes them and the drift check fails.
