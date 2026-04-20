export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PickupPoint {
  id: string;
  label: string;
  coordinates: Coordinates;
}

export interface Destination {
  id: string;
  label: string;
  coordinates: Coordinates;
  baseFareFromMainGate: number;
  geofenceRadius?: number;
}
