import { beforeEach, describe, expect, it, vi } from 'vitest'
import { enqueue, flush, pending, OUTBOX_KEY } from './outbox'
import type { SolveRecord } from './types'

const record = (id: string): SolveRecord => ({
  id,
  game: 'queens',
  size: 7,
  seed: 123,
  genVersion: 1,
  difficulty: 'medium',
  timeMs: 60_000,
  hintsUsed: 0,
  completedAt: 1_700_000_000_000,
  mode: 'free',
  moves: [{ t: 10, r: 0, c: 0, s: 2 }],
})

beforeEach(() => localStorage.clear())

describe('enqueue', () => {
  it('keeps a solve that has not been sent yet', () => {
    enqueue(record('a'))
    expect(pending().map((r) => r.id)).toEqual(['a'])
  })

  it('survives a page reload, because it lives in localStorage', () => {
    enqueue(record('a'))
    expect(JSON.parse(localStorage.getItem(OUTBOX_KEY)!)).toHaveLength(1)
  })

  it('does not queue the same solve twice', () => {
    enqueue(record('a'))
    enqueue(record('a'))
    expect(pending()).toHaveLength(1)
  })

  it('drops the oldest entries rather than growing without limit', () => {
    for (let i = 0; i < 60; i++) enqueue(record(`s${i}`))
    const ids = pending().map((r) => r.id)
    expect(ids).toHaveLength(50)
    expect(ids[0]).toBe('s10')
  })

  it('recovers from corrupted storage instead of throwing', () => {
    localStorage.setItem(OUTBOX_KEY, 'not json')
    expect(() => enqueue(record('a'))).not.toThrow()
    expect(pending()).toHaveLength(1)
  })
})

describe('flush', () => {
  it('sends every queued solve and empties the queue', async () => {
    enqueue(record('a'))
    enqueue(record('b'))
    const send = vi.fn().mockResolvedValue(undefined)

    const result = await flush(send)

    expect(send).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ sent: 2, kept: 0 })
    expect(pending()).toEqual([])
  })

  it('keeps a solve that failed to send, so it goes out next time', async () => {
    enqueue(record('a'))
    enqueue(record('b'))
    const send = vi.fn(async (r: SolveRecord) => {
      if (r.id === 'b') throw new Error('offline')
    })

    const result = await flush(send)

    expect(result).toEqual({ sent: 1, kept: 1 })
    expect(pending().map((r) => r.id)).toEqual(['b'])
  })

  it('does nothing when the queue is empty', async () => {
    const send = vi.fn()
    expect(await flush(send)).toEqual({ sent: 0, kept: 0 })
    expect(send).not.toHaveBeenCalled()
  })

  it('sends solves in the order they were played', async () => {
    enqueue(record('a'))
    enqueue(record('b'))
    const order: string[] = []
    await flush(async (r) => void order.push(r.id))
    expect(order).toEqual(['a', 'b'])
  })
})
