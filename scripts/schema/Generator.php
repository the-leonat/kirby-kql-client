<?php

use Kirby\Cms\App;
use Kirby\Cms\Collection as CmsCollection;
use Kirby\Content\Field;
use Kirby\Kql\Interceptor;
use Kirby\Kql\Interceptors\Cms\Model as ModelInterceptor;
use Kirby\Kql\Interceptors\Content\Content as ContentInterceptor;
use Kirby\Query\Query;

/**
 * Reads the schema out of a booted Kirby installation. See generate.php for
 * where each part of the schema comes from.
 *
 * Types are handled as PHP/docblock type strings (`\Kirby\Cms\Page|null`,
 * `TValue|static`, `string[]`) until they are converted to a `Returns`:
 * a union of class names (`'page'`) and JSON types (`string`, `boolean`, …).
 */
class KqlSchemaGenerator
{
	/** alias => ['interceptor' => ReflectionClass, 'core' => ReflectionClass] */
	protected array $classes = [];

	/** every interceptor with the Kirby class it wraps: [[interceptor, core], …] */
	protected array $interceptors = [];

	protected array $templateMaps = [];
	protected array $fileContexts = [];

	public function __construct(protected App $kirby, protected array $overrides)
	{
		$this->collectInterceptors();
	}

	public function kqlVersion(): string
	{
		return $this->kirby->plugin('getkirby/kql')?->version() ?? 'unknown';
	}

	// ---------------------------------------------------------------------
	// Output

	public function typescript(string $header): string
	{
		$schema = $this->schema();
		$ts     = "// $header\n\nexport type KirbySchema = {\n";
		$ts    .= "\troots: " . $this->tsRecord($schema['roots'], 1) . "\n";
		$ts    .= "\tclasses: {\n";

		foreach ($schema['classes'] as $alias => $class) {
			$ts .= "\t\t" . $this->tsKey($alias) . ": {\n";

			if ($class['model'] ?? false) {
				$ts .= "\t\t\tmodel: true\n";
			}

			if (isset($class['item']) === true) {
				$ts .= "\t\t\titem: '" . $class['item'] . "'\n";
			}

			if (isset($class['render']) === true) {
				$ts .= "\t\t\trender: " . $class['render'] . "\n";
			}

			if (isset($class['defaultFields']) === true) {
				$ts .= "\t\t\tdefaultFields: " . $this->tsRecord($class['defaultFields'], 3) . "\n";
			}

			$ts .= "\t\t\tmethods: " . $this->tsRecord($class['methods'], 3) . "\n";

			if (empty($class['overloads']) === false) {
				$ts .= "\t\t\toverloads: {\n";

				foreach ($class['overloads'] as $method => $byCount) {
					$ts .= "\t\t\t\t" . $this->tsKey($method) . ': ' . $this->tsRecord($byCount, 4) . "\n";
				}

				$ts .= "\t\t\t}\n";
			}

			$ts .= "\t\t}\n";
		}

		return $ts . "\t}\n}\n";
	}

	protected function tsRecord(array $record, int $indent): string
	{
		if ($record === []) {
			return '{}';
		}

		$tabs = str_repeat("\t", $indent + 1);
		$ts   = "{\n";

		foreach ($record as $key => $type) {
			$ts .= $tabs . $this->tsKey((string)$key) . ': ' . $type . "\n";
		}

		return $ts . str_repeat("\t", $indent) . '}';
	}

	protected function tsKey(string $key): string
	{
		return preg_match('/^[A-Za-z_$][A-Za-z0-9_$]*$|^[0-9]+$/', $key) ? $key : "'" . addslashes($key) . "'";
	}

	// ---------------------------------------------------------------------
	// Schema

	public function schema(): array
	{
		$classes = [];

		foreach ($this->classes as $alias => $class) {
			$classes[$alias] = $this->classDefinition($class['interceptor'], $class['core']);
		}

		ksort($classes, SORT_STRING);

		return [
			'roots'   => $this->roots(),
			'classes' => $classes,
		];
	}

