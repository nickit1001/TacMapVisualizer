import { useState, useEffect, useCallback } from 'react'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import MissionSidebar from './components/MissionSidebar'
import TimeSlider from './components/TimeSlider'
import { useMapStore } from './store/mapStore'

export default function App() {
  const { sidebarOpen, toggleSidebar, supplyNodes } = useMapStore()
  const [isPlaying, setIsPlaying] = useState(false)

  // Stop playback when no supply nodes remain
  useEffect(() => {
    if (supplyNodes.length === 0) setIsPlaying(false)
  }, [supplyNodes.length])

  // Spacebar toggles play/pause (ignore when focus is in an input)
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (supplyNodes.length === 0) return
      e.preventDefault()
      setIsPlaying((p) => !p)
    },
    [supplyNodes.length],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // 1 hr per second ticker
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
        <MissionSidebar />
      </div>
      {supplyNodes.length > 0 && (
        <TimeSlider isPlaying={isPlaying} onPlayPause={() => setIsPlaying((p) => !p)} />
      )}
    </div>
  )
}
