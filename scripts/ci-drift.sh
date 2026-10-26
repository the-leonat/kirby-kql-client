#!/usr/bin/env bash
# The drift check: proves that the committed schema and fixtures are exactly
# what the test site produces today.
#
#   1. installs the test site (Composer, pinned by test/site/composer.lock)
#   2. regenerates the schema (src/kirby-schema.ts)
#   3. boots the test site with PHP's built-in server
#   4. re-records every fixture (test/fixtures) and runs the runtime tests
#   5. fails if any of src/kirby-schema.ts, test/fixtures or test/site differs
#      from the committed files, untracked files included
#
# The test site runs on the origin in KQL_TEST_ORIGIN (default: see
# test/test-site.ts), served by scripts/site.sh like `pnpm site`; the port must
# be free.
#
# Usage: pnpm ci:drift
set -euo pipefail

cd "$(dirname "$0")/.."

origin="$(node --input-type=module -e "const { testSiteOrigin } = await import('./test/test-site.ts'); console.log(testSiteOrigin)")"
export KQL_TEST_ORIGIN="$origin"

pnpm site:install
pnpm schema

bash scripts/site.sh >/dev/null 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT

# Ready once /api/query answers at all (401 without credentials).
for _ in $(seq 1 50); do
	if curl -s -o /dev/null -X POST "$origin/api/query"; then break; fi
	if ! kill -0 "$server" 2>/dev/null; then
		echo "The test site did not start on $origin (is the port in use?)" >&2
		exit 1
	fi
	sleep 0.2
done

pnpm record
pnpm test:site

drift="$(git status --porcelain --untracked-files=all -- src/kirby-schema.ts test/fixtures test/site)"
if [ -n "$drift" ]; then
	echo >&2
	echo "Drift: the test site no longer produces the committed files:" >&2
	echo "$drift" >&2
	git --no-pager diff --stat -- src/kirby-schema.ts test/fixtures test/site >&2
	git --no-pager diff -- src/kirby-schema.ts test/fixtures test/site >&2
	echo >&2
	echo "Run 'pnpm ci:drift' locally and commit the result if the change is intended." >&2
	exit 1
fi
echo "No drift."
