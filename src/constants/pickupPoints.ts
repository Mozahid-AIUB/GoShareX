export interface PickupPoint {
  id: string;
  name: string;
  nameBn: string;
  lat: number;
  lng: number;
}

// No hardcoded pickup points — users select their live GPS location or frequent past locations
export const PICKUP_POINTS: PickupPoint[] = [];

export const getPickupPointById = (id: string): PickupPoint | undefined =>
  PICKUP_POINTS.find(p => p.id === id);

export const getPickupPointByName = (name: string): PickupPoint | undefined =>
  PICKUP_POINTS.find(p => p.name === name || p.nameBn === name);
