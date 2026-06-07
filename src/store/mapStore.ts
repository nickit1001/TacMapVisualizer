import { create } from 'zustand'
import type { AircraftBase, FleetAircraft, SupplyNode } from '../types'
import { decodeMapState } from '../lib/share'

type PlacementMode = 'idle' | 'placing' | 'placing-supply-node'
export type Theme = 'dark' | 'light'

export interface MeasurePoint { lat: number; lng: number }

export interface SaveState {
  nodes: AircraftBase[]
  fleet: FleetAircraft[]
  supplyNodes: SupplyNode[]
}

const _savedTheme = (localStorage.getItem('tac-theme') as Theme) ?? 'dark'
document.documentElement.setAttribute('data-theme', _savedTheme)

const _urlNodes = decodeMapState()

interface MapStore {
  // Bases
  nodes: AircraftBase[]
  selectedId: string | null
  // Fleet
  fleet: FleetAircraft[]
  // Supply nodes
  supplyNodes: SupplyNode[]
  selectedSupplyNodeId: string | null
  // Modes
  placementMode: PlacementMode
  measureMode: boolean
  measurePoints: MeasurePoint[]
  // UI
  theme: Theme
  sidebarOpen: boolean
  // Simulation (time scrubber — global, affects all supply node missions)
  missionTime: number
  maxMissionTime: number

  // Base actions
  addNode: (lat: number, lng: number) => void
  updateNode: (id: string, updates: Partial<AircraftBase>) => void
  deleteNode: (id: string) => void
  selectNode: (id: string | null) => void

  // Fleet actions
  addFleetMember: () => void
  removeFleetMember: (id: string) => void
  updateFleetMember: (id: string, updates: Partial<Pick<FleetAircraft, 'name' | 'configuration'>>) => void
  assignFleetMemberToBase: (aircraftId: string, baseId: string | null) => void
  assignFleetMemberToSupplyNode: (aircraftId: string, nodeId: string | null) => void

  // Supply node actions
  addSupplyNode: (lat: number, lng: number) => void
  updateSupplyNode: (id: string, updates: Partial<Pick<SupplyNode, 'name' | 'lat' | 'lng' | 'fuelAtSupply'>>) => void
  deleteSupplyNode: (id: string) => void
  selectSupplyNode: (id: string | null) => void

  // Mode actions
  setPlacementMode: (mode: PlacementMode) => void
  setMeasureMode: (active: boolean) => void
  addMeasurePoint: (lat: number, lng: number) => void
  updateMeasurePoint: (index: number, lat: number, lng: number) => void
  clearMeasure: () => void

  // Save/load
  loadState: (state: SaveState) => void

  // UI actions
  setTheme: (t: Theme) => void
  toggleSidebar: () => void

  // Simulation
  setMissionTime: (minutes: number) => void
  setMaxMissionTime: (minutes: number) => void
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

let nodeCounter = 1
let fleetCounter = 1
let supplyNodeCounter = 1

export const useMapStore = create<MapStore>((set) => ({
  nodes: _urlNodes ?? [],
  selectedId: null,
  fleet: [],
  supplyNodes: [],
  selectedSupplyNodeId: null,
  placementMode: 'idle',
  measureMode: false,
  measurePoints: [],
  theme: _savedTheme,
  sidebarOpen: true,
  missionTime: 0,
  maxMissionTime: 1440,

  // --- Base actions ---
  addNode: (lat, lng) => {
    const name = `Base ${nodeCounter++}`
    const node: AircraftBase = { id: generateId(), name, lat, lng, radiusNm: 123 }
    set((s) => ({ nodes: [...s.nodes, node], selectedId: node.id, placementMode: 'idle' }))
  },

  updateNode: (id, updates) =>
    set((s) => ({ nodes: s.nodes.map((n) => n.id === id ? { ...n, ...updates } : n) })),

  deleteNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
      // Unassign any fleet aircraft stationed at the deleted base
      fleet: s.fleet.map((a) => a.baseId === id ? { ...a, baseId: null } : a),
    })),

