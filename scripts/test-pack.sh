#!/usr/bin/env bash
# The pack test: proves that the packed tarball installs and type-checks in a
# fresh project.
#
#   1. packs the package with `pnpm pack` (its `prepack` builds it) and checks
#      what the tarball holds
#   2. creates a fresh project in a temp dir and installs the tarball, plus
#      TypeScript 5.4 (the oldest supported) and the TypeScript this repo uses
#   3. copies test/pack/consumer.ts and every ```ts example of README.md into it
#   4. type-checks them with both TypeScript versions, against the published
#      declarations (no skipLibCheck), under NodeNext and Bundler resolution
#
# Nothing is published. Needs network access to install TypeScript.
#
# Usage: pnpm test:pack
set -euo pipefail

cd "$(dirname "$0")/.."
repo="$PWD"

current_ts="$(node -p "require('./node_modules/typescript/package.json').version")"
oldest_ts="5.4"

# PACK_TEST_DIR keeps the fresh project for a look afterwards; it is emptied first.
if [ -n "${PACK_TEST_DIR:-}" ]; then
	tmp="$PACK_TEST_DIR"
	rm -rf "$tmp"
	mkdir -p "$tmp"
else
	tmp="$(mktemp -d)"
	trap 'rm -rf "$tmp"' EXIT
fi

# `prepack` builds dist/ from scratch.
pnpm pack --pack-destination "$tmp" >/dev/null
tarball="$(ls "$tmp"/kirby-kql-client-*.tgz)"

# The tarball holds the build, the README and the license, and nothing else.
unexpected="$(tar -tzf "$tarball" | grep -Ev '^package/(dist/.*\.(js|d\.ts)|package\.json|README\.md|LICENSE)$' || true)"
if [ -n "$unexpected" ]; then
	echo "Unexpected files in the tarball:" >&2
	echo "$unexpected" >&2
	exit 1
fi
for file in package/LICENSE package/README.md package/dist/index.js package/dist/index.d.ts; do
	tar -tzf "$tarball" | grep -qx "$file" || { echo "Missing from the tarball: $file" >&2; exit 1; }
done

project="$tmp/consumer"
mkdir -p "$project"
cp "$repo/test/pack/consumer.ts" "$project/"
node "$repo/scripts/readme-examples.ts" "$repo/README.md" "$project/readme"

cat >"$project/package.json" <<'JSON'
{ "name": "consumer", "private": true, "type": "module" }
JSON

# Strict, as most projects are, and without skipLibCheck, so the package's
# own declarations are checked too.
cat >"$project/tsconfig.nodenext.json" <<'JSON'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "types": []
  },
  "include": ["*.ts", "readme/*.ts"]
}
JSON
cat >"$project/tsconfig.bundler.json" <<'JSON'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "types": []
  },
  "include": ["*.ts", "readme/*.ts"]
}
JSON

(
	cd "$project"
	pnpm add --ignore-workspace --silent \
		"$tarball" "ts-oldest@npm:typescript@$oldest_ts" "ts-current@npm:typescript@$current_ts"

	# The package itself must have no runtime dependencies.
	node -e "
		const pkg = require('./node_modules/kirby-kql-client/package.json')
		const deps = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies })
		if (deps.length) { console.error('Runtime dependencies:', deps); process.exit(1) }
	"

	for ts in ts-oldest ts-current; do
		version="$(node -p "require('./node_modules/$ts/package.json').version")"
		for config in nodenext bundler; do
			echo "TypeScript $version, $config"
			"./node_modules/$ts/bin/tsc" -p "tsconfig.$config.json"
		done
	done

	# The build runs as ESM in Node and exports what its types say.
	node --input-type=module -e "
		const pkg = await import('kirby-kql-client')
		const names = Object.keys(pkg).sort().join(', ')
		if (names !== 'KqlError, createClient, kql') { console.error('Runtime exports:', names); process.exit(1) }
	"
)
echo "The packed package installs and type-checks."
