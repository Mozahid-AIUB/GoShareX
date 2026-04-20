export interface Destination {
  id: string;
  name: string;
  nameBn: string;
  lat: number;
  lng: number;
  baseFare: number;
  estimatedTime: number;
  geofenceRadius?: number;
}

export const DESTINATIONS: Destination[] = [
  {
    id: 'kuril',
    name: 'Kuril',
    nameBn: 'কুড়িল',
    lat: 23.8240,
    lng: 90.4274,
    baseFare: 40,
    estimatedTime: 15,
    geofenceRadius: 100,
  },
  {
    id: 'badda',
    name: 'Badda',
    nameBn: 'বাড্ডা',
    lat: 23.7805,
    lng: 90.4267,
    baseFare: 30,
    estimatedTime: 10,
    geofenceRadius: 100,
  },
  {
    id: 'rampura',
    name: 'Rampura',
    nameBn: 'রামপুরা',
    lat: 23.7539,
    lng: 90.4241,
    baseFare: 50,
    estimatedTime: 20,
    geofenceRadius: 100,
  },
  {
    id: 'notun_bazar',
    name: 'Notun Bazar',
    nameBn: 'নতুন বাজার',
    lat: 23.8157,
    lng: 90.4328,
    baseFare: 35,
    estimatedTime: 12,
    geofenceRadius: 100,
  },
  {
    id: 'gulshan',
    name: 'Gulshan',
    nameBn: 'গুলশান',
    lat: 23.7925,
    lng: 90.4078,
    baseFare: 60,
    estimatedTime: 25,
    geofenceRadius: 100,
  },
  {
    id: 'banani',
    name: 'Banani',
    nameBn: 'বনানী',
    lat: 23.7937,
    lng: 90.4066,
    baseFare: 70,
    estimatedTime: 30,
    geofenceRadius: 100,
  },
  {
    id: 'uttara',
    name: 'Uttara',
    nameBn: 'উত্তরা',
    lat: 23.8759,
    lng: 90.3795,
    baseFare: 55,
    estimatedTime: 35,
    geofenceRadius: 100,
  },
];

export const getDestinationById = (id: string): Destination | undefined => {
  return DESTINATIONS.find(dest => dest.id === id);
};

export const getDestinationByName = (name: string): Destination | undefined => {
  return DESTINATIONS.find(
    dest => dest.name === name || dest.nameBn === name
  );
};

export const calculateSplitFare = (baseFare: number, riders: number): number => {
  return Math.ceil(baseFare / riders);
};
