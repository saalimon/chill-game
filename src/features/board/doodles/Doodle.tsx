import type { TokenId } from '@/game/starbattle/tokens'
import { GLYPHS } from './glyphs'

/**
 * Every glyph, defined once.
 *
 * A 9x9 board draws the same doodle 81 times. Defining each one as a `<symbol>`
 * here and referencing it with `<use>` keeps a single copy of the path data in
 * the document instead of eighty-one.
 */
export function DoodleSprite() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <defs>
        {Object.entries(GLYPHS).map(([id, glyph]) => (
          <symbol key={id} id={`dd-${id}`} viewBox="0 0 24 24">
            <path
              d={glyph.d}
              fill={glyph.mode === 'fill' ? 'currentColor' : 'none'}
              stroke={glyph.mode === 'stroke' ? 'currentColor' : 'none'}
              strokeWidth={glyph.width ?? 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </symbol>
        ))}
      </defs>
    </svg>
  )
}

/** One drawn glyph, inheriting its colour from the surrounding text colour. */
export function Doodle({ id, className }: { id: TokenId; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <use href={`#dd-${id}`} />
    </svg>
  )
}

export const glyphLabel = (id: TokenId): string => GLYPHS[id].label
