import { kql } from '../../../src/index.ts'

/**
 * A video file. In anorak these are files of Vimeo videos whose data is
 * content: `hls`, `poster`, `preview`, `poster_tiny`, `blurhash` and, for
 * files that are not images, `width` and `height`. anorak turned `blurhash`
 * into an image with a transformer; here it is the plain content field.
 */
export function video<const Q extends string>(query: Q) {
	return kql({
		query,
		select: {
			hls: true,
			poster: true,
			width: true,
			height: true,
			posterTiny: 'file.poster_tiny',
			preview: true,
			blurhash: 'file.blurhash',
		},
	})
}