	protected function roots(): array
	{
		$roots   = [];
		$context = $this->context(new ReflectionClass(Query::class), null, null);

		foreach (Query::$entries as $name => $entry) {
			if (isset($this->overrides['roots'][$name]) === true) {
				$roots[$name] = $this->returns($this->overrides['roots'][$name], $context);
				continue;
			}

			$type = $entry instanceof Closure
				? $this->reflectedType(new ReflectionFunction($entry), $context)
				: $this->returnsOfValue($entry);

			$roots[$name] = $type;
		}

		ksort($roots, SORT_STRING);
		return $roots;
	}

	protected function returnsOfValue(mixed $value): string
	{
		return is_object($value) ? $this->returns('\\' . get_class($value), null) : 'unknown';
	}

	protected function classDefinition(ReflectionClass $interceptor, ReflectionClass $core): array
	{
		$definition = [];

		if ($this->isModel($interceptor, $core) === true) {
			$definition['model'] = true;
		}

		// KQL renders subclasses of Kirby\Cms\Collection as lists
		if ($core->getName() === CmsCollection::class || $core->isSubclassOf(CmsCollection::class)) {
			$item = $this->templateValue($core->getName(), CmsCollection::class, 'TValue');

			if ($item !== null) {
				$aliases = $this->returnsMembers($item, $this->context($core, $core, null));

				if (count($aliases) === 1 && str_starts_with($aliases[0], "'")) {
					$definition['item'] = trim($aliases[0], "'");
				}
			}
		}

		$methods   = [];
		$overloads = [];

		foreach ($this->methodNames($interceptor, $core) as $name) {
			[$returns, $byCount] = $this->methodReturns($name, $interceptor, $core);
			$methods[$name] = $returns;

			if ($byCount !== []) {
				ksort($byCount);
				$overloads[$name] = $byCount;
			}
		}

		ksort($methods, SORT_STRING);
		ksort($overloads, SORT_STRING);

		$render = $this->render($interceptor, $core);

		if ($render !== null) {
			$definition['render'] = $render;
		} else {
			$fields = [];
			$allowed = array_flip(array_keys($methods));

			foreach ($this->defaultFieldNames($interceptor) as $key) {
				if (isset($allowed[$key]) === true) {
					$fields[$key] = $methods[$key];
				}
			}

			if ($fields === []) {
				// Kql::select() of no keys gives an empty PHP array: `[]` in JSON
				$definition['render'] = '[]';
			} else {
				$definition['defaultFields'] = $fields;
			}
		}

		$definition['methods']   = $methods;
		$definition['overloads'] = $overloads;

		return $definition;
	}

	/**
	 * KQL's Model and Content interceptors read unknown keys as content fields
	 * (the Model interceptor only where the Kirby class has content).
	 */
	protected function isModel(ReflectionClass $interceptor, ReflectionClass $core): bool
	{
		if ($interceptor->getName() === ModelInterceptor::class || $interceptor->isSubclassOf(ModelInterceptor::class)) {
			return $core->hasMethod('content');
		}

		return $interceptor->getName() === ContentInterceptor::class || $interceptor->isSubclassOf(ContentInterceptor::class);
	}

	/**
	 * The render type when the interceptor replaces `toResponse` or `toArray`,
	 * `null` when it renders its `$toArray` keys.
	 */
	protected function render(ReflectionClass $interceptor, ReflectionClass $core): string|null
	{
		foreach (['toResponse', 'toArray'] as $name) {
			$method = $interceptor->getMethod($name);

			if ($method->getDeclaringClass()->getName() !== Interceptor::class) {
				$context = $this->context($method->getDeclaringClass(), $core, $method->getFileName());

				return $this->override($method->getDeclaringClass()->getName() . '::' . $name, $context)['return']
					?? $this->reflectedType($method, $context);
			}
		}

		return null;
	}

	protected function defaultFieldNames(ReflectionClass $interceptor): array
	{
		$property = $interceptor->getProperty('toArray');
		return $property->hasDefaultValue() ? ($property->getDefaultValue() ?? []) : [];
	}

	// ---------------------------------------------------------------------
	// Methods

