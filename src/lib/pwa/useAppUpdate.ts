import { useCallback, useEffect, useState } from 'react'
import { applyUpdate, forceRefresh, isUpdateReady, start, subscribe } from './updates'

/**
 * Whether a newer build is waiting, and the two ways to take it.
 *
 * Registration starts once for the life of the page; React just watches.
 */
export function useAppUpdate() {
  const [ready, setReady] = useState(isUpdateReady)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const unsubscribe = subscribe(setReady)
    let stop: (() => void) | undefined
    void start().then((fn) => {
      stop = fn
    })
    return () => {
      unsubscribe()
      stop?.()
    }
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await forceRefresh()
  }, [])

  return { ready, apply: applyUpdate, refresh, refreshing }
}