  selectNode: (id) => set({ selectedId: id, selectedSupplyNodeId: null }),

  // --- Fleet actions ---
  addFleetMember: () => {
    const member: FleetAircraft = {
      id: generateId(),
      name: `AC${fleetCounter++}`,
      configuration: 'Cargo',
      baseId: null,
      supplyNodeId: null,
    }
    set((s) => ({ fleet: [...s.fleet, member] }))
  },

  removeFleetMember: (id) =>
    set((s) => ({ fleet: s.fleet.filter((a) => a.id !== id) })),

  updateFleetMember: (id, updates) =>
    set((s) => ({
      fleet: s.fleet.map((a) => a.id === id ? { ...a, ...updates } : a),
    })),

  assignFleetMemberToBase: (aircraftId, baseId) =>
    set((s) => ({
      fleet: s.fleet.map((a) => a.id === aircraftId ? { ...a, baseId } : a),
    })),

  assignFleetMemberToSupplyNode: (aircraftId, nodeId) =>
    set((s) => ({
      fleet: s.fleet.map((a) => a.id === aircraftId ? { ...a, supplyNodeId: nodeId } : a),
    })),

  // --- Supply node actions ---
  addSupplyNode: (lat, lng) => {
    const name = `Supply ${supplyNodeCounter++}`
    const node: SupplyNode = { id: generateId(), name, lat, lng, fuelAtSupply: false }
    set((s) => ({
      supplyNodes: [...s.supplyNodes, node],
      selectedSupplyNodeId: node.id,
      placementMode: 'idle',
      selectedId: null,
    }))
  },

  updateSupplyNode: (id, updates) =>
    set((s) => ({
      supplyNodes: s.supplyNodes.map((n) => n.id === id ? { ...n, ...updates } : n),
    })),

  deleteSupplyNode: (id) =>
    set((s) => ({
      supplyNodes: s.supplyNodes.filter((n) => n.id !== id),
      selectedSupplyNodeId: s.selectedSupplyNodeId === id ? null : s.selectedSupplyNodeId,
      // Unassign aircraft from the deleted mission
      fleet: s.fleet.map((a) => a.supplyNodeId === id ? { ...a, supplyNodeId: null } : a),
    })),

  selectSupplyNode: (id) => set({ selectedSupplyNodeId: id, selectedId: null }),

  // --- Mode actions ---
  setPlacementMode: (mode) => set({ placementMode: mode }),

  setMeasureMode: (active) =>
    set({ measureMode: active, measurePoints: [], placementMode: 'idle' }),

  addMeasurePoint: (lat, lng) =>
    set((s) => {
      const pts = s.measurePoints
      if (pts.length >= 2) return { measurePoints: [{ lat, lng }] }
      return { measurePoints: [...pts, { lat, lng }] }
    }),

  updateMeasurePoint: (index, lat, lng) =>
    set((s) => {
      const pts = [...s.measurePoints]
      pts[index] = { lat, lng }
      return { measurePoints: pts }
    }),

  clearMeasure: () => set({ measurePoints: [] }),

  // --- Save / Load ---
  loadState: ({ nodes, fleet, supplyNodes }) => {
    nodeCounter = nodes.length + 1
    fleetCounter = fleet.length + 1
    supplyNodeCounter = supplyNodes.length + 1
    set({ nodes, fleet, supplyNodes, selectedId: null, selectedSupplyNodeId: null })
  },

  // --- UI ---
  setTheme: (t) => {
    localStorage.setItem('tac-theme', t)
    document.documentElement.setAttribute('data-theme', t)
    set({ theme: t })
  },

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // --- Simulation ---
  setMissionTime: (minutes) => set({ missionTime: minutes }),
  setMaxMissionTime: (minutes) => set({ maxMissionTime: minutes }),
}))