	protected function methodNames(ReflectionClass $interceptor, ReflectionClass $core): array
	{
		$names = [];
		$add   = function (string $name) use (&$names) {
			$names[strtolower($name)] ??= $name;
		};

		$instance = $interceptor->newInstanceWithoutConstructor();

		foreach ($instance->allowedMethods() as $name) {
			$add($name);
		}

		// public methods of the interceptor itself are called directly
		foreach ($interceptor->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
			if (
				$method->isStatic() === false &&
				$method->getDeclaringClass()->getName() !== Interceptor::class &&
				str_starts_with($method->getName(), '__') === false &&
				in_array($method->getName(), ['allowedMethods', 'toArray', 'toResponse'], true) === false
			) {
				$add($method->getName());
			}
		}

		// Kirby methods marked @kql-allowed
		foreach ($core->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
			if (str_contains($method->getDocComment() ?: '', '@kql-allowed') === true) {
				$add($method->getName());
			}
		}

		// custom (plugin) methods: all field methods; others when marked @kql-allowed
		foreach ($this->customMethods($core) as $name => $closure) {
			if ($core->getName() === Field::class || $core->isSubclassOf(Field::class)) {
				$add($name);
			} elseif (str_contains((new ReflectionFunction($closure))->getDocComment() ?: '', '@kql-allowed')) {
				$add($name);
			}
		}

		$names = array_values($names);
		sort($names, SORT_STRING);
		return $names;
	}

	/**
	 * Custom methods that Kirby itself registers on the Kirby class or its parents
	 * (`Field::$methods`, …), with their original spelling where Kirby lowercased
	 * it. Methods registered by plugins are left out.
	 */
	protected function customMethods(ReflectionClass $core): array
	{
		$methods = [];

		foreach ([$core, ...$this->parents($core)] as $class) {
			if ($class->hasProperty('methods') === false || $class->getProperty('methods')->isStatic() === false) {
				continue;
			}

			foreach ($class->getStaticPropertyValue('methods') as $name => $closure) {
				if ($closure instanceof Closure && $this->isKirbyCore($closure)) {
					$methods[$name] ??= $closure;
				}
			}
		}

		if ($core->getName() === Field::class) {
			$spelling = [];

			foreach ($this->kirby->core()->fieldMethods() as $name => $closure) {
				$spelling[strtolower($name)] = $name;
			}

			$spelled = [];

			foreach ($methods as $name => $closure) {
				$spelled[$spelling[$name] ?? $name] = $closure;
			}

			foreach (Field::$aliases as $alias => $target) {
				if (isset($methods[strtolower($target)]) === true) {
					$spelled[$spelling[$alias] ?? $alias] = $methods[strtolower($target)];
				}
			}

			$methods = $spelled;
		}

		ksort($methods, SORT_STRING);
		return $methods;
	}

	protected function isKirbyCore(Closure $closure): bool
	{
		$file = (new ReflectionFunction($closure))->getFileName();
		return $file !== false && str_starts_with($file, $this->kirby->root('kirby') . '/');
	}

	/**
	 * Returns [returns, overloads by argument count] of one method.
	 */
	protected function methodReturns(string $name, ReflectionClass $interceptor, ReflectionClass $core): array
	{
		// 1. a method of the interceptor, 2. a method of the Kirby class
		foreach ([$interceptor, $core] as $class) {
			if ($class->hasMethod($name) === false) {
				continue;
			}

			$method = $class->getMethod($name);

			if ($class === $interceptor && $method->getDeclaringClass()->getName() === Interceptor::class) {
				continue;
			}

			if (str_starts_with($method->getName(), '__') === true) {
				continue;
			}

			$context = $this->context($this->owner($method), $core, $method->getFileName());
			$override = $this->methodOverride($method->getName(), $interceptor, $core);

			if ($override !== null) {
				return [$override['return'] ?? $this->reflectedType($method, $context), $override['overloads']];
			}

			return [$this->reflectedType($method, $context), []];
		}

		// 3. a custom method
		$override = $this->methodOverride($name, $interceptor, $core);

		foreach ($this->customMethods($core) as $customName => $closure) {
			if (strtolower($customName) === strtolower($name)) {
				$function = new ReflectionFunction($closure);
				$context  = $this->context(null, $core, $function->getFileName());

				return [$override['return'] ?? $this->reflectedType($function, $context), $override['overloads'] ?? []];
			}
		}

		if ($override !== null && $override['return'] !== null) {
			return [$override['return'], $override['overloads']];
		}

		// 4. Kirby's __call: a file's asset method, else a content field on models
		return [$this->magicReturns($name, $interceptor, $core), $override['overloads'] ?? []];
	}

