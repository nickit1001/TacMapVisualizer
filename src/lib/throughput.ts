import L from 'leaflet'
import type { AircraftBase } from '../types'

const CRUISE_SPEED_KTS = 100
const SETUP_TIME_MIN = 10
const REFUEL_TIME_MIN = 10

export interface TripTimes {
  departure: number
  arrival: number
  supplyDepart: number
  baseArrival: number
  refuelEnd: number
}

export type AircraftPhase = 'setup' | 'outbound' | 'at-supply' | 'return' | 'refueling'

export interface AircraftState {
  lat: number
  lng: number
  phase: AircraftPhase
  tripNumber: number
}

export interface ThroughputResult {
  distanceNm: number
  payloadPerTrip: number
  tripsCompleted: number
  totalPayloadDelivered: number
  aircraftState: AircraftState
}

export function calcPayload(rangeNm: number): number {
  return Math.max(0, -(1.151 * rangeNm) + 600)
}

export function buildTripSchedule(
  distanceNm: number,
  fuelAtSupply: boolean,
  maxTrips = 300,
): TripTimes[] {
  const travelTime = (distanceNm / CRUISE_SPEED_KTS) * 60
  const tripDuration = travelTime * 2 + REFUEL_TIME_MIN + (fuelAtSupply ? REFUEL_TIME_MIN : 0)
  const trips: TripTimes[] = []

  for (let n = 0; n < maxTrips; n++) {
    const departure = SETUP_TIME_MIN + n * tripDuration
    const arrival = departure + travelTime
    const supplyDepart = arrival + (fuelAtSupply ? REFUEL_TIME_MIN : 0)
    const baseArrival = supplyDepart + travelTime
    const refuelEnd = baseArrival + REFUEL_TIME_MIN
    trips.push({ departure, arrival, supplyDepart, baseArrival, refuelEnd })
  }

  return trips
}

export function getAircraftState(
  time: number,
  trips: TripTimes[],
  baseLat: number,
  baseLng: number,
  supplyLat: number,
  supplyLng: number,
): AircraftState {
  if (time < SETUP_TIME_MIN || trips.length === 0) {
    return { lat: baseLat, lng: baseLng, phase: 'setup', tripNumber: -1 }
  }

  for (let n = 0; n < trips.length; n++) {
    const trip = trips[n]
    const nextDeparture = trips[n + 1]?.departure ?? Infinity

    if (time >= trip.departure && time < nextDeparture) {
      if (time < trip.arrival) {
        const t = (time - trip.departure) / (trip.arrival - trip.departure)
        return {
          lat: baseLat + t * (supplyLat - baseLat),
          lng: baseLng + t * (supplyLng - baseLng),
          phase: 'outbound',
          tripNumber: n,
        }
      }
      if (time < trip.supplyDepart) {
        return { lat: supplyLat, lng: supplyLng, phase: 'at-supply', tripNumber: n }
      }
      if (time < trip.baseArrival) {
        const t = (time - trip.supplyDepart) / (trip.baseArrival - trip.supplyDepart)
        return {
          lat: supplyLat + t * (baseLat - supplyLat),
          lng: supplyLng + t * (baseLng - supplyLng),
          phase: 'return',
          tripNumber: n,
        }
      }
      return { lat: baseLat, lng: baseLng, phase: 'refueling', tripNumber: n }
    }
  }

  return { lat: baseLat, lng: baseLng, phase: 'refueling', tripNumber: trips.length - 1 }
}

export function calcThroughput(
  base: AircraftBase,
  supply: { lat: number; lng: number },
  time: number,
  fuelAtSupply: boolean,
): ThroughputResult {
  const distanceNm =
    L.latLng(base.lat, base.lng).distanceTo(L.latLng(supply.lat, supply.lng)) / 1852
  const payloadPerTrip = calcPayload(distanceNm)
  const trips = buildTripSchedule(distanceNm, fuelAtSupply)

  const tripsCompleted = trips.filter((t) => t.arrival <= time).length
  const totalPayloadDelivered = tripsCompleted * payloadPerTrip * base.aircraftCount

  const aircraftState = getAircraftState(
    time,
    trips,
    base.lat,
    base.lng,
    supply.lat,
    supply.lng,
  )

  return { distanceNm, payloadPerTrip, tripsCompleted, totalPayloadDelivered, aircraftState }
}

export function findClosestBase(
  nodes: AircraftBase[],
  supply: { lat: number; lng: number },
): AircraftBase | null {
  if (nodes.length === 0) return null
  const supplyLatLng = L.latLng(supply.lat, supply.lng)
  return nodes.reduce((closest, node) => {
    const d = L.latLng(node.lat, node.lng).distanceTo(supplyLatLng)
    const dClosest = L.latLng(closest.lat, closest.lng).distanceTo(supplyLatLng)
    return d < dClosest ? node : closest
  })
}
