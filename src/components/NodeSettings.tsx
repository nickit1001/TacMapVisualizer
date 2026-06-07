import { useMapStore } from '../store/mapStore'

export default function NodeSettings() {
  const {
    nodes, selectedId, updateNode,
    fleet, assignFleetMemberToBase,
  } = useMapStore()

  const node = nodes.find((n) => n.id === selectedId)
  if (!node) {
    return (
      <div className="px-4 py-5 text-center text-muted text-xs leading-relaxed">
        Select a base to view and edit its settings.
      </div>
    )
  }

  const assignedAircraft = fleet.filter((a) => a.baseId === node.id)
  const availableToAssign = fleet.filter((a) => a.baseId === null)

  return (
    <div className="p-4 space-y-4 border-t border-border" style={{ background: 'var(--color-surface)' }}>
      {/* Base Name */}
      <div>
        <label className="label">Base Name</label>
        <input
          type="text"
          value={node.name}
          onChange={(e) => updateNode(node.id, { name: e.target.value })}
          className="input"
        />
      </div>

      {/* Lat / Lng */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Latitude</label>
          <input type="text" value={node.lat.toFixed(4)} readOnly className="input opacity-50 cursor-default" />
        </div>
        <div>
          <label className="label">Longitude</label>
          <input type="text" value={node.lng.toFixed(4)} readOnly className="input opacity-50 cursor-default" />
        </div>
      </div>

      {/* Radius */}
      <div>
        <label className="label">
          Radius of Action —{' '}
          <span style={{ color: 'var(--color-accent)' }}>{node.radiusNm} NM</span>
        </label>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="number"
            min={0}
            max={2000}
            value={node.radiusNm}
            onChange={(e) => updateNode(node.id, { radiusNm: Math.max(0, Number(e.target.value)) })}
            className="input w-24"
          />
          <span className="text-muted text-xs">NM</span>
        </div>
        <input
          type="range"
          min={0}
          max={2000}
          step={5}
          value={node.radiusNm}
          onChange={(e) => updateNode(node.id, { radiusNm: Number(e.target.value) })}
          className="slider-radius"
        />
      </div>

      {/* Max range ring */}
      <div>
        <label className="label">Max Range Ring</label>
        <button
          onClick={() => updateNode(node.id, { showMaxRange: !node.showMaxRange })}
          className={`btn text-xs px-3 py-2 w-full ${node.showMaxRange ? 'btn-maxrange-active' : 'btn-maxrange'}`}
        >
          ◎ 800 NM ring — {node.showMaxRange ? 'Visible' : 'Hidden'}
        </button>
      </div>

      {/* Assigned aircraft from fleet */}
      <div>
        <label className="label">Stationed Aircraft ({assignedAircraft.length})</label>

        {assignedAircraft.length === 0 ? (
          <div className="text-muted text-xs mb-2">No aircraft stationed here.</div>
        ) : (
          <div className="flex flex-col gap-1 mb-2">
            {assignedAircraft.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between text-xs"
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                }}
              >
                <span>
                  <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{a.name}</span>
                  <span className="text-muted ml-1">· {a.configuration}</span>
                  {a.supplyNodeId && (
                    <span style={{ color: '#FFCC00' }} className="ml-1">· on mission</span>
                  )}
                </span>
                <button
                  onClick={() => assignFleetMemberToBase(a.id, null)}
                  className="text-muted hover:text-accent transition-colors ml-2"
                  title="Remove from base"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {availableToAssign.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) assignFleetMemberToBase(e.target.value, node.id)
            }}
            className="w-full text-xs"
            style={{
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
              padding: '4px 8px',
              borderRadius: '4px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">+ Station aircraft here…</option>
            {availableToAssign.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.configuration}
              </option>
            ))}
          </select>
        )}

        {availableToAssign.length === 0 && fleet.length > 0 && (
          <div className="text-muted text-xs">All fleet aircraft are stationed.</div>
        )}
        {fleet.length === 0 && (
          <div className="text-muted text-xs">Add aircraft in the Fleet section first.</div>
        )}
      </div>
    </div>
  )
}
