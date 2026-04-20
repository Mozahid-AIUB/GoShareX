/** Local fallback fare table — authoritative copy lives in Firebase */
const FARE_TABLE: Record<string, number> = {
  'Main Gate_Kuril': 40,
  'Main Gate_Badda': 30,
  'Main Gate_Rampura': 50,
  'Main Gate_Notun Bazar': 35,
  'Main Gate_Gulshan': 60,
  'Main Gate_Banani': 70,
  'Main Gate_Uttara': 55,
  'Gate 2_Kuril': 35,
  'Gate 2_Badda': 25,
  'Gate 2_Rampura': 45,
  'Gate 2_Gulshan': 55,
  'Canteen Area_Kuril': 42,
  'Parking Zone_Kuril': 38,
  'Admin Block_Kuril': 40,
};

export function getFare(pickup: string, destination: string): number {
  return FARE_TABLE[`${pickup}_${destination}`] ?? 0;
}

export function getSplitFare(pickup: string, destination: string, riders: number): number {
  const fare = getFare(pickup, destination);
  return Math.ceil(fare / riders);
}
