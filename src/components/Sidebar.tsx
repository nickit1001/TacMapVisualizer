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
import { calcThroughput, findClosestBase } from '../lib/throughput'

export default function Sidebar() {
  const {
    placementMode, setPlacementMode, loadNodes, nodes,
    measureMode, setMeasureMode, measurePoints,
    sidebarOpen, theme, setTheme,
    throughputMode, setThroughputMode,
    supplyNode, clearSupplyNode,
    missionTime, maxMissionTime, setMaxMissionTime,
    fuelAtSupply, setFuelAtSupply,
    throughputBaseId, setThroughputBaseId,
  } = useMapStore()
  const isPlacing = placementMode === 'placing'
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const resolvedThroughputBase = supplyNode
    ? (throughputBaseId === 'closest'
        ? findClosestBase(nodes, supplyNode)
        : (nodes.find((n) => n.id === throughputBaseId) ?? null))
    : null
  const throughputResult = resolvedThroughputBase && supplyNode
    ? calcThroughput(resolvedThroughputBase, supplyNode, missionTime, fuelAtSupply)
    : null

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
          onClick={() => {
            setPlacementMode(isPlacing ? 'idle' : 'placing')
            if (measureMode) setMeasureMode(false)
          }}
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
        <button
          onClick={() => setThroughputMode(!throughputMode)}
          className={`btn flex-1 ${throughputMode ? 'btn-throughput-active' : 'btn-throughput'}`}
          title="Calculate payload throughput to a supply node"
        >
          {throughputMode ? '✕ Throughput' : '↗ Throughput'}
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

      {/* Throughput panel */}
      {throughputMode && (
        <div
          className="px-3 py-3 border-b border-border flex-none flex flex-col gap-2"
          style={{ minWidth: '288px', background: 'var(--color-surface)' }}
        >
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#4488FF' }}>
            Throughput Analysis
          </div>

          {!supplyNode ? (
            <div className="text-muted text-xs">
              Click the map to place a supply node
            </div>
          ) : (
            <>
              {/* Base selector */}
              <div>
                <label className="label">Source Base</label>
                <select
                  value={throughputBaseId}
                  onChange={(e) => setThroughputBaseId(e.target.value)}
                  style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    width: '100%',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="closest">⟳ Closest Base (auto)</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} — {n.aircraftCount} AC
                    </option>
                  ))}
                </select>
              </div>

              {/* Fuel at supply toggle */}
              <label
                className="flex items-center gap-2 text-xs cursor-pointer"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <input
                  type="checkbox"
                  checked={fuelAtSupply}
                  onChange={(e) => setFuelAtSupply(e.target.checked)}
                  style={{ accentColor: '#4488FF', cursor: 'pointer' }}
                />
                Fuel available at supply node
              </label>

              {/* Max time */}
              <div className="flex items-center gap-2">
                <label className="label mb-0">Max time</label>
                <input
                  type="number"
                  min={1}
                  max={240}
                  step={1}
                  value={Math.round(maxMissionTime / 60)}
                  onChange={(e) => setMaxMissionTime(Math.max(1, Number(e.target.value)) * 60)}
                  className="input"
                  style={{ width: '60px' }}
                />
                <span className="text-muted text-xs">hours</span>
              </div>

              {/* Stats readout */}
              {throughputResult ? (
                <div
                  className="rounded text-xs"
                  style={{
                    background: 'rgba(68,136,255,0.07)',
                    border: '1px solid rgba(68,136,255,0.2)',
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  <div className="text-muted">
                    Distance:{' '}
                    <strong style={{ color: 'var(--color-text-primary)' }}>
                      {throughputResult.distanceNm.toFixed(1)} NM
                    </strong>
                  </div>
                  <div className="text-muted">
                    Payload/trip:{' '}
                    <strong style={{ color: 'var(--color-text-primary)' }}>
                      {throughputResult.payloadPerTrip.toFixed(0)} lbs
                    </strong>
                  </div>
                  <div className="text-muted">
                    Trips completed:{' '}
                    <strong style={{ color: 'var(--color-text-primary)' }}>
                      {throughputResult.tripsCompleted}
                    </strong>
                  </div>
                  <div>
                    Total delivered:{' '}
                    <strong style={{ color: '#FFCC00' }}>
                      {throughputResult.totalPayloadDelivered.toLocaleString('en-US', {
                        maximumFractionDigits: 0,
                      })}{' '}
                      lbs
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="text-muted text-xs">
                  {resolvedThroughputBase
                    ? `${resolvedThroughputBase.name} has 0 aircraft`
                    : 'No bases on map'}
                </div>
              )}

              {/* Clear supply node */}
              <button
                onClick={clearSupplyNode}
                className="btn btn-ghost text-xs"
                style={{ fontSize: '11px' }}
              >
                ✕ Clear Supply Node
              </button>
            </>
          )}
        </div>
      )}

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
