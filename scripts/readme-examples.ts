/**
 * Writes every ```ts code block of a Markdown file into a directory as its
 * own module, so `pnpm test:pack` can type-check the README's examples
 * against the packed package.
 *
 * - A block whose first line is a file name comment (`// client.ts`) is
 *   written under that name, so later blocks can import from it
 *   (`./client.js`). Every other block becomes `example-<n>.ts`.
 * - A comment line `// typeof home: { title: string } | null` states the
 *   exact type of `home` at that point. It is turned into a check that fails
 *   to compile unless the type is exactly that, neither narrower nor wider.
 *
 * Usage: node scripts/readme-examples.ts README.md <out-dir>
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [markdownPath, outDir] = process.argv.slice(2)
if (markdownPath === undefined || outDir === undefined) {
	throw new Error('Usage: node scripts/readme-examples.ts <markdown> <out-dir>')
}

const checks = `
type ReadmeEqual<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false
type ReadmeExpect<T extends true> = T
export {}
`

const markdown = readFileSync(markdownPath, 'utf8')
const blocks = [...markdown.matchAll(/^```ts\n([\s\S]*?)^```$/gm)].map((match) => match[1] ?? '')

mkdirSync(outDir, { recursive: true })
let typeChecks = 0
blocks.forEach((code, index) => {
	const name = /^\/\/ ([\w-]+\.ts)\n/.exec(code)?.[1] ?? `example-${index + 1}.ts`
	const checked = code.replace(
		/^(\s*)\/\/ typeof ([\w.]+): (.+)$/gm,
		(_, indent: string, expression: string, type: string) =>
			`${indent}type ReadmeCheck${++typeChecks} = ReadmeExpect<ReadmeEqual<typeof ${expression}, ${type}>>`,
	)
	writeFileSync(join(outDir, name), checked + checks)
})
console.log(`${blocks.length} examples with ${typeChecks} type checks from ${markdownPath}`)
