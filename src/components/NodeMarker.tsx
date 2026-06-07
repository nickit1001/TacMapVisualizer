import { Circle, Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { useRef } from 'react'
import type { AircraftBase } from '../types'
import { useMapStore } from '../store/mapStore'

const NM_TO_METERS = 1852
const MAX_RANGE_NM = 800

function makeMarkerIcon(selected: boolean) {
  const size = selected ? 14 : 11
  const color = '#CC0033'
  const glow = selected
    ? '0 0 10px rgba(204,0,51,0.9), 0 0 20px rgba(204,0,51,0.5)'
    : '0 0 6px rgba(204,0,51,0.7)'
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:2px solid #FF1144;
      border-radius:50%;
      box-shadow:${glow};
      position:relative;
      top:50%;left:50%;
      transform:translate(-50%,-50%);
    "></div>`,
    iconSize: [size + 4, size + 4],
    iconAnchor: [(size + 4) / 2, (size + 4) / 2],
  })
}

// Vite normalizes glob keys to project-root paths; use Object.values to avoid key mismatch
const _aircraftModules = import.meta.glob<{ default: string }>('../assets/aircraft.png', { eager: true })
const aircraftIconUrl: string | undefined = (Object.values(_aircraftModules)[0] as { default: string } | undefined)?.default

interface Props {
  node: AircraftBase
}

export default function NodeMarker({ node }: Props) {
  const { selectNode, updateNode, selectedId, measureMode, addMeasurePoint, throughputMode, supplyNode } = useMapStore()
  const isSelected = selectedId === node.id
  const draggingRef = useRef(false)

  return (
    <>
      <Marker
        position={[node.lat, node.lng]}
        icon={makeMarkerIcon(isSelected)}
        zIndexOffset={isSelected ? 1000 : 0}
        draggable={true}
        eventHandlers={{
          click: () => {
            if (draggingRef.current) return
            if (measureMode) addMeasurePoint(node.lat, node.lng)
            else selectNode(node.id)
          },
          dragstart: () => {
            draggingRef.current = true
          },
          dragend: (e) => {
            const pos = (e.target as L.Marker).getLatLng()
            updateNode(node.id, { lat: pos.lat, lng: pos.lng })
            setTimeout(() => { draggingRef.current = false }, 0)
          },
        }}
      >
        <Tooltip
          permanent
          direction="top"
          offset={[0, -10]}
          className="node-label-name"
        >
          {node.name}
        </Tooltip>
      </Marker>

      {node.aircraftCount > 0 && (
        <Marker
          position={[node.lat, node.lng]}
          icon={L.divIcon({ className: '', html: '', iconSize: [0, 0], iconAnchor: [0, 0] })}
          interactive={false}
          zIndexOffset={-1}
        >
          <Tooltip
            permanent
            direction="right"
            offset={[10, 0]}
            className="node-label-aircraft"
          >
            {aircraftIconUrl
              ? <img src={aircraftIconUrl} style={{ width: '32px', height: '14px', verticalAlign: 'middle', marginRight: '3px' }} />
              : '✈ '
            }
            {node.aircraftCount}
          </Tooltip>
        </Marker>
      )}

      {node.radiusNm > 0 && (
        <Circle
          center={[node.lat, node.lng]}
          radius={node.radiusNm * NM_TO_METERS}
          pathOptions={{
            color: '#CC0033',
            weight: isSelected ? 2 : 1.5,
            opacity: isSelected ? 0.95 : 0.7,
            fillColor: '#CC0033',
            fillOpacity: isSelected ? 0.08 : 0.04,
            dashArray: '8 6',
          }}
          eventHandlers={{
            click: (e) => {
              if (measureMode) return
              // During throughput placement, let the click fall through to the map
              if (throughputMode && !supplyNode) return
              L.DomEvent.stopPropagation(e)
              selectNode(node.id)
            },
          }}
        />
      )}

      {node.showMaxRange && (
        <Circle
          center={[node.lat, node.lng]}
          radius={MAX_RANGE_NM * NM_TO_METERS}
          pathOptions={{
            color: '#992244',
            weight: 1.5,
            opacity: 0.75,
            fill: false,
          }}
          interactive={false}
        />
      )}
    </>
  )
}
