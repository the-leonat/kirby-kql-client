/**
 * anorak's production queries, adapted to the test site: every query builder
 * of anorak (test/queries/anorak/, transformers removed) and every query of
 * its routes, with the page paths moved under `anorak/`. Recorded through
 * kirby-headless's `/api/kql` route with a Bearer token, as anorak queries
 * it (see test/test-site.ts), on a client with `AnorakExtension`
 * (test/types/anorak.test.ts).
 *
 * Content (`anorak/`, test content written for these queries):
 * - `media` holds the files every other page links by uuid: `photo.png` (an
 *   image), `loop.gif` (an image with the content of a video), `clip.mp4` (a
 *   video whose width and height are content, as in anorak's video files)
 *   and `document.pdf`. A file's `width` is a number on images and a content
 *   field (a string) on any other file, so every select of `width` sees both.
 * - `films/film-a`, `film-b` and `film-c`: films with videos (mp4, gif, none),
 *   a director (or none) and awards.
 * - `directors` with the listed directors `jane-doe`, `john-roe`, and
 *   `prodco` with its director `max-mustermann`, and an unlisted `hidden`.
 * - `projects` and `film-and-tv` with projects, each with layouts of blocks
 *   (films, galleries, quotes, headings, images, logos).
 * - `home`, `about`, `contact` (and `contact-pdf-logo`), `data-privacy`,
 *   `legal-notice`, and `empty`, a page without content, used as the empty
 *   case of every page query.
 */
import { kql } from '../../src/index.ts'
import { bio } from './anorak/bio.ts'
import { directorsFilmPreview, film } from './anorak/film.ts'
import { image } from './anorak/image.ts'
import { layout } from './anorak/layout.ts'
import { pageMeta } from './anorak/pageMeta.ts'
import { project } from './anorak/project.ts'
import { textLayout } from './anorak/textLayout.ts'
import { video } from './anorak/video.ts'

/**
 * What anorak's plugins add, as anorak's client would describe it:
 * kirby-meta's `page.meta` and its page meta class, and `file.srcset`
 * without `null`, because the test site (like anorak) configures every
 * srcset preset the queries name (`default`, `award`). Kirby only gives
 * `null` for a preset that isn't configured.
 */
export type AnorakExtension = {
	classes: {
		page: { methods: { meta: 'pageMeta' } }
		file: { methods: { srcset: string } }
		pageMeta: {
			methods: {
				title: string
				description: string | null
				robots: boolean | string
				canonicalUrl: string
				jsonld: {
					'@context': string
					'@graph': { '@type': string; '@id': string; [key: string]: unknown }[]
				}
				social: { property: string; content: number | string }[]
			}
			/** `robots()` gives the robots meta tag, `robots('index')` one flag. */
			overloads: { robots: { 0: string; 1: boolean } }
		}
	}
}

const missing = "page('missing')"
const empty = "page('anorak/empty')"

// --- The query builders, each on its own ---

/** An image, a file that is not an image, and no file. */
export const imageBuilder = [
	kql(image("page('anorak/media').file('photo.png')")),
	kql(image("page('anorak/media').file('document.pdf')", 'award')),
	kql(image("page('anorak/media').file('missing.png')")),
]

/** A video whose size is content, an image used as a video, and no file. */
export const videoBuilder = [
	kql(video("page('anorak/media').file('clip.mp4')")),
	kql(video("page('anorak/media').file('loop.gif')")),
	kql(video("page('anorak/media').file('missing.mp4')")),
]

export const filmBuilder = [
	kql(film("page('anorak/films/film-a')")),
	kql(film("page('anorak/films/film-b')")),
	kql(film("page('anorak/films/film-c')")),
	kql(film(missing)),
]

export const directorsFilmPreviewBuilder = [
	kql(directorsFilmPreview("page('anorak/films/film-a')")),
	kql(directorsFilmPreview("page('anorak/films/film-b')")),
	kql(directorsFilmPreview("page('anorak/films/film-c')")),
	kql(directorsFilmPreview(missing)),
]

/** With a meta description and an og image, and without either. */
export const pageMetaBuilder = [
	kql(pageMeta("page('anorak/home').meta")),
	kql(pageMeta(`${empty}.meta`)),
]

/** `robots` with an argument gives one flag, `AnorakExtension`'s overload. */
export const pageMetaRobotsFlag = [
	kql({ query: "page('anorak/home').meta.robots('index')" }),
	kql({ query: `${empty}.meta.robots('follow')` }),
]

