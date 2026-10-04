import { useCallback, useRef, useState } from 'react'

export interface VideoControl {
  ref: React.RefObject<HTMLVideoElement>
  playing: boolean
  time: number
  duration: number
  toggle: () => void
  handlers: {
    onPlay: () => void
    onPause: () => void
    onEnded: () => void
    onTimeUpdate: (event: React.SyntheticEvent<HTMLVideoElement>) => void
    onLoadedMetadata: (event: React.SyntheticEvent<HTMLVideoElement>) => void
  }
}

/** Real play/pause for an attached video. Playing state is keyed to the record. */
export function useVideoControl(recordId: string): VideoControl {
  const ref = useRef<HTMLVideoElement>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [clock, setClock] = useState({ id: recordId, time: 0, duration: 0 })
  const live = clock.id === recordId ? clock : { id: recordId, time: 0, duration: 0 }

  const toggle = useCallback(() => {
    const video = ref.current
    if (!video) return
    if (video.paused) {
      const attempt = video.play() as Promise<void> | undefined
      attempt?.catch(() => setPlayingId(null))
    } else {
      video.pause()
    }
  }, [])

  return {
    ref: ref as React.RefObject<HTMLVideoElement>,
    playing: playingId === recordId,
    time: live.time,
    duration: live.duration,
    toggle,
    handlers: {
      onPlay: () => setPlayingId(recordId),
      onPause: () => setPlayingId(null),
      onEnded: () => setPlayingId(null),
      onTimeUpdate: event => setClock({ ...live, id: recordId, time: event.currentTarget.currentTime }),
      onLoadedMetadata: event => {
        const duration = event.currentTarget.duration
        setClock({ ...live, id: recordId, duration: Number.isFinite(duration) ? duration : 0 })
      },
    },
  }
}
