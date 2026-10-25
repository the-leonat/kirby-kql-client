import { kql } from '../../../src/index.ts'
import { film } from './film.ts'
import { image } from './image.ts'

/** Layouts → columns → blocks → block content → films and images. */
export function layout<const Q extends string>(query: Q) {
	return kql({
		query,
		select: {
			columns: {
				query: 'layout.columns',
				select: {
					span: 'layoutColumn.span(12)',
					blocks: {
						query: 'layoutColumn.blocks',
						select: {
							type: true,
							content: {
								query: 'block.content',
								select: {
									film: film('content.page.toPage'),
									caption: 'content.caption',
									images: image('content.images.toFiles'),
									customer: 'content.customer',
									playType: 'content.playType',
								},
							},
						},
					},
				},
			},
		},
	})
}
