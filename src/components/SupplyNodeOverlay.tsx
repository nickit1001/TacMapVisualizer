import L from 'leaflet'
import { useRef } from 'react'
import { Marker, Polyline, CircleMarker, Tooltip } from 'react-leaflet'
import { useMapStore } from '../store/mapStore'
import { calcMissionThroughput, type AircraftPhase } from '../lib/throughput'
import type { SupplyNode } from '../types'

const PHASE_COLORS: Record<AircraftPhase, string> = {
  setup: '#666688',
  outbound: '#4488FF',
  'at-supply': '#FFCC00',
  return: '#44FF88',
  refueling: '#666688',
}

function makeSupplyIcon(selected: boolean) {
  const color = selected ? '#FFCC00' : '#AA8800'
  const glow = selected
    ? '0 0 12px rgba(255,204,0,0.8)'
    : '0 0 6px rgba(170,136,0,0.5)'
  return L.divIcon({
    className: '',
    html: `<div style="
      width:22px;height:22px;
      border:2px solid ${color};
      border-radius:50%;
      box-shadow:${glow};
      background:${selected ? 'rgba(255,204,0,0.12)' : 'rgba(170,136,0,0.06)'};
      position:relative;
      cursor:grab;
    ">
      <div style="position:absolute;top:50%;left:3px;right:3px;height:1px;background:${color};transform:translateY(-50%);"></div>
      <div style="position:absolute;left:50%;top:3px;bottom:3px;width:1px;background:${color};transform:translateX(-50%);"></div>
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

function SupplyNodeMarker({ node }: { node: SupplyNode }) {
  const { selectedSupplyNodeId, selectSupplyNode, updateSupplyNode, fleet, nodes, missionTime } = useMapStore()
  const isSelected = selectedSupplyNodeId === node.id
  const draggingRef = useRef(false)

  const assignedAircraft = fleet.filter((a) => a.supplyNodeId === node.id)
  const mission = assignedAircraft.length > 0
    ? calcMissionThroughput(node, assignedAircraft, nodes, missionTime)
    : null

  return (
    <>
      {/* Supply node marker */}
      <Marker
        position={[node.lat, node.lng]}
        icon={makeSupplyIcon(isSelected)}
        zIndexOffset={isSelected ? 900 : 0}
        draggable={true}
        eventHandlers={{
          click: () => {
            if (!draggingRef.current) selectSupplyNode(isSelected ? null : node.id)
          },
          dragstart: () => { draggingRef.current = true },
          dragend: (e) => {
            const pos = (e.target as L.Marker).getLatLng()
            updateSupplyNode(node.id, { lat: pos.lat, lng: pos.lng })
            setTimeout(() => { draggingRef.current = false }, 0)
          },
        }}
      >
        <Tooltip permanent direction="top" offset={[0, -14]} className="node-label-name">
          {node.name}
        </Tooltip>
      </Marker>

      {/* Per-aircraft routes and dots (only when there's a mission) */}
      {mission?.aircraftResults.map((r) => (
        r.base && (
          <div key={r.aircraft.id}>
            {/* Route line from base to supply node */}
            <Polyline
              positions={[[r.base.lat, r.base.lng], [node.lat, node.lng]]}
              pathOptions={{
                color: isSelected ? '#FFCC00' : '#AA8800',
                weight: 1.5,
                dashArray: '7 5',
                opacity: isSelected ? 0.6 : 0.35,
              }}
            />
            {/* Aircraft dot */}
            <CircleMarker
              center={[r.state.lat, r.state.lng]}
              radius={7}
              pathOptions={{
                color: PHASE_COLORS[r.state.phase],
                fillColor: PHASE_COLORS[r.state.phase],
                fillOpacity: 0.88,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} className="measure-result-label">
                <div style={{ fontFamily: 'Courier New, monospace', fontSize: '11px', lineHeight: '1.5' }}>
                  <div style={{ color: PHASE_COLORS[r.state.phase], fontWeight: 700 }}>
                    {r.aircraft.name} · {r.aircraft.configuration}
                  </div>
                  <div>{r.base.name} → {node.name}</div>
                  <div>
                    {r.state.phase === 'setup'
                      ? 'Setting up'
                      : `Trip ${r.state.tripNumber + 1} · ${r.state.phase}`}
                  </div>
                  <div style={{ color: '#FFCC00' }}>
                    {r.tripsCompleted > 0
                      ? `${r.payloadDelivered.toLocaleString('en-US', { maximumFractionDigits: 0 })} lbs`
                      : 'No deliveries yet'}
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          </div>
        )
      ))}
    </>
  )
}

export default function SupplyNodeOverlay() {
  const { supplyNodes } = useMapStore()
  return (
    <>
      {supplyNodes.map((node) => (
        <SupplyNodeMarker key={node.id} node={node} />
      ))}
    </>
  )
}
