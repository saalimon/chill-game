import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useSync } from '@/lib/firebase/useSync'
import { Home } from './Home'
import { DailyRoute, PlayRoute } from './PlayRoute'

export function App() {
  const { account, stats, queued, recordSolve } = useSync()

  return (
    <HashRouter>
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