	/**
	 * What Kirby's `__call` gives for a method the Kirby class does not declare.
	 * A file passes it to its asset (`Kirby\Filesystem\File`, for images
	 * `Kirby\Image\Image`) when the asset has it; models fall back to a content
	 * field.
	 */
	protected function magicReturns(string $name, ReflectionClass $interceptor, ReflectionClass $core): string
	{
		$model   = $this->isModel($interceptor, $core);
		$members = [];
		$missing = false;

		if ($core->hasMethod('asset') === true && $core->getMethod('asset')->getReturnType() instanceof ReflectionNamedType) {
			$asset   = $core->getMethod('asset')->getReturnType()->getName();
			$classes = [$asset];

			if (class_exists('Kirby\Image\Image') && is_subclass_of('Kirby\Image\Image', $asset)) {
				$classes[] = 'Kirby\Image\Image';
			}

			foreach ($classes as $class) {
				$reflection = new ReflectionClass($class);

				if ($reflection->hasMethod($name) === false) {
					$missing = true;
					continue;
				}

				$method = $reflection->getMethod($name);
				$context = $this->context($this->owner($method), $reflection, $method->getFileName());
				$members[] = $this->reflectedType($method, $context);
			}
		} else {
			$missing = true;
		}

		if ($missing === true) {
			$members[] = $model ? "'field'" : 'unknown';
		}

		return implode(' | ', $this->normalize(array_merge(
			...array_map(fn ($m) => $this->splitTopLevel($m, '|'), $members)
		)));
	}

	/**
	 * The class or trait whose source declares a method: templates and
	 * `use` imports are read from there.
	 */
	protected function owner(ReflectionMethod $method): ReflectionClass
	{
		$class = $method->getDeclaringClass();

		foreach ($this->traits($class) as $trait) {
			if (
				$trait->hasMethod($method->getName()) === true &&
				$trait->getMethod($method->getName())->getFileName() === $method->getFileName()
			) {
				return $trait;
			}
		}

		return $class;
	}

	/**
	 * Finds an override `Class::method` for the interceptor, the Kirby class,
	 * one of their parents or one of their traits (in that order).
	 */
	protected function methodOverride(string $name, ReflectionClass $interceptor, ReflectionClass $core): array|null
	{
		foreach ([$interceptor, $core] as $start) {
			foreach ([$start, ...$this->parents($start)] as $class) {
				foreach ([$class, ...$this->traits($class)] as $owner) {
					$override = $this->override(
						$owner->getName() . '::' . $name,
						$this->context($owner, $core, $owner->getFileName())
					);

					if ($override !== null) {
						return $override;
					}
				}
			}
		}

		return null;
	}

	protected function override(string $key, array $context): array|null
	{
		$entry = null;

		foreach ($this->overrides['methods'] ?? [] as $overrideKey => $value) {
			if (strtolower(ltrim($overrideKey, '\\')) === strtolower($key)) {
				$entry = $value;
				break;
			}
		}

		if ($entry === null) {
			return null;
		}

		if (is_string($entry) === true) {
			$entry = ['return' => $entry];
		}

		$overloads = [];

		foreach ($entry['overloads'] ?? [] as $count => $type) {
			$overloads[$count] = $this->returns($type, $context);
		}

		return [
			'return'    => isset($entry['return']) ? $this->returns($entry['return'], $context) : null,
			'overloads' => $overloads,
		];
	}

	// ---------------------------------------------------------------------
	// Types

	/**
	 * The `Returns` of a method or closure: its PHP return type, or its
	 * docblock `@return` when the PHP type is missing or too vague (`array`,
	 * `mixed`, or a class KQL cannot render).
	 */
	protected function reflectedType(ReflectionFunctionAbstract $function, array $context): string
	{
		$php = $function->getReturnType() ? $this->typeString($function->getReturnType()) : null;
		$doc = $this->docReturn($function->getDocComment() ?: '');

		if ($php !== null) {
			$returns = $this->returns($php, $context);
			$vague   = $returns === 'unknown' || preg_match('/\b(array|mixed|iterable|object)\b/i', $php) === 1;

			if ($doc === null || $vague === false) {
				return $returns;
			}
		}

		return $doc !== null ? $this->returns($doc, $context) : 'unknown';
	}

