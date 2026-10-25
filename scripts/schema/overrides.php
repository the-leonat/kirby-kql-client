<?php

/**
 * Hand-written return types, for methods whose PHP return type and docblock
 * `@return` are missing or wrong for KQL.
 *
 * An override wins over the PHP type and the docblock. Types are written like a
 * docblock type, read in the context of the class in the key: `static`, `self`,
 * template names such as `TValue`, class names (fully qualified or as imported in
 * that class's file), `string[]`, `array<string, string>`, `X|null`.
 *
 * - methods: `Class::method` => type, or ['return' => type, 'overloads' => [argument count => type]].
 *   The key matches the interceptor, the Kirby class, their parents and traits;
 *   the first match from the most specific class wins. `Interceptor::toResponse`
 *   or `Interceptor::toArray` sets the render type of that interceptor's class.
 * - roots: query string root name => type.
 *
 * Every override names the test query that proves it. An override whose test
 * query does not exist yet names the ticket that adds it.
 */
return [
	'roots' => [
		// Test query: fields/homeBasics.
		// Kirby returns null for a missing page (`Page|null`), but no test query
		// shows it yet. Until #6 decides how nullable roots are verified, the
		// root stays non-null.
		'page' => '\Kirby\Cms\Page',
	],

	'methods' => [
		// Test query: fields/homeBasics (a content field renders as its string value).
		'Kirby\Kql\Interceptors\Content\Field::toResponse' => 'string',

		// Test query: added by #8 (a collection without a select renders its keys, the ids).
		'Kirby\Kql\Interceptors\Cms\Collection::toArray' => 'string[]',

		// Test query: added by #7 (`find` with one id gives one item or null,
		// with several ids a collection).
		'Kirby\Toolkit\Collection::find' => [
			'return'    => 'static',
			'overloads' => [1 => 'TValue|null'],
		],

		// Test query: added by #7 (`page.find` / `site.find` with one id gives
		// one page or null, with several ids pages).
		'Kirby\Cms\HasChildren::find' => [
			'return'    => '\Kirby\Cms\Pages',
			'overloads' => [1 => '\Kirby\Cms\Page|null'],
		],
	],
];
