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
	],
	'headless' => [
		'token' => 'kql-test-token',
	],
];
