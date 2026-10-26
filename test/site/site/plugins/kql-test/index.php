<?php

/**
 * The test plugin: one field method, one page method and one collection method,
 * each allowed for KQL, a class of its own (`stats`) with its interceptor,
 * registered in the test site's `kql.interceptors` config, and a root
 * (`pluginPage(…)`).
 *
 * The schema generator leaves all of this out of the base schema. Test queries
 * prove how it is typed without and with a schema extension.
 */

use Kirby\Cms\App;
use Kirby\Cms\Page;
use Kirby\Content\Field;
use Kirby\Query\Query;
use Kirby\Toolkit\Str;

require_once __DIR__ . '/src/Stats.php';
require_once __DIR__ . '/src/StatsInterceptor.php';

/**
 * A root of its own: `pluginPage('filled')` gives the child `filled` of the
 * page `plugin`, or null.
 */
Query::$entries['pluginPage'] = function (string $slug): Page|null {
	return page('plugin/' . $slug);
};

App::plugin('kql-client/kql-test', [
	'fieldMethods' => [
		// KQL allows every registered field method, no `@kql-allowed` needed.
		'shout' => function (Field $field): Field {
			return new Field($field->parent(), $field->key(), Str::upper($field->value()));
		},
	],
	'pageMethods' => [
		/**
		 * Minutes to read the page's text, at 200 words a minute.
		 * @kql-allowed
		 */
		'readingTime' => function (): int {
			return (int)ceil(str_word_count($this->text()->value()) / 200);
		},
	],
	'pagesMethods' => [
		/**
		 * Figures about the pages.
		 * @kql-allowed
		 */
		'stats' => function (): KqlTest\Stats {
			return new KqlTest\Stats($this);
		},
	],
]);