	protected function typeString(ReflectionType $type): string
	{
		if ($type instanceof ReflectionNamedType) {
			$name = $type->isBuiltin() || in_array($type->getName(), ['static', 'self'], true)
				? $type->getName()
				: '\\' . $type->getName();
			$nullable = $type->allowsNull() && in_array($type->getName(), ['null', 'mixed'], true) === false;
			return $nullable ? $name . '|null' : $name;
		}

		if ($type instanceof ReflectionUnionType) {
			return implode('|', array_map(fn ($t) => $this->typeString($t), $type->getTypes()));
		}

		return 'mixed';
	}

	protected function docReturn(string $doc): string|null
	{
		if (preg_match('/@return\s+(.*)/', $doc, $match) !== 1) {
			return null;
		}

		// read the type up to the first space outside brackets
		$text  = trim($match[1]);
		$depth = 0;
		$type  = '';

		for ($i = 0; $i < strlen($text); $i++) {
			$char = $text[$i];

			if (str_contains('<({', $char)) {
				$depth++;
			} elseif (str_contains('>)}', $char)) {
				$depth--;
			} elseif (ctype_space($char) && $depth === 0) {
				break;
			}

			$type .= $char;
		}

		return $type === '' ? null : $type;
	}

	/**
	 * Converts a PHP/docblock type string into a `Returns`.
	 */
	public function returns(string $type, array|null $context): string
	{
		$members = $this->returnsMembers($type, $context);
		return implode(' | ', $members);
	}

	/** Sorted union members: classes first, then JSON types, then null. */
	protected function returnsMembers(string $type, array|null $context): array
	{
		$members = [];

		foreach ($this->splitTopLevel(trim($type), '|') as $part) {
			$part = trim($part);

			if (str_starts_with($part, '?') === true) {
				$members[] = 'null';
				$part = substr($part, 1);
			}

			array_push($members, ...$this->member($part, $context));
		}

		return $this->normalize($members);
	}

	/** Dedupes and sorts union members; anything with unknown is unknown. */
	protected function normalize(array $members): array
	{
		$members = array_values(array_unique(array_map('trim', $members)));

		// `true | false` is `boolean`, which already contains both.
		if (in_array('boolean', $members, true) === true || array_diff(['true', 'false'], $members) === []) {
			$members = array_values(array_diff($members, ['true', 'false']));
			$members[] = 'boolean';
			$members = array_values(array_unique($members));
		}

		if (in_array('unknown', $members, true) === true) {
			return ['unknown'];
		}

		if ($members === []) {
			return ['never'];
		}

		usort($members, function ($a, $b) {
			$rank = fn ($m) => $m === 'null' ? 2 : (str_starts_with($m, "'") ? 0 : 1);
			return [$rank($a), $a] <=> [$rank($b), $b];
		});

		return $members;
	}

