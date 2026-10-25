<?php

namespace KqlTest;

use Kirby\Cms\Page;
use Kirby\Cms\Pages;

/** Figures about a collection of pages. KQL reaches it through StatsInterceptor. */
class Stats
{
	public function __construct(protected Pages $pages)
	{
	}

	public function count(): int
	{
		return $this->pages->count();
	}

	/** @return string[] */
	public function titles(): array
	{
		return array_values(array_map(fn (Page $page) => $page->title()->value(), $this->pages->data()));
	}

	/** The page with the longest title, or null for no pages. */
	public function longest(): Page|null
	{
		$longest = null;
		foreach ($this->pages as $page) {
			if ($longest === null || mb_strlen($page->title()->value()) > mb_strlen($longest->title()->value())) {
				$longest = $page;
			}
		}
		return $longest;
	}
}
