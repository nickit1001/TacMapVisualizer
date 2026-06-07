import L from 'leaflet'
import { useRef } from 'react'
import { Marker, Polyline, CircleMarker, Tooltip } from 'react-leaflet'
import { useMapStore } from '../store/mapStore'
import { calcThroughput, findClosestBase, type AircraftPhase } from '../lib/throughput'

const supplyNodeIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:22px;height:22px;
    border:2px solid #FFCC00;
    border-radius:50%;
    box-shadow:0 0 10px rgba(255,204,0,0.7);
    position:relative;
    background:rgba(255,204,0,0.08);
    cursor:grab;
  ">
    <div style="position:absolute;top:50%;left:3px;right:3px;height:1px;background:#FFCC00;transform:translateY(-50%);"></div>
    <div style="position:absolute;left:50%;top:3px;bottom:3px;width:1px;background:#FFCC00;transform:translateX(-50%);"></div>
  </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

const PHASE_COLORS: Record<AircraftPhase, string> = {
  setup: '#666688',
  outbound: '#4488FF',
  'at-supply': '#FFCC00',
  return: '#44FF88',
  refueling: '#666688',
}

export default function ThroughputOverlay() {
  const {
    throughputMode, supplyNode, setSupplyNode,
    nodes, throughputBaseId, fuelAtSupply, missionTime,
  } = useMapStore()

  const draggingRef = useRef(false)

  if (!supplyNode) return null

  const resolvedBase =
    throughputBaseId === 'closest'
      ? findClosestBase(nodes, supplyNode)
      : (nodes.find((n) => n.id === throughputBaseId) ?? null)

  const result = throughputMode && resolvedBase
    ? calcThroughput(resolvedBase, supplyNode, missionTime, fuelAtSupply)
    : null

  const dotColor = result ? PHASE_COLORS[result.aircraftState.phase] : '#666688'
  const tripLabel =
    result?.aircraftState.phase === 'setup'
      ? 'Setting up'
      : result
        ? `Trip ${result.aircraftState.tripNumber + 1}`
        : ''

  return (
    <>
      {/* Supply node marker — always visible, draggable */}
      <Marker
        position={[supplyNode.lat, supplyNode.lng]}
        icon={supplyNodeIcon}
        draggable={true}
        eventHandlers={{
          dragstart: () => { draggingRef.current = true },
          dragend: (e) => {
            const pos = (e.target as L.Marker).getLatLng()
            setSupplyNode(pos.lat, pos.lng)
            setTimeout(() => { draggingRef.current = false }, 0)
          },
        }}
      >
        <Tooltip direction="top" offset={[0, -14]} className="measure-result-label">
          Supply Node
        </Tooltip>
      </Marker>

      {/* The rest only renders when throughput mode is active */}
      {throughputMode && resolvedBase && (
        <Polyline
          positions={[
            [resolvedBase.lat, resolvedBase.lng],
            [supplyNode.lat, supplyNode.lng],
          ]}
          pathOptions={{
            color: '#FFCC00',
            weight: 1.5,
            dashArray: '7 5',
            opacity: 0.55,
          }}
        />
      )}

      {throughputMode && result && resolvedBase && resolvedBase.aircraftCount > 0 && (
        <CircleMarker
          center={[result.aircraftState.lat, result.aircraftState.lng]}
          radius={9}
          pathOptions={{
            color: dotColor,
            fillColor: dotColor,
            fillOpacity: 0.88,
            weight: 2,
          }}
        >
          <Tooltip direction="top" offset={[0, -12]} className="measure-result-label">
            <div style={{ fontFamily: 'Courier New, monospace', fontSize: '11px', lineHeight: '1.5' }}>
              <div style={{ color: dotColor, fontWeight: 700 }}>{resolvedBase.aircraftCount}× Aircraft</div>
              <div>{tripLabel}</div>
              <div style={{ color: '#FFCC00' }}>
                {result.tripsCompleted > 0
                  ? `${(result.tripsCompleted * result.payloadPerTrip * resolvedBase.aircraftCount).toLocaleString('en-US', { maximumFractionDigits: 0 })} lbs delivered`
                  : 'No deliveries yet'}
              </div>
            </div>
          </Tooltip>
        </CircleMarker>
      )}
    </>
  )
}
