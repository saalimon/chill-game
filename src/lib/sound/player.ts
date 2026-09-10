/**
 * The game's voice.
 *
 * Sounds are synthesised rather than shipped as audio files: a handful of
 * oscillators costs nothing to download, works offline with no assets to
 * precache, and can be tuned to stay soft. Everything here is quiet, short and
 * warm — a puzzle you play to unwind should never bark at you.
 */
export interface Tone {
  /** Hz at the start of the tone. */
  freq: number
  /** Hz to glide to, if it should bend. */
  to?: number
  /** Seconds from the start of the sound. */
  at: number
  /** Seconds. */
  dur: number
  type: OscillatorType
  /** Peak level, 0-1. Deliberately low. */
  gain: number
}

export type SoundName = 'tap' | 'mark' | 'place' | 'wrong' | 'solved' | 'lost'

const C5 = 523.25
const E5 = 659.25
const G5 = 783.99
const C6 = 1046.5

export const SOUNDS: Record<SoundName, Tone[]> = {
  /** A button. Barely there — the sound of a fingertip, not a click. */
  tap: [{ freq: 330, at: 0, dur: 0.05, type: 'triangle', gain: 0.05 }],

  /** Ruling a square out: a pencil stroke. */
  mark: [{ freq: 250, to: 210, at: 0, dur: 0.07, type: 'triangle', gain: 0.08 }],

  /** A doodle lands where it belongs — the one moment worth a small reward. */
  place: [
    { freq: C5, at: 0, dur: 0.1, type: 'sine', gain: 0.1 },
    { freq: G5, at: 0.055, dur: 0.16, type: 'sine', gain: 0.09 },
  ],

  /** A wrong guess. Low and soft: it costs a life, it is not a klaxon. */
  wrong: [{ freq: 200, to: 148, at: 0, dur: 0.22, type: 'triangle', gain: 0.11 }],

  /** Solved. A rising arpeggio, the only sound allowed to take its time. */
  solved: [
    { freq: C5, at: 0, dur: 0.16, type: 'sine', gain: 0.09 },
    { freq: E5, at: 0.1, dur: 0.16, type: 'sine', gain: 0.09 },
    { freq: G5, at: 0.2, dur: 0.18, type: 'sine', gain: 0.09 },
    { freq: C6, at: 0.3, dur: 0.4, type: 'sine', gain: 0.08 },
  ],

  /** Out of guesses. The same shape, going the other way. */
  lost: [
    { freq: 392, at: 0, dur: 0.16, type: 'sine', gain: 0.08 },
    { freq: 329.63, at: 0.12, dur: 0.16, type: 'sine', gain: 0.08 },
    { freq: 261.63, at: 0.24, dur: 0.34, type: 'sine', gain: 0.08 },
  ],
}

export const MUTE_KEY = 'chilled:muted:v1'

let muted: boolean | null = null

export function isMuted(): boolean {
  if (muted === null) {
    try {
      muted = localStorage.getItem(MUTE_KEY) === '1'
    } catch {
      muted = false
    }
  }
  return muted
}

export function setMuted(value: boolean): void {
  muted = value
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0')
  } catch {
    // Storage unavailable; the setting just won't outlive the session.
  }
}

let context: AudioContext | null = null

/**
 * The shared audio engine, made on first use.
 *
 * Browsers hand out a suspended engine until the page has been interacted with,
 * so it is created lazily — by which point a tap has always happened — and
 * resumed whenever it is found asleep, which is what happens after a phone
 * locks or the tab goes to the background.
 */
function engine(): AudioContext | null {
  const Ctor =
    typeof AudioContext !== 'undefined'
      ? AudioContext
      : ((globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? null)
  if (!Ctor) return null

  try {
    context ??= new Ctor()
    if (context.state === 'suspended') void context.resume()
    return context
  } catch {
    // Audio blocked or unavailable. The game is perfectly playable in silence.
    return null
  }
}

/** Play one of the game's sounds. Never throws, and never blocks the tap. */
export function play(name: SoundName): void {
  if (isMuted()) return

  const audio = engine()
  if (!audio) return

  try {
    const now = audio.currentTime
    for (const tone of SOUNDS[name]) {
      const start = now + tone.at
      const end = start + tone.dur

      const oscillator = audio.createOscillator()
      oscillator.type = tone.type
      oscillator.frequency.setValueAtTime(tone.freq, start)
      if (tone.to !== undefined) {
        oscillator.frequency.exponentialRampToValueAtTime(tone.to, end)
      }

      // Soft attack and a long tail: a square edge on either end reads as a click.
      const level = audio.createGain()
      level.gain.setValueAtTime(0.0001, start)
      level.gain.linearRampToValueAtTime(tone.gain, start + Math.min(0.02, tone.dur / 3))
      level.gain.exponentialRampToValueAtTime(0.0001, end)

      // Takes the glassy edge off a raw oscillator.
      const warmth = audio.createBiquadFilter()
      warmth.type = 'lowpass'
      warmth.frequency.setValueAtTime(2400, start)

      oscillator.connect(warmth)
      warmth.connect(level)
      level.connect(audio.destination)

      oscillator.start(start)
      oscillator.stop(end + 0.02)
      oscillator.onended = () => {
        oscillator.disconnect()
        warmth.disconnect()
        level.disconnect()
      }
    }
  } catch {
    // A sound failing is never worth interrupting play for.
  }
}
