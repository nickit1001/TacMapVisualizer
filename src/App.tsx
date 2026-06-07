import { useState, useEffect, useCallback } from 'react'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import TimeSlider from './components/TimeSlider'
import { useMapStore } from './store/mapStore'

export default function App() {
  const { sidebarOpen, toggleSidebar, throughputMode } = useMapStore()
  const [isPlaying, setIsPlaying] = useState(false)

  // Stop playback when throughput mode turns off
  useEffect(() => {
    if (!throughputMode) setIsPlaying(false)
  }, [throughputMode])

  // Spacebar toggles play/pause (ignore when focus is in an input)
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (!throughputMode) return
      e.preventDefault()
      setIsPlaying((p) => !p)
    },
    [throughputMode],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // 1 hr per second ticker using getState() to avoid stale closures
  useEffect(() => {
    if (!isPlaying) return
    const id = window.setInterval(() => {
      const { missionTime, maxMissionTime, setMissionTime } = useMapStore.getState()
      const next = Math.min(missionTime + 60, maxMissionTime)
      setMissionTime(next)
      if (next >= maxMissionTime) setIsPlaying(false)
    }, 1000)
    return () => window.clearInterval(id)
  }, [isPlaying])

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg text-primary">
      <div className="flex flex-1 overflow-hidden min-h-0">
        <Sidebar />
        <main className="flex-1 relative overflow-hidden">
          <button
            onClick={toggleSidebar}
            className="sidebar-toggle-tab"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
          <MapView />
        </main>
      </div>
      {throughputMode && <TimeSlider isPlaying={isPlaying} onPlayPause={() => setIsPlaying((p) => !p)} />}
    </div>
  )
}
