export interface AircraftBase {
  id: string
  name: string
  lat: number
  lng: number
  radiusNm: number
  showMaxRange?: boolean
}

export interface FleetAircraft {
  id: string
  name: string
  configuration: string   // 'Fuel' | 'Cargo' | 'Pod' | custom
  baseId: string | null   // home base (origin for mission math)
  supplyNodeId: string | null  // assigned supply node mission
}

export interface SupplyNode {
  id: string
  name: string
  lat: number
  lng: number
  fuelAtSupply: boolean
}

export const FLEET_CONFIGS = ['Fuel', 'Cargo', 'Pod'] as const
