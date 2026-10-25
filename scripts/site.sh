#!/usr/bin/env bash
# Serves the test site with PHP's built-in server, on the origin the tests and
# `pnpm record` use: `testSiteOrigin` in test/test-site.ts, which is
# KQL_TEST_ORIGIN or its default. That file is the only place the default
# lives.
#
# Usage: pnpm site
#        KQL_TEST_ORIGIN=http://localhost:8775 pnpm site
set -euo pipefail

cd "$(dirname "$0")/.."

origin="$(node --input-type=module -e "const { testSiteOrigin } = await import('./test/test-site.ts'); console.log(testSiteOrigin)")"
host_port="${origin#*://}"
host_port="${host_port%%/*}"

echo "Serving the test site on $origin"
exec php -S "$host_port" -t test/site test/site/kirby/router.php
