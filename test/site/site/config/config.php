<?php

/**
 * The test site answers test queries through KQL's own `/api/query` route,
 * authenticated with Basic auth. `allowInsecure` permits Basic auth over
 * plain HTTP, which the local PHP server needs.
 */
return [
	'debug' => true,
	'api' => [
		'basicAuth'     => true,
		'allowInsecure' => true,
	],
];