	protected function member(string $type, array|null $context): array
	{
		if ($type === '') {
			return ['unknown'];
		}

		if (str_starts_with($type, '(') && str_ends_with($type, ')')) {
			return $this->returnsMembers(substr($type, 1, -1), $context);
		}

		if (str_ends_with($type, '[]') === true) {
			return [$this->arrayOf($this->returnsMembers(substr($type, 0, -2), $context))];
		}

		if (preg_match('/^([^<{]+)<(.*)>$/s', $type, $match) === 1) {
			$name = strtolower(trim($match[1]));
			$args = $this->splitTopLevel($match[2], ',');

			if (in_array($name, ['array', 'list', 'non-empty-array', 'non-empty-list', 'iterable'], true) === true) {
				$value = $this->returnsMembers(end($args), $context);

				if (count($args) === 2 && $this->returnsMembers($args[0], $context) === ['string']) {
					return [$this->recordOf($value)];
				}

				return [$this->arrayOf($value)];
			}

			$type = trim($match[1]);
		}

		$lower = strtolower($type);

		switch ($lower) {
			case 'null':
			case 'void':
				return ['null'];
			case 'never':
				return [];
			case 'string':
			case 'non-empty-string':
			case 'class-string':
			case 'numeric-string':
			case 'lowercase-string':
				return ['string'];
			case 'int':
			case 'integer':
			case 'float':
			case 'double':
			case 'positive-int':
			case 'negative-int':
			case 'non-negative-int':
				return ['number'];
			case 'bool':
			case 'boolean':
				return ['boolean'];
			case 'true':
			case 'false':
				return [$lower];
			case 'static':
			case '$this':
				return $context['static'] ? $this->aliases($context['static']->getName()) : ['unknown'];
			case 'self':
				return $context['self'] ? $this->aliases($context['self']->getName()) : ['unknown'];
		}

		if ($context !== null && isset($context['templates'][$type]) === true) {
			return $this->returnsMembers($context['templates'][$type], $this->context(null, $context['static'], null));
		}

		if (preg_match('/^\\\\?[A-Za-z_][A-Za-z0-9_\\\\]*$/', $type) !== 1) {
			return ['unknown'];
		}

		$class = $this->resolveName($type, $context['file'] ?? null);

		return class_exists($class) || interface_exists($class)
			? $this->aliases($class)
			: ['unknown'];
	}

	/** An array of JSON values; arrays of objects are left unknown. */
	protected function arrayOf(array $members): string
	{
		if ($members === ['unknown'] || $this->hasClass($members)) {
			return 'unknown[]';
		}

		return count($members) === 1 ? $members[0] . '[]' : '(' . implode(' | ', $members) . ')[]';
	}

	protected function recordOf(array $members): string
	{
		if ($this->hasClass($members)) {
			$members = ['unknown'];
		}

		return 'Record<string, ' . implode(' | ', $members) . '>';
	}

	protected function hasClass(array $members): bool
	{
		foreach ($members as $member) {
			if (str_starts_with($member, "'")) {
				return true;
			}
		}

		return false;
	}

	/**
	 * The class names (quoted) a Kirby class becomes in KQL, following
	 * Interceptor::replace(). An abstract class becomes the union of its
	 * subclasses that have an interceptor. Anything else is unknown.
	 */
	protected function aliases(string $class): array
	{
		$class = ltrim($class, '\\');

		if (is_subclass_of($class, Interceptor::class) === true) {
			return ["'" . $class::CLASS_ALIAS . "'"];
		}

		$interceptor = $this->interceptorFor($class);

		if ($interceptor !== null) {
			return ["'" . $interceptor::CLASS_ALIAS . "'"];
		}

		if (class_exists($class) === true && (new ReflectionClass($class))->isAbstract() === true) {
			$aliases = [];

			foreach ($this->interceptors as [$interceptor, $core]) {
				if ($core->isSubclassOf($class) === true) {
					$aliases[] = "'" . $interceptor->getConstant('CLASS_ALIAS') . "'";
				}
			}

			if ($aliases !== []) {
				$aliases = array_values(array_unique($aliases));
				sort($aliases, SORT_STRING);
				return $aliases;
			}
		}

		return ['unknown'];
	}

	protected function interceptorFor(string $class): string|null
	{
		if (class_exists($class) === false && interface_exists($class) === false) {
			return null;
		}

		$candidates = [$class, ...array_values(class_parents($class))];

		foreach ($candidates as $candidate) {
			$interceptor = Interceptor::class($candidate);

			if ($interceptor !== $candidate && class_exists($interceptor) === true) {
				return $interceptor;
			}
		}

		return null;
	}

	// ---------------------------------------------------------------------
	// Templates (`@template`, `@extends`)

	/**
	 * The value of template `$param` of `$owner` as seen from `$concrete`,
	 * as a type string with fully qualified class names.
	 */
	protected function templateValue(string $concrete, string $owner, string $param): string|null
	{
		return $this->templateMap($concrete)[strtolower($owner)][$param] ?? null;
	}

