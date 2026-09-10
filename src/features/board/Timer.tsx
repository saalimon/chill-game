import { useEffect, useRef } from 'react'
import { formatDuration } from '@/lib/format'

/**
 * The running clock.
 *
 * It writes to its own node instead of holding React state, because a ticking
 * timer in state would re-render the whole board — up to 81 cells — twice a
 * second for a changing digit.
 */
export function Timer({ read, frozenMs }: { read: () => number; frozenMs: number | null }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const show = (ms: number) => {
      if (ref.current) ref.current.textContent = formatDuration(ms)
    }
    if (frozenMs !== null) {
      show(frozenMs)
      return
    }
    show(read())
    const id = setInterval(() => show(read()), 500)
    return () => clearInterval(id)
  }, [read, frozenMs])

  return <span ref={ref}>0:00</span>
}