export const projectBuilder = [
	kql(project("page('anorak/projects').children")),
	kql(project("page('anorak/film-and-tv').children")),
	kql(project(`${empty}.children`)),
]

export const layoutBuilder = [
	kql(layout("page('anorak/projects/project-one').layout.toLayouts")),
	kql(layout("page('anorak/directors/jane-doe').layout.toLayouts")),
	kql(layout(`${empty}.layout.toLayouts`)),
]

export const textLayoutBuilder = [
	kql(textLayout("page('anorak/projects/project-one').text.toLayouts")),
	kql(textLayout(`${empty}.text.toLayouts`)),
]

/** `bio` reads the surrounding page, so it only exists inside a select. */
export const bioBuilder = [
	kql({ query: "page('anorak/directors/jane-doe')", select: { bio: bio() } }),
	kql({ query: "page('anorak/directors/john-roe')", select: { bio: bio() } }),
	kql({ query: empty, select: { bio: bio() } }),
	kql({ query: missing, select: { bio: bio() } }),
]

// --- The queries of anorak's routes ---

/** routes/+page.server.ts */
export const homePage = [
	kql({
		query: 'site',
		select: {
			meta: pageMeta("page('anorak/home').meta"),
			text: "page('anorak/home').text.kirbytextinline",
		},
	}),
	kql({
		query: 'site',
		select: {
			meta: pageMeta(`${empty}.meta`),
			text: `${empty}.text.kirbytextinline`,
		},
	}),
]

/**
 * routes/+layout.server.ts, with anorak's `showUnlistedPages` switch: the
 * directors' films and photos, unlisted directors included or not.
 */
const layoutData = <const Q extends string>(directors: Q) =>
	kql({
		query: 'site',
		select: {
			instagram: true,
			previewFilms: {
				query: directors,
				select: {
					slug: 'page.id',
					previewFilm: directorsFilmPreview('page.preview_film.toPage'),
					previewPhoto: image('page.preview_photo.toFile'),
				},
			},
		},
	})

export const layoutPage = [
	kql(layoutData('page("anorak/directors").index')),
	kql(layoutData('page("anorak/directors").index.listed')),
]

/** routes/about/+page.server.ts */
const about = <const Q extends string>(query: Q) =>
	kql({
		query,
		select: {
			meta: pageMeta('page.meta'),
			text: 'page.text.kirbytextinline',
			instagram: true,
		},
	})

export const aboutPage = [kql(about("page('anorak/about')")), kql(about(empty)), kql(about(missing))]

/**
 * routes/contact/+page.server.ts: locations (a structure) with their
 * contacts (a structure inside each item), and a TISAX logo that is an image
 * on `contact` and a PDF on `contact-pdf-logo`.
 */
const contact = <const Q extends string>(query: Q) =>
	kql({
		query,
		select: {
			meta: pageMeta('page.meta'),
			locations: {
				query: 'page.locations.toStructure',
				select: {
					address: true,
					globalContact: 'structureItem.global_contact',
					contacts: {
						query: 'structureItem.contacts.toStructure',
						select: {
							name: true,
							role: true,
							mail: true,
							row: true,
						},
					},
				},
			},
			tisaxLogo: image('page.tisax_logo.toFile()', 'award'),
		},
	})

export const contactPage = [
	kql(contact("page('anorak/contact')")),
	kql(contact("page('anorak/contact-pdf-logo')")),
	kql(contact(empty)),
	kql(contact(missing)),
]

/** routes/data-privacy and routes/legal: the same query on two pages. */
const legal = <const Q extends string>(query: Q) =>
	kql({
		query,
		select: {
			title: true,
			meta: pageMeta('page.meta'),
			text: 'page.text.kirbytext',
		},
	})

export const dataPrivacyPage = [kql(legal("page('anorak/data-privacy')")), kql(legal(empty)), kql(legal(missing))]

export const legalNoticePage = [kql(legal("page('anorak/legal-notice')")), kql(legal(empty)), kql(legal(missing))]

/** routes/projects/+page.server.ts, unlisted projects included or not. */
const projects = <const Q extends string, const P extends string>(query: Q, children: P) =>
	kql({
		query,
		select: {
			meta: pageMeta('page.meta'),
			projects: project(children),
		},
	})