	/** owner class (lowercase) => [template => type string] */
	protected function templateMap(string $concrete): array
	{
		if (isset($this->templateMaps[$concrete]) === true) {
			return $this->templateMaps[$concrete];
		}

		$map   = [];
		$class = new ReflectionClass($concrete);

		// the concrete class's own templates are their bounds
		$own = [];

		foreach ($this->docTemplates($class) as $name => $bound) {
			$own[$name] = $bound ?? 'mixed';
		}

		$map[strtolower($class->getName())] = $own;

		while ($class !== null) {
			$doc  = $class->getDocComment() ?: '';
			$file = $class->getFileName();
			$parent = $class->getParentClass() ?: null;

			if ($parent !== null && preg_match('/@extends\s+([^\s<]+)<(.+)>/', $doc, $match) === 1) {
				$args    = $this->splitTopLevel($match[2], ',');
				$params  = array_keys($this->docTemplates($parent));
				$current = $map[strtolower($class->getName())] ?? [];
				$values  = [];

				foreach ($params as $index => $name) {
					$arg = isset($args[$index]) ? trim($args[$index]) : 'mixed';
					$values[$name] = $this->qualify($arg, $file, $current);
				}

				// unbound parameters keep their bounds
				foreach ($this->docTemplates($parent) as $name => $bound) {
					$values[$name] ??= $bound ?? 'mixed';
				}

				$map[strtolower($parent->getName())] = $values;
			}

			// `@use Trait<Args>` sets the templates of a trait
			preg_match_all('/@use\s+([^\s<]+)<(.+)>/', $doc, $uses, PREG_SET_ORDER);

			foreach ($uses as $use) {
				$trait = $this->resolveName(trim($use[1]), $file ?: null);

				if (trait_exists($trait) === false) {
					continue;
				}

				$trait   = new ReflectionClass($trait);
				$args    = $this->splitTopLevel($use[2], ',');
				$current = $map[strtolower($class->getName())] ?? [];
				$values  = [];

				foreach (array_keys($this->docTemplates($trait)) as $index => $name) {
					$values[$name] = $this->qualify(isset($args[$index]) ? trim($args[$index]) : 'mixed', $file, $current);
				}

				$map[strtolower($trait->getName())] ??= $values;
			}

			$class = $parent;
		}

		return $this->templateMaps[$concrete] = $map;
	}

	/** template name => bound (qualified) or null */
	protected function docTemplates(ReflectionClass $class): array
	{
		$templates = [];

		preg_match_all('/@template(?:-covariant)?\s+(\w+)(?:\s+of\s+(\S+))?/', $class->getDocComment() ?: '', $matches, PREG_SET_ORDER);

		foreach ($matches as $match) {
			$templates[$match[1]] = isset($match[2]) ? $this->qualify($match[2], $class->getFileName(), []) : null;
		}

		return $templates;
	}

	/**
	 * Makes class names in a type string fully qualified and replaces
	 * template names by their values.
	 */
	protected function qualify(string $type, string|false $file, array $templates): string
	{
		return preg_replace_callback('/\\\\?[A-Za-z_][A-Za-z0-9_\\\\]*/', function ($match) use ($file, $templates) {
			$name = $match[0];

			if (isset($templates[$name]) === true) {
				return '(' . $templates[$name] . ')';
			}

			if (in_array(strtolower($name), ['null', 'void', 'string', 'int', 'integer', 'float', 'bool', 'boolean', 'true', 'false', 'mixed', 'array', 'list', 'iterable', 'object', 'static', 'self', 'callable', 'never'], true)) {
				return $name;
			}

			$class = $this->resolveName($name, $file ?: null);
			return class_exists($class) || interface_exists($class) ? '\\' . $class : $name;
		}, $type);
	}

	// ---------------------------------------------------------------------
	// Helpers

	/**
	 * A resolution context: `static` (the Kirby class the method is called on),
	 * `self` (the declaring class), `file` (for `use` imports) and the
	 * declaring class's `templates`.
	 */
	protected function context(ReflectionClass|null $self, ReflectionClass|null $static, string|false|null $file): array
	{
		$templates = [];

		if ($self !== null && $static !== null) {
			$templates = $this->templateMap($static->getName())[strtolower($self->getName())] ?? [];
		}

		return [
			'self'      => $self,
			'static'    => $static,
			'file'      => $file ?: ($self?->getFileName() ?: null),
			'templates' => $templates,
		];
	}

