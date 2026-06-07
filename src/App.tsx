import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import TimeSlider from './components/TimeSlider'
import { useMapStore } from './store/mapStore'

export default function App() {
  const { sidebarOpen, toggleSidebar, throughputMode } = useMapStore()

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
      {throughputMode && <TimeSlider />}
    </div>
  )
}
