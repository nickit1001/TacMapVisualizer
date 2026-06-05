import type { AircraftBase } from '../types'

export function encodeMapState(nodes: AircraftBase[]): string {
  const json = JSON.stringify(nodes)
  return btoa(unescape(encodeURIComponent(json)))
}

export function decodeMapState(): AircraftBase[] | null {
  try {
    const match = window.location.hash.match(/state=([^&]*)/)
    if (!match) return null
    const json = decodeURIComponent(escape(atob(match[1])))
    return JSON.parse(json) as AircraftBase[]
  } catch {
    return null
  }
}

export function buildShareUrl(nodes: AircraftBase[]): string {
  const url = new URL(window.location.href)
  url.hash = `state=${encodeMapState(nodes)}`
  return url.toString()
}
