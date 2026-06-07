import { useMapStore } from '../store/mapStore'
import { calcMissionThroughput, type AircraftPhase } from '../lib/throughput'

const PHASE_COLORS: Record<AircraftPhase, string> = {
  setup: '#7777AA',
  outbound: '#4488FF',
  'at-supply': '#FFCC00',
  return: '#44FF88',
  refueling: '#7777AA',
}

const PHASE_LABELS: Record<AircraftPhase, string> = {
  setup: 'Setting up',
  outbound: 'Outbound',
  'at-supply': 'At supply',
  return: 'Return',
  refueling: 'Refueling',
}

export default function MissionSidebar() {
  const {
    selectedSupplyNodeId, selectSupplyNode,
    supplyNodes, updateSupplyNode, deleteSupplyNode,
    fleet, assignFleetMemberToSupplyNode,
    nodes, missionTime,
  } = useMapStore()

  const supplyNode = supplyNodes.find((n) => n.id === selectedSupplyNodeId) ?? null
  const isOpen = supplyNode !== null

  const assignedAircraft = supplyNode
    ? fleet.filter((a) => a.supplyNodeId === supplyNode.id)
    : []

  const availableToAssign = supplyNode
    ? fleet.filter((a) => a.supplyNodeId === null && a.baseId !== null)
    : []

  const mission =
    supplyNode && assignedAircraft.length > 0
      ? calcMissionThroughput(supplyNode, assignedAircraft, nodes, missionTime)
      : null

  return (
    <aside
      className="flex flex-col h-full flex-none border-l border-border"
      style={{
        width: isOpen ? '300px' : '0',
        overflow: 'hidden',
        transition: 'width 0.2s ease',
        background: 'var(--color-bg)',
        minWidth: 0,
      }}
    >
      {supplyNode && (
        <>
          {/* Header */}
          <div
            className="px-4 py-3 border-b border-border flex-none flex items-center justify-between"
            style={{ minWidth: '300px' }}
          >
            <div>
              <div className="text-xs uppercase tracking-widest font-bold" style={{ color: '#FFCC00' }}>
                Mission
              </div>
              <input
                type="text"
                value={supplyNode.name}
                onChange={(e) => updateSupplyNode(supplyNode.id, { name: e.target.value })}
                className="input-inline text-sm font-medium mt-0.5"
                style={{ color: 'var(--color-text-primary)', width: '160px' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => deleteSupplyNode(supplyNode.id)}
                className="text-accent text-base leading-none hover:opacity-70 transition-opacity"
                title="Delete supply node"
              >
                🗑
              </button>
              <button
                onClick={() => selectSupplyNode(null)}
                className="text-muted hover:text-accent transition-colors text-sm leading-none"
                title="Close mission panel"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto" style={{ minWidth: '300px' }}>

            {/* Supply node settings */}
            <div className="px-4 py-3 border-b border-border">
              <label className="label">Location</label>
              <div className="text-muted text-xs font-mono">
                {supplyNode.lat.toFixed(4)}, {supplyNode.lng.toFixed(4)}
              </div>
              <label
                className="flex items-center gap-2 text-xs cursor-pointer mt-3"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <input
                  type="checkbox"
                  checked={supplyNode.fuelAtSupply}
                  onChange={(e) => updateSupplyNode(supplyNode.id, { fuelAtSupply: e.target.checked })}
                  style={{ accentColor: '#4488FF', cursor: 'pointer' }}
                />
                Fuel available at supply node (+10 min/trip)
              </label>
            </div>

            {/* Assigned aircraft */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Assigned Aircraft ({assignedAircraft.length})</label>
              </div>

              {assignedAircraft.length === 0 ? (
                <div className="text-muted text-xs">No aircraft assigned to this mission.</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {assignedAircraft.map((a) => {
                    const base = a.baseId ? nodes.find((n) => n.id === a.baseId) : null
                    return (
                      <div
                        key={a.id}
                        className="flex items-center justify-between text-xs"
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '4px',
                          padding: '5px 8px',
                        }}
                      >
                        <div>
                          <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{a.name}</span>
                          <span className="text-muted ml-1">· {a.configuration}</span>
                          {base && (
                            <span className="text-muted ml-1">· from {base.name}</span>
                          )}
                          {!base && (
                            <span style={{ color: '#CC6600' }} className="ml-1">· no base</span>
                          )}
                        </div>
                        <button
                          onClick={() => assignFleetMemberToSupplyNode(a.id, null)}
                          className="text-muted hover:text-accent transition-colors ml-2"
                          title="Remove from mission"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {availableToAssign.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) assignFleetMemberToSupplyNode(e.target.value, supplyNode.id)
                  }}
                  className="mt-2 w-full text-xs"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-muted)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">+ Add aircraft to mission…</option>
                  {availableToAssign.map((a) => {
                    const base = a.baseId ? nodes.find((n) => n.id === a.baseId) : null
                    return (
                      <option key={a.id} value={a.id}>
                        {a.name} · {a.configuration}{base ? ` (${base.name})` : ''}
                      </option>
                    )
                  })}
                </select>
              )}

              {availableToAssign.length === 0 && assignedAircraft.length === 0 && (
                <div className="text-muted text-xs mt-2">
                  Assign aircraft to bases in the Fleet section first.
                </div>
              )}
            </div>

            {/* Mission status */}
            {mission && (
              <div className="px-4 py-3">
                <label className="label">Mission Status</label>

                {/* Aggregate */}
                <div
                  className="text-xs rounded mb-3"
                  style={{
                    background: 'rgba(255,204,0,0.06)',
                    border: '1px solid rgba(255,204,0,0.2)',
                    padding: '8px 10px',
                  }}
                >
                  <div className="flex justify-between">
                    <span className="text-muted">Total delivered</span>
                    <strong style={{ color: '#FFCC00' }}>
                      {mission.totalPayloadDelivered.toLocaleString('en-US', { maximumFractionDigits: 0 })} lbs
                    </strong>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-muted">Total trips</span>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{mission.totalTrips}</strong>
                  </div>
                </div>

                {/* Per-aircraft rows */}
                <div className="flex flex-col gap-2">
                  {mission.aircraftResults.map((r) => (
                    <div
                      key={r.aircraft.id}
                      className="text-xs rounded"
                      style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        padding: '8px 10px',
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
                          {r.aircraft.name}
                        </span>
                        <span
                          className="font-medium"
                          style={{ color: PHASE_COLORS[r.state.phase] }}
                        >
                          {PHASE_LABELS[r.state.phase]}
                        </span>
                      </div>
                      <div className="flex justify-between text-muted">
                        <span>{r.base ? r.base.name : <span style={{ color: '#CC6600' }}>No base</span>}</span>
                        <span>{r.distanceNm > 0 ? `${r.distanceNm.toFixed(0)} NM` : '—'}</span>
                      </div>
                      <div className="flex justify-between text-muted mt-1">
                        <span>Trips: <strong style={{ color: 'var(--color-text-primary)' }}>{r.tripsCompleted}</strong></span>
                        <span>
                          <strong style={{ color: '#FFCC00' }}>
                            {r.payloadDelivered.toLocaleString('en-US', { maximumFractionDigits: 0 })} lbs
                          </strong>
                        </span>
                      </div>
                      {r.distanceNm > 0 && (
                        <div className="flex justify-between text-muted mt-1">
                          <span>Payload/trip</span>
                          <span>{r.payloadPerTrip.toFixed(0)} lbs</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!mission && assignedAircraft.length > 0 && (
              <div className="px-4 py-3 text-muted text-xs">
                Scrub the time slider to start the simulation.
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
