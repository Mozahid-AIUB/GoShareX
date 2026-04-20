import { PickupPoint, Destination } from '@/types';

export const PICKUP_POINTS: PickupPoint[] = [
  { id: 'main_gate',    label: 'Main Gate',    coordinates: { lat: 23.8103, lng: 90.4125 } },
  { id: 'gate_2',       label: 'Gate 2',       coordinates: { lat: 23.8108, lng: 90.4130 } },
  { id: 'canteen',      label: 'Canteen Area', coordinates: { lat: 23.8100, lng: 90.4120 } },
  { id: 'parking',      label: 'Parking Zone', coordinates: { lat: 23.8095, lng: 90.4115 } },
  { id: 'admin_block',  label: 'Admin Block',  coordinates: { lat: 23.8112, lng: 90.4135 } },
];

export const DESTINATIONS: Destination[] = [
  { id: 'kuril',       label: 'Kuril',       coordinates: { lat: 23.8234, lng: 90.4267 }, baseFareFromMainGate: 40 },
  { id: 'badda',       label: 'Badda',       coordinates: { lat: 23.7803, lng: 90.4272 }, baseFareFromMainGate: 30 },
  { id: 'rampura',     label: 'Rampura',     coordinates: { lat: 23.7515, lng: 90.4198 }, baseFareFromMainGate: 50 },
  { id: 'notun_bazar', label: 'Notun Bazar', coordinates: { lat: 23.7874, lng: 90.4287 }, baseFareFromMainGate: 35 },
  { id: 'gulshan',     label: 'Gulshan',     coordinates: { lat: 23.7806, lng: 90.4147 }, baseFareFromMainGate: 60 },
  { id: 'banani',      label: 'Banani',      coordinates: { lat: 23.7939, lng: 90.4022 }, baseFareFromMainGate: 70 },
  { id: 'uttara',      label: 'Uttara',      coordinates: { lat: 23.8759, lng: 90.3795 }, baseFareFromMainGate: 55 },
];

export const PROXIMITY_ZONES = {
  INSTANT_ALERT: 30,    // meters — push notification + map highlight
  NORMAL_NOTIFY: 100,   // meters — visible in list
  VISIBLE_ONLY: 300,    // meters — shown on map, no alert
};

export const GEOFENCE_RADIUS = 100; // meters — destination arrival detection
