import { kql } from '../../../src/index.ts'
import { film } from './film.ts'
import { image } from './image.ts'

/** Like `layout`, with the content keys of anorak's text blocks. */
export function textLayout<const Q extends string>(query: Q) {
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
									text: 'content.text',
									align: true,
									level: true,
									link: true,
									heading: true,
									image: image('content.image.toFile'),
									logo: image('content.logo.toFile', 'award'),
									author: true,
									playType: true,
								},
							},
						},
					},
				},
			},
		},
	})
}
