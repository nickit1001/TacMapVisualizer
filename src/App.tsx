import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import { useMapStore } from './store/mapStore'

export default function App() {
  const { sidebarOpen, toggleSidebar } = useMapStore()

  return (
    <div className="flex h-full overflow-hidden bg-bg text-primary">
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
  )
}
