import { kql } from '../../../src/index.ts'
import { film } from './film.ts'
import { image } from './image.ts'

export function project<const Q extends string>(query: Q) {
	return kql({
		query,
		select: {
			slug: true,
			isTeaserFullWidth: 'page.isTeaserFullWidth',
			hasPreviewFilm: 'page.hasPreviewFilm',
			playType: true,
			photo: image('page.photo.toFile'),
			previewFilm: film('page.previewFilm.toPage'),
			awards: image('page.awards.toFiles', 'award'),
			headline: 'page.headline.or(page.title)',
			subHeadline: 'page.sub_headline.kirbytextinline',
			intro: 'page.text_intro.kirbytextinline',
		},
	})
}
