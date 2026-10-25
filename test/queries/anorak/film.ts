import { kql } from '../../../src/index.ts'
import { image } from './image.ts'
import { video } from './video.ts'

export function film<const Q extends string>(query: Q) {
	return kql({
		query,
		select: {
			title: 'page.title',
			customer: 'page.customer',
			slug: true,
			embedOnly: 'page.isUnlisted',
			videoFull: video('page.content.video_full.toFile'),
			videoTeaser: video('page.content.video_teaser.toFile'),
			videoTeaserMobile: video('page.content.video_teaser_mobile.toFile'),
			director: {
				query: 'page.director.toPage',
				select: {
					slug: true,
					path: 'page.id',
					name: 'page.title',
				},
			},
			awards: image('page.awards.toFiles'),
		},
	})
}

export function directorsFilmPreview<const Q extends string>(query: Q) {
	return kql({
		query,
		select: {
			videoTeaser: video('page.content.video_teaser.toFile'),
			videoTeaserMobile: video('page.content.video_teaser_mobile.toFile'),
		},
	})
}