export const projectsPage = [
	kql(projects("page('anorak/projects')", "page('anorak/projects').children")),
	kql(projects("page('anorak/projects')", "page('anorak/projects').children.listed")),
	kql(projects(empty, `${empty}.children.listed`)),
	kql(projects(missing, "page('anorak/projects').children.listed")),
]

/** routes/film-and-tv/+page.server.ts */
const filmAndTv = <const Q extends string, const P extends string>(query: Q, children: P) =>
	kql({
		query,
		select: {
			meta: pageMeta('page.meta'),
			text: true,
			projects: project(children),
		},
	})

export const filmAndTvPage = [
	kql(filmAndTv("page('anorak/film-and-tv')", "page('anorak/film-and-tv').children")),
	kql(filmAndTv("page('anorak/film-and-tv')", "page('anorak/film-and-tv').children.listed")),
	kql(filmAndTv(empty, `${empty}.children.listed`)),
	kql(filmAndTv(missing, "page('anorak/film-and-tv').children.listed")),
]

/**
 * routes/projects/[name] and routes/film-and-tv/[name]: the same query, a
 * project with its featured film and its layouts.
 */
const projectDetail = <const Q extends string>(query: Q) =>
	kql({
		query,
		select: {
			meta: pageMeta('page.meta'),
			slug: true,
			hasFeaturedFilm: 'page.hasFeaturedFilm.toBool',
			featuredFilm: film('page.featuredFilm.toPage'),
			layouts: layout('page.layout.toLayouts'),
			headline: 'page.headline.kirbytextinline',
			subHeadline: 'page.sub_headline.kirbytextinline',
			intro: 'page.text_intro.kirbytextinline',
			textLayouts: textLayout('page.text.toLayouts'),
		},
	})

export const projectPage = [
	kql(projectDetail("page('anorak/projects/project-one')")),
	kql(projectDetail("page('anorak/projects/project-two')")),
	kql(projectDetail("page('anorak/film-and-tv/commercial')")),
	kql(projectDetail(empty)),
	kql(projectDetail(missing)),
]

/**
 * routes/directors (and routes/directors/prodco through the same builder),
 * unlisted directors included or not.
 */
const directors = <const Q extends string, const D extends string>(query: Q, list: D) =>
	kql({
		query,
		select: {
			meta: pageMeta('page.meta'),
			directors: {
				query: list,
				select: {
					name: 'page.title',
					url: 'page.id',
				},
			},
		},
	})

export const directorsPage = [
	kql(directors('site.page("anorak/directors")', 'page.index.sortBy("title")')),
	kql(directors('site.page("anorak/directors")', 'page.index.listed.sortBy("title")')),
	kql(directors('site.page("anorak/directors/prodco")', 'page.index.listed.sortBy("title")')),
	kql(directors('site.page("missing")', 'page.index.listed.sortBy("title")')),
]

/** routes/directors/[name] and routes/directors/prodco/[name]. */
const director = <const Q extends string>(query: Q) =>
	kql({
		query,
		select: {
			meta: pageMeta('page.meta'),
			name: 'page.title',
			layouts: layout('page.content.layout.toLayouts'),
			headline: true,
			photo: image('page.content.photo.toFile'),
			text: 'page.content.text.kirbytext',
			bio: bio(),
		},
	})

export const directorPage = [
	kql(director('site.page("anorak/directors/jane-doe")')),
	kql(director('site.page("anorak/directors/john-roe")')),
	kql(director('site.page("anorak/directors/prodco/max-mustermann")')),
	kql(director('site.page("missing")')),
]

/**
 * routes/films/[name]/[...origin]: a film with its director's other films,
 * read from the film blocks of the director's layout.
 */
const filmDetail = <const Q extends string>(query: Q) =>
	kql({
		query,
		select: {
			title: 'page.title',
			customer: 'page.customer',
			slug: true,
			embedOnly: 'page.isUnlisted',
			videoFull: video('page.content.video_full.toFile'),
			director: {
				query: 'page.director.toPage',
				select: {
					slug: true,
					path: 'page.id',
					name: 'page.title',
					films: {
						query: "page.content.layout.toBlocks.filterBy('type', 'film')",
						select: {
							slug: 'block.content.page.toPage.slug',
						},
					},
				},
			},
			meta: pageMeta('page.meta'),
		},
	})

export const filmPage = [
	kql(filmDetail('site.page("anorak/films/film-a")')),
	kql(filmDetail('site.page("anorak/films/film-b")')),
	kql(filmDetail('site.page("anorak/films/film-c")')),
	kql(filmDetail('site.page("missing")')),
]
