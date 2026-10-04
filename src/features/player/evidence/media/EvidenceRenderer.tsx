import { mediumView } from './views'
import type { MediaProps } from './types'

/** Dispatcher: each medium supplies only the parts that genuinely differ. */
export function MediaSurface(props: MediaProps) {
  const { Surface } = mediumView(props.medium)
  return <Surface {...props} />
}

export function MediaOverlay(props: MediaProps) {
  const { Overlay } = mediumView(props.medium)
  return Overlay ? <Overlay {...props} /> : null
}

export function MediaStrip(props: MediaProps) {
  const { Strip } = mediumView(props.medium)
  return Strip ? <Strip {...props} /> : null
}
