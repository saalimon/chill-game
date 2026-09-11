import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useSync } from '@/lib/firebase/useSync'
import { useAppUpdate } from '@/lib/pwa/useAppUpdate'
import { Home } from './Home'
import { DailyRoute, PlayRoute } from './PlayRoute'
import { UpdateBanner } from './UpdateBanner'

/**
 * Takes a new build as soon as one is ready, but only from the games list.
 *
 * A reload mid-puzzle would throw away the board the player is working on, so
 * everywhere else the banner waits for them to choose the moment.
 */
function Updates() {
  const { ready, apply } = useAppUpdate()
  const onGamesList = useLocation().pathname === '/'

  useEffect(() => {
    if (ready && onGamesList) apply()
  }, [ready, onGamesList, apply])

  if (!ready || onGamesList) return null
  return <UpdateBanner onApply={apply} />
}

export function App() {
  const { account, stats, queued, recordSolve } = useSync()

  return (
    <HashRouter>
      <Updates />
      <Routes>
        <Route path="/" element={<Home account={account} stats={stats} queued={queued} />} />
        <Route path="/play/:game/:size" element={<PlayRoute onSolved={recordSolve} />} />
        <Route path="/daily" element={<DailyRoute onSolved={recordSolve} />} />
        {/* The play URL used to be /play/:size, before there was a second game. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
