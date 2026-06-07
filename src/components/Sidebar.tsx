import { useState } from 'react'
import { save, open } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import L from 'leaflet'
import { useMapStore } from '../store/mapStore'
import type { SaveState } from '../store/mapStore'
import NodeList from './NodeList'
import NodeSettings from './NodeSettings'
import type { AircraftBase, FleetAircraft, SupplyNode } from '../types'
import { FLEET_CONFIGS } from '../types'
import { isTauri } from '../lib/isTauri'
import { buildShareUrl } from '../lib/share'

// ─── Collapsible section header ───────────────────────────────────────────────
function SectionHeader({
  title,
  count,
  open: isOpen,
  onToggle,
}: {
  title: string
  count: number
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="section-header w-full flex items-center justify-between hover:text-accent transition-colors"
      style={{ cursor: 'pointer', userSelect: 'none' }}
    >
      <span>{title} ({count})</span>
      <span style={{ fontSize: '9px' }}>{isOpen ? '▲' : '▼'}</span>
    </button>
  )
}

// ─── Fleet section ────────────────────────────────────────────────────────────
function FleetSection() {
  const {
    fleet, addFleetMember, removeFleetMember,
    updateFleetMember, assignFleetMemberToBase,
    nodes,
  } = useMapStore()

  return (
    <div>
      {fleet.length === 0 ? (
        <div className="px-4 py-3 text-muted text-xs">
          No aircraft in fleet. Add aircraft to begin.
        </div>
      ) : (
        <div className="flex flex-col">
          {fleet.map((a: FleetAircraft) => {
            const base = a.baseId ? nodes.find((n) => n.id === a.baseId) : null
            return (
              <div
                key={a.id}
                className="px-3 py-2 border-b border-border flex flex-col gap-1.5"
                style={{ background: 'var(--color-surface)' }}
              >
                <div className="flex items-center gap-2">
                  {/* Name */}
                  <input
                    type="text"
                    value={a.name}
                    onChange={(e) => updateFleetMember(a.id, { name: e.target.value })}
                    className="input-inline text-xs font-mono flex-1"
                    style={{ color: 'var(--color-accent)', minWidth: 0 }}
                  />
                  {/* Config dropdown */}
                  <select
                    value={a.configuration}
                    onChange={(e) => updateFleetMember(a.id, { configuration: e.target.value })}
                    style={{
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-muted)',
                      fontSize: '11px',
                      padding: '2px 4px',
                      borderRadius: '3px',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {FLEET_CONFIGS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    {!FLEET_CONFIGS.includes(a.configuration as typeof FLEET_CONFIGS[number]) && (
                      <option value={a.configuration}>{a.configuration}</option>
                    )}
                  </select>
                  {/* Remove */}
                  <button
                    onClick={() => removeFleetMember(a.id)}
                    className="text-muted hover:text-accent transition-colors text-base leading-none flex-none"
                    title="Remove aircraft"
                  >
                    ×
                  </button>
                </div>
                {/* Base assignment */}
                <select
                  value={a.baseId ?? ''}
                  onChange={(e) => assignFleetMemberToBase(a.id, e.target.value || null)}
                  style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    color: a.baseId ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    fontSize: '11px',
                    padding: '3px 6px',
                    borderRadius: '3px',
                    width: '100%',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">— Unassigned (no base) —</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
                {a.supplyNodeId && (
                  <div className="text-xs" style={{ color: '#FFCC00' }}>
                    ↗ Assigned to mission
                  </div>
                )}
                {!a.baseId && !a.supplyNodeId && base === null && (
                  <div className="text-muted text-xs">No base — cannot be assigned to a mission</div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <div className="px-3 py-2">
        <button onClick={addFleetMember} className="btn btn-ghost w-full text-xs">
          + Add Aircraft
        </button>
      </div>
    </div>
  )
}

// ─── Supply node list ─────────────────────────────────────────────────────────
function SupplyNodeListSection() {
  const { supplyNodes, selectedSupplyNodeId, selectSupplyNode, deleteSupplyNode, fleet } = useMapStore()

  if (supplyNodes.length === 0) {
    return (
      <div className="px-4 py-3 text-muted text-xs">
        No supply nodes. Use &quot;Place Supply Node&quot; then click the map.
      </div>
    )
  }

  return (
    <div>
      {supplyNodes.map((node: SupplyNode) => {
        const assigned = fleet.filter((a) => a.supplyNodeId === node.id).length
        const isSelected = selectedSupplyNodeId === node.id
        return (
          <div
            key={node.id}
            onClick={() => selectSupplyNode(isSelected ? null : node.id)}
            className="group flex items-center justify-between px-4 py-3 cursor-pointer transition-colors"
            style={{
              background: isSelected ? 'rgba(255,204,0,0.07)' : undefined,
              borderLeft: `2px solid ${isSelected ? '#FFCC00' : 'transparent'}`,
            }}
            onMouseEnter={(e) => {
              if (!isSelected)
                (e.currentTarget as HTMLDivElement).style.background = 'var(--color-surface-hover)'
            }}
            onMouseLeave={(e) => {
              if (!isSelected)
                (e.currentTarget as HTMLDivElement).style.background = ''
            }}
          >
            <div className="min-w-0">
              <div
                className="text-xs font-medium truncate"
                style={{ color: isSelected ? '#FFCC00' : 'var(--color-text-primary)' }}
              >
                {node.name}
              </div>
              <div className="text-muted text-xs mt-0.5">
                {assigned} aircraft · {node.fuelAtSupply ? 'fuel avail' : 'no fuel'}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteSupplyNode(node.id)
              }}
              className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-accent text-base leading-none ml-2 flex-none transition-opacity"
              title="Delete supply node"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
export default function Sidebar() {
  const {
    placementMode, setPlacementMode, nodes,
    measureMode, setMeasureMode, measurePoints,
    sidebarOpen, theme, setTheme,
    fleet, supplyNodes,
    selectedId,
  } = useMapStore()

  const isPlacing = placementMode === 'placing'
  const isPlacingSupply = placementMode === 'placing-supply-node'

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [fleetOpen, setFleetOpen] = useState(true)
  const [basesOpen, setBasesOpen] = useState(true)
  const [supplyNodesOpen, setSupplyNodesOpen] = useState(true)

  // ── Save / Load ──────────────────────────────────────────────────────────
  const { loadState } = useMapStore()

  async function handleSave() {
    const { nodes: n, fleet: f, supplyNodes: s } = useMapStore.getState()
    const data: SaveState = { nodes: n, fleet: f, supplyNodes: s }
    const json = JSON.stringify(data, null, 2)

    if (isTauri()) {
      try {
        const path = await save({
          filters: [{ name: 'TacMap File', extensions: ['json'] }],
          defaultPath: 'map.tacmap.json',
        })
        if (path) await invoke('write_text_file', { path, data: json })
      } catch (err) {
        console.error('Save failed:', err)
      }
    } else {
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'map.tacmap.json'; a.click()
      URL.revokeObjectURL(url)
    }
  }

  async function handleLoad() {
    function parseAndLoad(text: string) {
      try {
        const data = JSON.parse(text)
        // Support old format (bare AircraftBase array)
        if (Array.isArray(data)) {
          loadState({ nodes: data as AircraftBase[], fleet: [], supplyNodes: [] })
        } else {
          loadState({
            nodes: (data.nodes ?? []) as AircraftBase[],
            fleet: (data.fleet ?? []) as FleetAircraft[],
            supplyNodes: (data.supplyNodes ?? []) as SupplyNode[],
          })
        }
      } catch { /* ignore parse errors */ }
    }

    if (isTauri()) {
      try {
        const path = await open({
          filters: [{ name: 'TacMap File', extensions: ['json'] }],
          multiple: false,
        })
        if (typeof path === 'string') {
          const content = await invoke<string>('read_text_file', { path })
          parseAndLoad(content)
        }
      } catch (err) {
        console.error('Load failed:', err)
      }
    } else {
      await new Promise<void>((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'; input.accept = '.json'
        input.onchange = () => {
          const file = input.files?.[0]
          if (!file) return resolve()
          const reader = new FileReader()
          reader.onload = (ev) => { parseAndLoad(ev.target?.result as string); resolve() }
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
      <div
        className="px-4 py-4 border-b border-border flex-none flex items-center justify-between"
        style={{ minWidth: '288px' }}
      >
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
        <div
          className="px-4 py-3 border-b border-border flex-none"
          style={{ minWidth: '288px', background: 'var(--color-surface)' }}
        >
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
      <div
        className="px-3 py-3 border-b border-border flex gap-2 flex-none flex-wrap"
        style={{ minWidth: '288px' }}
      >
        <button
          onClick={() => setPlacementMode(isPlacing ? 'idle' : 'placing')}
          className={`btn flex-1 ${isPlacing ? 'btn-accent-active' : 'btn-accent'}`}
        >
          {isPlacing ? '✕ Cancel' : '+ Place Base'}
        </button>
        <button
          onClick={() => setPlacementMode(isPlacingSupply ? 'idle' : 'placing-supply-node')}
          className={`btn flex-1 ${isPlacingSupply ? 'btn-measure-active' : 'btn-measure'}`}
          style={!isPlacingSupply ? { borderColor: '#FFCC00', color: '#FFCC00' } : {}}
        >
          {isPlacingSupply ? '✕ Cancel' : '⊕ Place Node'}
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
          <button onClick={handleShare} className="btn btn-ghost px-2.5" title="Copy shareable link">
            {copied ? '✓ Copied' : '⬡ Share'}
          </button>
        )}
      </div>

      {/* Measure readout */}
      {measureMode && (
        <div
          className="px-3 py-2 border-b border-border flex-none text-xs"
          style={{ minWidth: '288px', color: '#FFCC00', background: 'rgba(255,204,0,0.06)' }}
        >
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

      {/* Scrollable content area — collapsible sections */}
      <div className="flex-1 overflow-y-auto" style={{ minWidth: '288px' }}>

        {/* Fleet section */}
        <SectionHeader
          title="Fleet"
          count={fleet.length}
          open={fleetOpen}
          onToggle={() => setFleetOpen((v) => !v)}
        />
        {fleetOpen && <FleetSection />}

        {/* Bases section */}
        <SectionHeader
          title="Bases"
          count={nodes.length}
          open={basesOpen}
          onToggle={() => setBasesOpen((v) => !v)}
        />
        {basesOpen && (
          <>
            <NodeList />
            {selectedId && <NodeSettings />}
          </>
        )}

        {/* Supply Nodes section */}
        <SectionHeader
          title="Supply Nodes"
          count={supplyNodes.length}
          open={supplyNodesOpen}
          onToggle={() => setSupplyNodesOpen((v) => !v)}
        />
        {supplyNodesOpen && <SupplyNodeListSection />}
      </div>
    </aside>
  )
}
