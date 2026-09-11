/**
 * Small on/off settings that outlive a session.
 *
 * Kept outside React so every screen agrees on them, and read lazily so a
 * browser that refuses storage degrades to the default rather than throwing.
 */
type Listener = () => void

const listeners = new Set<Listener>()
const cache = new Map<string, boolean>()

export function readPref(key: string, fallback: boolean): boolean {
  if (!cache.has(key)) {
    try {
      const raw = localStorage.getItem(key)
      cache.set(key, raw === null ? fallback : raw === '1')
    } catch {
      cache.set(key, fallback)
    }
  }
  return cache.get(key)!
}

export function writePref(key: string, value: boolean): void {
  cache.set(key, value)
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {
    // Storage unavailable; the setting just won't outlive the session.
  }
  for (const listener of listeners) listener()
}

export function subscribePrefs(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Whether the draft shows what each offered card would do to the deck.
 *
 * Off by default: working out which card helps is the judgement the draft is
 * asking for, and handing over the answer makes the run easier. It is a
 * difficulty setting, not a default convenience.
 */
export const OFFER_HINTS_KEY = 'chilled:tally:offerHints:v1'
