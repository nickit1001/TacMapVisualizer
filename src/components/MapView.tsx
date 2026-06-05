import { MapContainer, TileLayer, useMapEvents, Polyline, Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { useMapStore, type MeasurePoint } from '../store/mapStore'
import NodeMarker from './NodeMarker'
import ZoomSlider from './ZoomSlider'

function PlacementHandler() {
  const { placementMode, addNode, selectNode, measureMode, addMeasurePoint } = useMapStore()
  useMapEvents({
    click(e) {
      if (measureMode) {
        addMeasurePoint(e.latlng.lat, e.latlng.lng)
        return
      }
      if (placementMode === 'placing') {
        addNode(e.latlng.lat, e.latlng.lng)
      } else {
        selectNode(null)
      }
    },
  })
  return null
}

const measurePointIcon = L.divIcon({
  className: '',
  html: `<div style="width:10px;height:10px;background:#FFCC00;border:2px solid #FFE066;border-radius:50%;box-shadow:0 0 6px rgba(255,204,0,0.8);position:relative;top:50%;left:50%;transform:translate(-50%,-50%);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

function MeasureOverlay({ points }: { points: MeasurePoint[] }) {
  const { updateMeasurePoint } = useMapStore()
  if (points.length === 0) return null

  let distNm: string | null = null
  let midLat = 0, midLng = 0
  if (points.length === 2) {
    const d = L.latLng(points[0].lat, points[0].lng).distanceTo(
      L.latLng(points[1].lat, points[1].lng)
    )
    distNm = (d / 1852).toFixed(1)
    midLat = (points[0].lat + points[1].lat) / 2
    midLng = (points[0].lng + points[1].lng) / 2
  }

  return (
    <>
      {points.length === 2 && (
        <>
          <Polyline
            positions={[[points[0].lat, points[0].lng], [points[1].lat, points[1].lng]]}
            pathOptions={{ color: '#FFCC00', weight: 2, dashArray: '6 4', opacity: 0.9 }}
          />
          <Marker
            position={[midLat, midLng]}
            icon={L.divIcon({ className: '', html: '', iconSize: [0, 0], iconAnchor: [0, 0] })}
            interactive={false}
          >
            <Tooltip permanent direction="top" offset={[0, -4]} className="measure-result-label">
              {distNm} NM
            </Tooltip>
          </Marker>
        </>
      )}

      {points.map((pt, i) => (
        <Marker
          key={i}
          position={[pt.lat, pt.lng]}
          icon={measurePointIcon}
          draggable={true}
          eventHandlers={{
            dragend: (e) => {
              const pos = (e.target as L.Marker).getLatLng()
              updateMeasurePoint(i, pos.lat, pos.lng)
            },
          }}
        >
          {points.length === 1 && i === 0 && (
            <Tooltip permanent direction="top" offset={[0, -10]} className="measure-result-label">
              Click second point
            </Tooltip>
          )}
        </Marker>
      ))}
    </>
  )
}

export default function MapView() {
  const { nodes, placementMode, measureMode, measurePoints, theme } = useMapStore()
  const cursor = measureMode || placementMode === 'placing' ? 'cursor-crosshair' : ''
  const tileUrl = theme === 'light'
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

  return (
    <MapContainer
      center={[20, 0]}
      zoom={3}
      style={{ height: '100%', width: '100%' }}
      className={cursor}
      worldCopyJump={true}
      scrollWheelZoom={true}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={tileUrl}
        subdomains="abcd"
        maxZoom={19}
      />
      <ZoomSlider />
      <PlacementHandler />
      {nodes.map((node) => (
        <NodeMarker key={node.id} node={node} />
      ))}
      <MeasureOverlay points={measurePoints} />
    </MapContainer>
  )
}
