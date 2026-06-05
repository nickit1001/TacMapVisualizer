import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

export default function ZoomSlider() {
  const map = useMap()

  useEffect(() => {
    let onZoomEnd: (() => void) | null = null

    const ZoomControl = L.Control.extend({
      options: { position: 'topleft' as L.ControlPosition },

      onAdd(map: L.Map) {
        const container = L.DomUtil.create('div', 'zoom-slider-container')
        L.DomEvent.disableClickPropagation(container)
        L.DomEvent.disableScrollPropagation(container)

        // + button
        const zoomIn = L.DomUtil.create('a', 'zoom-slider-btn', container) as HTMLAnchorElement
        zoomIn.textContent = '+'
        zoomIn.href = '#'
        zoomIn.title = 'Zoom in'
        L.DomEvent.on(zoomIn, 'click', (e) => {
          L.DomEvent.preventDefault(e)
          map.zoomIn()
        })

        // Vertical range slider (top = max zoom, bottom = min zoom)
        const slider = L.DomUtil.create('input', 'slider-zoom', container) as HTMLInputElement
        slider.type = 'range'
        slider.min = String(map.getMinZoom() ?? 2)
        slider.max = String(map.getMaxZoom() ?? 18)
        slider.step = '1'
        slider.value = String(map.getZoom())

        L.DomEvent.on(slider, 'input', () => {
          map.setZoom(Number(slider.value))
        })

        onZoomEnd = () => { slider.value = String(map.getZoom()) }
        map.on('zoomend', onZoomEnd)

        // − button
        const zoomOut = L.DomUtil.create('a', 'zoom-slider-btn', container) as HTMLAnchorElement
        zoomOut.textContent = '−'
        zoomOut.href = '#'
        zoomOut.title = 'Zoom out'
        L.DomEvent.on(zoomOut, 'click', (e) => {
          L.DomEvent.preventDefault(e)
          map.zoomOut()
        })

        return container
      },

      onRemove(map: L.Map) {
        if (onZoomEnd) map.off('zoomend', onZoomEnd)
      },
    })

    const ctrl = new ZoomControl()
    ctrl.addTo(map)
    return () => { ctrl.remove() }
  }, [map])

  return null
}
