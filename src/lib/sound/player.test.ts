import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as PlayerModule from './player'

/**
 * The player keeps one audio engine for the life of the page, so each test gets
 * a fresh copy of the module rather than inheriting the previous one's.
 */
let player: typeof PlayerModule
const { MUTE_KEY } = await import('./player')
const isMuted = () => player.isMuted()
const setMuted = (v: boolean) => player.setMuted(v)
const play = (n: Parameters<typeof PlayerModule.play>[0]) => player.play(n)
const SOUNDS = () => player.SOUNDS

/** A stand-in for the browser's audio engine, recording what it was asked to make. */
class FakeAudioContext {
  static made: FakeAudioContext[] = []
  state: 'running' | 'suspended' = 'running'
  currentTime = 0
  destination = {}
  oscillators: { type: string; freq: number; started: boolean }[] = []
  resumed = 0

  constructor() {
    FakeAudioContext.made.push(this)
  }

  resume() {
    this.resumed++
    this.state = 'running'
    return Promise.resolve()
  }

  createGain() {
    return {
      gain: {
        value: 0,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }
  }

  createBiquadFilter() {
    return {
      type: '',
      frequency: { value: 0, setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }
  }

  createOscillator() {
    const record = { type: '', freq: 0, started: false }
    this.oscillators.push(record)
    return {
      set type(v: string) {
        record.type = v
      },
      get type() {
        return record.type
      },
      frequency: {
        get value() {
          return record.freq
        },
        set value(v: number) {
          record.freq = v
        },
        setValueAtTime: (v: number) => {
          record.freq = v
        },
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: () => {
        record.started = true
      },
      stop: vi.fn(),
      onended: null,
    }
  }
}

beforeEach(async () => {
  localStorage.clear()
  FakeAudioContext.made = []
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.resetModules()
  player = await import('./player')
  setMuted(false)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the sound set', () => {
  it('covers every moment the game makes a noise', () => {
    expect(Object.keys(SOUNDS()).sort()).toEqual(
      ['lost', 'mark', 'place', 'solved', 'tap', 'wrong'].sort(),
    )
  })

  it('keeps every sound short enough not to overlap play', () => {
    for (const [name, tones] of Object.entries(SOUNDS())) {
      const end = Math.max(...tones.map((t) => t.at + t.dur))
      expect(end, name).toBeLessThanOrEqual(0.9)
    }
  })

  it('stays quiet — nothing plays at full volume', () => {
    for (const [name, tones] of Object.entries(SOUNDS())) {
      for (const tone of tones) expect(tone.gain, name).toBeLessThanOrEqual(0.2)
    }
  })
})

describe('play', () => {
  it('makes one oscillator per tone', () => {
    play('place')
    const context = FakeAudioContext.made[0]
    expect(context.oscillators).toHaveLength(SOUNDS().place.length)
    expect(context.oscillators.every((o) => o.started)).toBe(true)
  })

  it('reuses a single audio engine across sounds', () => {
    play('tap')
    play('mark')
    expect(FakeAudioContext.made).toHaveLength(1)
  })

  it('makes no sound at all while muted', () => {
    setMuted(true)
    play('solved')
    expect(FakeAudioContext.made).toHaveLength(0)
  })

  it('picks up again when unmuted', () => {
    setMuted(true)
    play('tap')
    setMuted(false)
    play('tap')
    expect(FakeAudioContext.made).toHaveLength(1)
  })

  it('wakes a suspended engine, as browsers suspend it until a gesture', () => {
    play('tap')
    const context = FakeAudioContext.made[0]
    context.state = 'suspended'
    play('mark')
    expect(context.resumed).toBeGreaterThan(0)
  })

  it('does nothing when the browser has no audio engine', async () => {
    vi.stubGlobal('AudioContext', undefined)
    vi.resetModules()
    player = await import('./player')
    expect(() => play('solved')).not.toThrow()
  })

  it('survives an audio engine that refuses to start', async () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('blocked')
        }
      },
    )
    vi.resetModules()
    player = await import('./player')
    expect(() => play('tap')).not.toThrow()
  })
})

describe('muting', () => {
  it('starts unmuted', () => {
    expect(isMuted()).toBe(false)
  })

  it('remembers the choice for next time', () => {
    setMuted(true)
    expect(localStorage.getItem(MUTE_KEY)).toBe('1')
    expect(isMuted()).toBe(true)
  })

  it('survives storage it cannot read', () => {
    localStorage.setItem(MUTE_KEY, 'nonsense')
    expect(() => isMuted()).not.toThrow()
  })
})
