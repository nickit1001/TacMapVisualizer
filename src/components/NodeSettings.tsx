import { useMapStore } from '../store/mapStore'

export default function NodeSettings() {
  const { nodes, selectedId, updateNode, updateAircraftConfig } = useMapStore()
  const node = nodes.find((n) => n.id === selectedId)

  if (!node) {
    return (
      <div className="px-4 py-5 text-center text-muted text-xs leading-relaxed">
        Select a base from the list<br />to view and edit its settings.
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5 overflow-y-auto h-full">
      <div>
        <label className="label">Base Name</label>
        <input
          type="text"
          value={node.name}
          onChange={(e) => updateNode(node.id, { name: e.target.value })}
          className="input"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Latitude</label>
          <input
            type="text"
            value={node.lat.toFixed(4)}
            readOnly
            className="input opacity-50 cursor-default"
          />
        </div>
        <div>
          <label className="label">Longitude</label>
          <input
            type="text"
            value={node.lng.toFixed(4)}
            readOnly
            className="input opacity-50 cursor-default"
          />
        </div>
      </div>

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

      <div>
        <label className="label">Max Range Ring</label>
        <button
          onClick={() => updateNode(node.id, { showMaxRange: !node.showMaxRange })}
          className={`btn text-xs px-3 py-2 w-full ${node.showMaxRange ? 'btn-maxrange-active' : 'btn-maxrange'}`}
        >
          ◎ 800 NM ring — {node.showMaxRange ? 'Visible' : 'Hidden'}
        </button>
      </div>

      <div>
        <label className="label">Number of Aircraft</label>
        <input
          type="number"
          min={0}
          max={100}
          value={node.aircraftCount}
          onChange={(e) =>
            updateNode(node.id, { aircraftCount: Math.max(0, Math.floor(Number(e.target.value))) })
          }
          className="input"
        />
      </div>

      {node.aircraft.length > 0 && (
        <div>
          <label className="label mb-2 block">Aircraft Manifest</label>
          <div className="rounded border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="px-3 py-2 text-left text-muted font-medium w-28">Callsign</th>
                  <th className="px-3 py-2 text-left text-muted font-medium">Cargo Type</th>
                </tr>
              </thead>
              <tbody>
                {node.aircraft.map((aircraft, idx) => (
                  <tr
                    key={aircraft.id}
                    style={{ borderTop: idx > 0 ? '1px solid var(--color-border)' : undefined }}
                  >
                    <td
                      className="px-3 py-2 font-mono"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      {aircraft.name}
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        value={aircraft.configuration}
                        placeholder="Cargo..."
                        onChange={(e) =>
                          updateAircraftConfig(node.id, aircraft.id, e.target.value)
                        }
                        className="input-inline"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
