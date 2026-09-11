import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as PrefsModule from './prefs'

let prefs: typeof PrefsModule
const KEY = 'test:pref'

beforeEach(async () => {
  localStorage.clear()
  vi.resetModules()
  prefs = await import('./prefs')
})

afterEach(() => vi.unstubAllGlobals())

describe('preferences', () => {
  it('uses the fallback when nothing has been set', () => {
    expect(prefs.readPref(KEY, false)).toBe(false)
    expect(prefs.readPref('other', true)).toBe(true)
  })

  it('remembers a choice', () => {
    prefs.writePref(KEY, true)
    expect(prefs.readPref(KEY, false)).toBe(true)
    expect(localStorage.getItem(KEY)).toBe('1')
  })

  it('distinguishes "set to off" from "never set"', () => {
    prefs.writePref(KEY, false)
    // The fallback is true, but an explicit off must win.
    expect(prefs.readPref(KEY, true)).toBe(false)
  })

  it('tells subscribers when something changes', () => {
    const seen = vi.fn()
    prefs.subscribePrefs(seen)
    prefs.writePref(KEY, true)
    expect(seen).toHaveBeenCalled()
  })

  it('stops telling a subscriber that has unsubscribed', () => {
    const seen = vi.fn()
    prefs.subscribePrefs(seen)()
    prefs.writePref(KEY, true)
    expect(seen).not.toHaveBeenCalled()
  })

  it('falls back rather than throwing when storage refuses', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    })
    vi.resetModules()
    prefs = await import('./prefs')
    expect(prefs.readPref(KEY, true)).toBe(true)
    expect(() => prefs.writePref(KEY, false)).not.toThrow()
  })

  it('defaults the draft hints to off, since they make the run easier', () => {
    expect(prefs.readPref(prefs.OFFER_HINTS_KEY, false)).toBe(false)
  })
})
