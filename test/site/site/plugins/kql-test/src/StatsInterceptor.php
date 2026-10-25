<?php

namespace KqlTest;

use Kirby\Kql\Interceptor;

/** The `stats` class for KQL; mapped to Stats in the test site's `kql.interceptors` config. */
class StatsInterceptor extends Interceptor
{
	public const CLASS_ALIAS = 'stats';

	protected $toArray = [
		'count',
		'titles',
	];

	public function allowedMethods(): array
	{
		return [
			'count',
			'longest',
			'titles',
		];
	}
}
