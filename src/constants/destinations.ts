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
  { id: 'kuril',       name: 'Kuril',        nameBn: 'কুড়িল',        lat: 23.8143, lng: 90.4244, baseFare: 40, estimatedTime: 10 },
  { id: 'badda',       name: 'Badda',        nameBn: 'বাড্ডা',        lat: 23.7808, lng: 90.4286, baseFare: 30, estimatedTime: 8  },
  { id: 'rampura',     name: 'Rampura',      nameBn: 'রামপুরা',       lat: 23.7614, lng: 90.4281, baseFare: 50, estimatedTime: 15 },
  { id: 'notunbazar',  name: 'Notun Bazar',  nameBn: 'নতুন বাজার',   lat: 23.7897, lng: 90.4351, baseFare: 35, estimatedTime: 10 },
  { id: 'gulshan',     name: 'Gulshan',      nameBn: 'গুলশান',        lat: 23.7806, lng: 90.4145, baseFare: 60, estimatedTime: 18 },
  { id: 'banani',      name: 'Banani',       nameBn: 'বনানী',         lat: 23.7937, lng: 90.4066, baseFare: 70, estimatedTime: 22 },
  { id: 'uttara',      name: 'Uttara',       nameBn: 'উত্তরা',        lat: 23.8759, lng: 90.3795, baseFare: 55, estimatedTime: 20 },
];

export const getDestinationById = (id: string): Destination | undefined =>
  DESTINATIONS.find(d => d.id === id);

export const getDestinationByName = (name: string): Destination | undefined =>
  DESTINATIONS.find(d => d.name === name || d.nameBn === name);

export const calculateSplitFare = (baseFare: number, riders: number): number =>
  Math.ceil(baseFare / riders);
