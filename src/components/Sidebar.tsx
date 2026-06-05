import { useState } from 'react'
import { save, open } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import L from 'leaflet'
import { useMapStore } from '../store/mapStore'
import NodeList from './NodeList'
import NodeSettings from './NodeSettings'
import type { AircraftBase } from '../types'
import { isTauri } from '../lib/isTauri'
import { buildShareUrl } from '../lib/share'

export default function Sidebar() {
  const {
    placementMode, setPlacementMode, loadNodes, nodes,
    measureMode, setMeasureMode, measurePoints,
    sidebarOpen, theme, setTheme,
  } = useMapStore()
  const isPlacing = placementMode === 'placing'
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleSave() {
    if (isTauri()) {
      try {
        const path = await save({
          filters: [{ name: 'TacMap File', extensions: ['json'] }],
          defaultPath: 'map.tacmap.json',
        })
        if (path) {
          await invoke('write_text_file', { path, data: JSON.stringify(nodes, null, 2) })
        }
      } catch (err) {
        console.error('Save failed:', err)
      }
    } else {
      const blob = new Blob([JSON.stringify(nodes, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'map.tacmap.json'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  async function handleLoad() {
    if (isTauri()) {
      try {
        const path = await open({
          filters: [{ name: 'TacMap File', extensions: ['json'] }],
          multiple: false,
        })
        if (typeof path === 'string') {
          const content = await invoke<string>('read_text_file', { path })
          const parsed = JSON.parse(content) as AircraftBase[]
          loadNodes(parsed)
        }
      } catch (err) {
        console.error('Load failed:', err)
      }
    } else {
      await new Promise<void>((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        input.onchange = () => {
          const file = input.files?.[0]
          if (!file) return resolve()
          const reader = new FileReader()
          reader.onload = (ev) => {
            try {
              loadNodes(JSON.parse(ev.target?.result as string) as AircraftBase[])
            } catch {}
            resolve()
          }
          reader.readAsText(file)
        }
        input.click()
      })
    }
  }

  function handleShare() {
    const url = buildShareUrl(nodes)
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <aside
      className="flex flex-col h-full flex-none border-r border-border"
      style={{
        width: sidebarOpen ? '288px' : '0',
        overflow: 'hidden',
        transition: 'width 0.2s ease',
        background: 'var(--color-bg)',
        minWidth: 0,
      }}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b border-border flex-none flex items-center justify-between" style={{ minWidth: '288px' }}>
        <div>
          <div
            className="text-sm font-bold tracking-widest uppercase"
            style={{ color: 'var(--color-accent)', textShadow: '0 0 10px rgba(204,0,51,0.4)' }}
          >
            TacMap
          </div>
          <div className="text-muted text-xs mt-0.5 tracking-wide">Aircraft Base Visualizer</div>
        </div>
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="text-muted text-base hover:text-accent transition-colors px-1"
          title="Settings"
          style={{ lineHeight: 1 }}
        >
          ⚙
        </button>
      </div>

      {/* Settings panel */}
      {settingsOpen && (
        <div className="px-4 py-3 border-b border-border flex-none" style={{ minWidth: '288px', background: 'var(--color-surface)' }}>
          <label className="label mb-2">Theme</label>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('dark')}
              className={`btn flex-1 text-xs ${theme === 'dark' ? 'btn-accent-active' : 'btn-ghost'}`}
            >
              ◾ Dark
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`btn flex-1 text-xs ${theme === 'light' ? 'btn-accent-active' : 'btn-ghost'}`}
            >
              ◽ Light
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="px-3 py-3 border-b border-border flex gap-2 flex-none flex-wrap" style={{ minWidth: '288px' }}>
        <button
          onClick={() => { setPlacementMode(isPlacing ? 'idle' : 'placing'); if (measureMode) setMeasureMode(false) }}
          className={`btn flex-1 ${isPlacing ? 'btn-accent-active' : 'btn-accent'}`}
        >
          {isPlacing ? '✕ Cancel' : '+ Place Base'}
        </button>
        <button
          onClick={() => setMeasureMode(!measureMode)}
          className={`btn flex-1 ${measureMode ? 'btn-measure-active' : 'btn-measure'}`}
          title="Click two points on the map to measure distance in NM"
        >
          {measureMode ? '✕ Measure' : '⟺ Measure'}
        </button>
        <button onClick={handleLoad} className="btn btn-ghost px-2.5" title="Load map from file">
          ↑ Load
        </button>
        <button onClick={handleSave} className="btn btn-ghost px-2.5" title="Save map to file">
          ↓ Save
        </button>
        {!isTauri() && (
          <button onClick={handleShare} className="btn btn-ghost px-2.5" title="Copy shareable link to clipboard">
            {copied ? '✓ Copied' : '⬡ Share'}
          </button>
        )}
      </div>

      {/* Measure readout */}
      {measureMode && (
        <div className="px-3 py-2 border-b border-border flex-none text-xs" style={{ minWidth: '288px', color: '#FFCC00', background: 'rgba(255,204,0,0.06)' }}>
          {measurePoints.length === 0 && 'Click a point on the map'}
          {measurePoints.length === 1 && 'Click a second point'}
          {measurePoints.length === 2 && (() => {
            const d = L.latLng(measurePoints[0].lat, measurePoints[0].lng).distanceTo(
              L.latLng(measurePoints[1].lat, measurePoints[1].lng)
            )
            return `Distance: ${(d / 1852).toFixed(1)} NM`
          })()}
        </div>
      )}

      {/* Node list */}
      <div
        className="flex flex-col border-b border-border flex-none"
        style={{ maxHeight: '38%', minWidth: '288px' }}
      >
        <div className="section-header">Bases ({nodes.length})</div>
        <NodeList />
      </div>

      {/* Settings panel */}
      <div className="flex flex-col flex-1 overflow-hidden" style={{ minWidth: '288px' }}>
        <div className="section-header">Settings</div>
        <div className="flex-1 overflow-y-auto">
          <NodeSettings />
        </div>
      </div>
    </aside>
  )
}