	protected function resolveName(string $name, string|null $file): string
	{
		if (str_starts_with($name, '\\') === true) {
			return ltrim($name, '\\');
		}

		[$namespace, $uses] = $file ? $this->fileContext($file) : ['', []];
		$first = strtolower(explode('\\', $name)[0]);

		if (isset($uses[$first]) === true) {
			return $uses[$first] . substr($name, strlen($first));
		}

		$qualified = $namespace !== '' ? $namespace . '\\' . $name : $name;

		return class_exists($qualified) || interface_exists($qualified) ? $qualified : $name;
	}

	/** [namespace, alias (lowercase) => class] of a PHP file */
	protected function fileContext(string $file): array
	{
		if (isset($this->fileContexts[$file]) === true) {
			return $this->fileContexts[$file];
		}

		$source    = file_get_contents($file);
		$namespace = preg_match('/^namespace\s+([^;]+);/m', $source, $match) ? trim($match[1]) : '';
		$uses      = [];

		preg_match_all('/^use\s+([^;{]+);/m', $source, $matches);

		foreach ($matches[1] as $use) {
			$parts = preg_split('/\s+as\s+/i', trim($use));
			$class = ltrim(trim($parts[0]), '\\');
			$alias = $parts[1] ?? substr($class, (strrpos($class, '\\') ?: -1) + 1);
			$uses[strtolower(trim($alias))] = $class;
		}

		return $this->fileContexts[$file] = [$namespace, $uses];
	}

	protected function splitTopLevel(string $text, string $separator): array
	{
		$parts = [];
		$depth = 0;
		$part  = '';

		for ($i = 0; $i < strlen($text); $i++) {
			$char = $text[$i];

			if (str_contains('<({[', $char)) {
				$depth++;
			} elseif (str_contains('>)}]', $char)) {
				$depth--;
			}

			if ($char === $separator && $depth === 0) {
				$parts[] = $part;
				$part = '';
				continue;
			}

			$part .= $char;
		}

		$parts[] = $part;
		return array_map('trim', $parts);
	}

	/** @return ReflectionClass[] */
	protected function parents(ReflectionClass $class): array
	{
		$parents = [];

		while ($class = $class->getParentClass()) {
			$parents[] = $class;
		}

		return $parents;
	}

	/** @return ReflectionClass[] traits of a class, including traits of traits */
	protected function traits(ReflectionClass $class): array
	{
		$traits = [];

		foreach ($class->getTraits() as $trait) {
			$traits[] = $trait;
			array_push($traits, ...$this->traits($trait));
		}

		return $traits;
	}

	/**
	 * Collects KQL's built-in interceptor classes. Interceptors, allowed and
	 * blocked methods from the site's config are left out: the schema
	 * describes Kirby and KQL, not one site.
	 */
	protected function collectInterceptors(): void
	{
		$base  = dirname((new ReflectionClass(Interceptor::class))->getFileName()) . '/Interceptors';
		$found = [];

		$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS));

		foreach ($files as $file) {
			if ($file->getExtension() !== 'php') {
				continue;
			}

			$relative = substr($file->getPathname(), strlen($base) + 1, -4);
			$interceptor = 'Kirby\\Kql\\Interceptors\\' . str_replace('/', '\\', $relative);
			$found[$interceptor] = str_replace('Kirby\\Kql\\Interceptors\\', 'Kirby\\', $interceptor);
		}

		ksort($found, SORT_STRING);

		foreach ($found as $interceptor => $core) {
			if (class_exists($interceptor) === false || class_exists($core) === false) {
				continue;
			}

			$interceptorClass = new ReflectionClass($interceptor);

			if ($interceptorClass->isSubclassOf(Interceptor::class) === false || $interceptorClass->isAbstract()) {
				continue;
			}

			$coreClass = new ReflectionClass($core);
			$this->interceptors[] = [$interceptorClass, $coreClass];

			// the first interceptor of an alias names the class (Cms\File before Cms\FileVersion)
			$this->classes[$interceptor::CLASS_ALIAS] ??= [
				'interceptor' => $interceptorClass,
				'core'        => $coreClass,
			];
		}
	}
}
