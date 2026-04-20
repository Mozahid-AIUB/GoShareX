export interface PickupPoint {
  id: string;
  name: string;
  nameBn: string;
  lat: number;
  lng: number;
}

export const PICKUP_POINTS: PickupPoint[] = [
  {
    id: 'main_gate',
    name: 'Main Gate',
    nameBn: 'মেইন গেইট',
    lat: 23.8103,
    lng: 90.4125,
  },
  {
    id: 'gate_2',
    name: 'Gate 2',
    nameBn: 'গেইট ২',
    lat: 23.8108,
    lng: 90.4130,
  },
  {
    id: 'canteen',
    name: 'Canteen Area',
    nameBn: 'ক্যান্টিন এরিয়া',
    lat: 23.8100,
    lng: 90.4128,
  },
  {
    id: 'parking',
    name: 'Parking Zone',
    nameBn: 'পার্কিং জোন',
    lat: 23.8105,
    lng: 90.4122,
  },
  {
    id: 'admin',
    name: 'Admin Block',
    nameBn: 'এডমিন ব্লক',
    lat: 23.8106,
    lng: 90.4127,
  },
];

export const getPickupPointById = (id: string): PickupPoint | undefined => {
  return PICKUP_POINTS.find(point => point.id === id);
};

export const getPickupPointByName = (name: string): PickupPoint | undefined => {
  return PICKUP_POINTS.find(
    point => point.name === name || point.nameBn === name
  );
};
