import { describe, expect, it } from 'vitest'
import { mulberry32 } from './rng'
import { pickToken, TOKEN_IDS, TOKEN_INKS } from './tokens'

describe('pickToken', () => {
  it('picks a known glyph and a known ink', () => {
    const token = pickToken(mulberry32(1))
    expect(TOKEN_IDS).toContain(token.id)
    expect(TOKEN_INKS).toContain(token.ink)
  })

  it('is deterministic for a given seed', () => {
    expect(pickToken(mulberry32(42))).toEqual(pickToken(mulberry32(42)))
  })

  it('reaches every glyph across many seeds', () => {
    const seen = new Set(
      Array.from({ length: 2000 }, (_, i) => pickToken(mulberry32(i)).id),
    )
    expect(seen.size).toBe(TOKEN_IDS.length)
  })

  it('reaches every ink across many seeds', () => {
    const seen = new Set(
      Array.from({ length: 2000 }, (_, i) => pickToken(mulberry32(i)).ink),
    )
    expect(seen.size).toBe(TOKEN_INKS.length)
  })

  it('offers enough glyphs that boards do not feel repetitive', () => {
    expect(TOKEN_IDS.length).toBeGreaterThanOrEqual(12)
    expect(new Set(TOKEN_IDS).size).toBe(TOKEN_IDS.length)
  })
})
