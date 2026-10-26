<?php

/**
 * The test site answers test queries through KQL's own `/api/query` route,
 * authenticated with Basic auth. `allowInsecure` permits Basic auth over
 * plain HTTP, which the local PHP server needs.
 *
 * `kirby-headless` adds a second KQL route, `/api/kql`, authenticated with a
 * Bearer token (`kql.auth => 'bearer'` plus `headless.token`). KQL's own
 * route keeps Basic auth: it only turns auth off for `kql.auth => false`.
 */
return [
	'debug' => true,
	// Fixtures contain URLs (default fields of pages, files and the site). A
	// fixed base URL keeps them independent of the port the test site runs on,
	// and a fixed salt keeps the token in media URLs independent of the
	// checkout path (Kirby salts it with the content root by default). The
	// other part of a media URL, the file's mtime, is fixed by `pnpm record`.
	'url' => 'http://kql-test-site.example',
	'content' => [
		'salt' => 'kql-test-site',
	],
	// The srcset presets the anorak test queries name (`file.srcset('award')`).
	// Kirby gives `null` for a preset that isn't configured.
	'thumbs' => [
		'srcsets' => [
			'default' => [
				'400w' => ['width' => 400, 'format' => 'webp'],
				'800w' => ['width' => 800, 'format' => 'webp'],
			],
			'award' => [
				'100w' => ['width' => 100, 'format' => 'webp'],
				'200w' => ['width' => 200, 'format' => 'webp'],
			],
		],
	],
	'api' => [
		'basicAuth'     => true,
		'allowInsecure' => true,
	],
	// The error test queries log in with wrong credentials on every run. Kirby
	// would block the test user's IP after 10 failed logins an hour.
	'auth' => [
		'trials' => 1000000,
	],
	'kql' => [
		'auth' => 'bearer',
		// The test plugin's own class (site/plugins/kql-test).
		'interceptors' => [
			'KqlTest\Stats' => 'KqlTest\StatsInterceptor',
		],
		// KQL blocks `paginate()` by default (403). The pagination test queries
		// need it in the query string, so it is allowed on pages only: on files
		// and users it stays blocked (test/runtime/client.test.ts).
		// kirby-meta's `page.meta` is allowed for the anorak test queries as
		// anorak allows it: the page method here, its class below (KQL has no
		// interceptor for it).
		'methods' => [
			'allowed' => [
				'Kirby\Cms\Pages::paginate',
				'Kirby\Cms\Page::meta',
			],
		],
		'classes' => [
			'allowed' => ['FabianMichael\Meta\PageMeta'],
		],
	],
	'headless' => [
		'token' => 'kql-test-token',
	],
];
