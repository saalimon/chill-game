import { useCallback, useEffect, useState } from 'react'
import { dateKey } from '@/game/grid/daily'
import { isFirebaseConfigured } from './app'
import { useAccount } from './auth'
import { fetchStats, pushSolve, readLocalStats, writeLocalStats } from './db'
import { enqueue, flush, pending } from './outbox'
import { applySolve } from './stats'
import type { SolveRecord, Stats } from './types'

/**
 * Keeps finished puzzles and the running totals in step with the database.
 *
 * Every solve is banked locally first and only then sent, so finishing a puzzle
 * on a plane counts immediately and reaches the database whenever the
 * connection comes back.
 */
export function useSync() {
  const account = useAccount()
  const [stats, setStats] = useState<Stats>(readLocalStats)
  const [queued, setQueued] = useState(() => pending().length)

  const send = useCallback(
    async (uid: string) => {
      const result = await flush((record) => pushSolve(uid, record, dateKey()))
      setQueued(result.kept)
      if (result.sent > 0) {
        const fresh = await fetchStats(uid)
        if (fresh) {
          setStats(fresh)
          writeLocalStats(fresh)
        }
      }
    },
    [],
  )

  // Pull the authoritative totals once signed in, then push anything queued.
  useEffect(() => {
    if (!account.ready || !account.uid) return
    let cancelled = false
    void (async () => {
      try {
        const remote = await fetchStats(account.uid!)
        if (remote && !cancelled) {
          setStats(remote)
          writeLocalStats(remote)
        }
        await send(account.uid!)
      } catch {
        // Offline. The local copy stands and the queue waits.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [account.ready, account.uid, send])

  // Retry the queue as soon as the connection returns.
  useEffect(() => {
    if (!account.uid) return
    const onOnline = () => void send(account.uid!).catch(() => {})
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [account.uid, send])

  const recordSolve = useCallback(
    (record: SolveRecord) => {
      const today = dateKey()
      const next = applySolve(readLocalStats(), record, today)
      setStats(next)
      writeLocalStats(next)

      if (!isFirebaseConfigured) return
      enqueue(record)
      setQueued(pending().length)
      if (account.uid) void send(account.uid).catch(() => {})
    },
    [account.uid, send],
  )

  return { account, stats, queued, recordSolve }
}
