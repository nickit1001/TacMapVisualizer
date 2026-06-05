export interface Aircraft {
  id: string;
  name: string;
  configuration: string;
}

export interface AircraftBase {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusNm: number;
  aircraftCount: number;
  aircraft: Aircraft[];
  showMaxRange?: boolean;
}
