import { useCallback, useSyncExternalStore } from 'react'
import { isMuted, play, setMuted, type SoundName } from './player'

const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Mute state lives outside React so every screen agrees on it. */
export function useSound() {
  const muted = useSyncExternalStore(subscribe, isMuted, () => false)

  const toggle = useCallback(() => {
    setMuted(!isMuted())
    for (const listener of listeners) listener()
    // A little confirmation that sound is back on.
    if (!isMuted()) play('tap')
  }, [])

  return { muted, toggle, play }
}

export type { SoundName }
