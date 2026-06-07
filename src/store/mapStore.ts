import { create } from 'zustand';
import type { AircraftBase, Aircraft } from '../types';
import { decodeMapState } from '../lib/share';

type PlacementMode = 'idle' | 'placing';
export type Theme = 'dark' | 'light';

export interface MeasurePoint { lat: number; lng: number }

// Init theme from localStorage and apply to DOM immediately
const _savedTheme = (localStorage.getItem('tac-theme') as Theme) ?? 'dark';
document.documentElement.setAttribute('data-theme', _savedTheme);

// Hydrate from shared URL state if present
const _urlNodes = decodeMapState();

interface MapStore {
  nodes: AircraftBase[];
  selectedId: string | null;
  placementMode: PlacementMode;
  measureMode: boolean;
  measurePoints: MeasurePoint[];
  theme: Theme;
  sidebarOpen: boolean;
  // Throughput
  throughputMode: boolean;
  supplyNode: { lat: number; lng: number } | null;
  missionTime: number;
  maxMissionTime: number;
  fuelAtSupply: boolean;
  throughputBaseId: string;
  addNode: (lat: number, lng: number) => void;
  updateNode: (id: string, updates: Partial<AircraftBase>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  setPlacementMode: (mode: PlacementMode) => void;
  updateAircraftConfig: (nodeId: string, aircraftId: string, config: string) => void;
  loadNodes: (nodes: AircraftBase[]) => void;
  setMeasureMode: (active: boolean) => void;
  addMeasurePoint: (lat: number, lng: number) => void;
  updateMeasurePoint: (index: number, lat: number, lng: number) => void;
  clearMeasure: () => void;
  setTheme: (t: Theme) => void;
  toggleSidebar: () => void;
  // Throughput actions
  setThroughputMode: (active: boolean) => void;
  setSupplyNode: (lat: number, lng: number) => void;
  clearSupplyNode: () => void;
  setMissionTime: (minutes: number) => void;
  setMaxMissionTime: (minutes: number) => void;
  setFuelAtSupply: (value: boolean) => void;
  setThroughputBaseId: (id: string) => void;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function reconcileAircraft(
  existing: Aircraft[],
  count: number,
  nodeName: string,
): Aircraft[] {
  if (count <= existing.length) return existing.slice(0, count);
  const result = [...existing];
  for (let i = existing.length + 1; i <= count; i++) {
    result.push({ id: generateId(), name: `${nodeName}_A${i}`, configuration: '' });
  }
  return result;
}

function renameAircraft(aircraft: Aircraft[], nodeName: string): Aircraft[] {
  return aircraft.map((a, idx) => ({ ...a, name: `${nodeName}_A${idx + 1}` }));
}

let nodeCounter = 1;

export const useMapStore = create<MapStore>((set) => ({
  nodes: _urlNodes ?? [],
  selectedId: null,
  placementMode: 'idle',
  measureMode: false,
  measurePoints: [],
  theme: _savedTheme,
  sidebarOpen: true,
  throughputMode: false,
  supplyNode: null,
  missionTime: 0,
  maxMissionTime: 1440,
  fuelAtSupply: false,
  throughputBaseId: 'closest',

  addNode: (lat, lng) => {
    const name = `Base ${nodeCounter++}`;
    const node: AircraftBase = {
      id: generateId(),
      name,
      lat,
      lng,
      radiusNm: 123,
      aircraftCount: 0,
      aircraft: [],
    };
    set((s) => ({ nodes: [...s.nodes, node], selectedId: node.id, placementMode: 'idle' }));
  },

  updateNode: (id, updates) => {
    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id !== id) return n;
        const updated = { ...n, ...updates };

        if ('aircraftCount' in updates && updates.aircraftCount !== undefined) {
          updated.aircraft = reconcileAircraft(n.aircraft, updates.aircraftCount, updated.name);
        }

        if ('name' in updates && updates.name !== n.name) {
          updated.aircraft = renameAircraft(updated.aircraft, updated.name);
        }

        return updated;
      }),
    }));
  },

  deleteNode: (id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
  },

  selectNode: (id) => set({ selectedId: id }),

  setPlacementMode: (mode) => {
    if (mode === 'placing') {
      set({ placementMode: mode, throughputMode: false })
    } else {
      set({ placementMode: mode })
    }
  },

  updateAircraftConfig: (nodeId, aircraftId, config) => {
    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id !== nodeId) return n;
        return {
          ...n,
          aircraft: n.aircraft.map((a) =>
            a.id === aircraftId ? { ...a, configuration: config } : a,
          ),
        };
      }),
    }));
  },

  loadNodes: (nodes) => {
    nodeCounter = nodes.length + 1;
    set({ nodes, selectedId: null });
  },

  setMeasureMode: (active) => {
    set({
      measureMode: active,
      measurePoints: [],
      placementMode: 'idle',
      ...(active ? { throughputMode: false } : {}),
    })
  },

  addMeasurePoint: (lat, lng) => {
    set((s) => {
      const pts = s.measurePoints;
      if (pts.length >= 2) return { measurePoints: [{ lat, lng }] };
      return { measurePoints: [...pts, { lat, lng }] };
    });
  },

  updateMeasurePoint: (index, lat, lng) => {
    set((s) => {
      const pts = [...s.measurePoints];
      pts[index] = { lat, lng };
      return { measurePoints: pts };
    });
  },

  clearMeasure: () => set({ measurePoints: [] }),

  setTheme: (t) => {
    localStorage.setItem('tac-theme', t);
    document.documentElement.setAttribute('data-theme', t);
    set({ theme: t });
  },

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setThroughputMode: (active) => {
    if (active) {
      set({ throughputMode: true, measureMode: false, measurePoints: [], placementMode: 'idle' })
    } else {
      set({ throughputMode: false, missionTime: 0 })
    }
  },
  setSupplyNode: (lat, lng) => set({ supplyNode: { lat, lng } }),
  clearSupplyNode: () => set({ supplyNode: null, missionTime: 0 }),
  setMissionTime: (minutes) => set({ missionTime: minutes }),
  setMaxMissionTime: (minutes) => set({ maxMissionTime: minutes }),
  setFuelAtSupply: (value) => set({ fuelAtSupply: value }),
  setThroughputBaseId: (id) => set({ throughputBaseId: id }),
}));
