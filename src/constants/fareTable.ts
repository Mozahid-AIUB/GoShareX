import { DESTINATIONS } from './destinations';
import { PICKUP_POINTS } from './pickupPoints';

export interface FareEntry {
  from: string;
  to: string;
  fare: number;
}

export const FARE_TABLE: Record<string, number> = {
  'main_gate_kuril': 40,
  'main_gate_badda': 30,
  'main_gate_rampura': 50,
  'main_gate_notun_bazar': 35,
  'main_gate_gulshan': 60,
  'main_gate_banani': 70,
  'main_gate_uttara': 55,
  'gate_2_kuril': 35,
  'gate_2_badda': 28,
  'gate_2_rampura': 48,
  'gate_2_notun_bazar': 32,
  'gate_2_gulshan': 58,
  'gate_2_banani': 68,
  'gate_2_uttara': 52,
};

export const getFare = (pickupId: string, destinationId: string): number => {
  const key = `${pickupId}_${destinationId}`;
  return FARE_TABLE[key] || 0;
};

export const getSplitFare = (
  pickupId: string,
  destinationId: string,
  riders: number
): number => {
  const baseFare = getFare(pickupId, destinationId);
  return Math.ceil(baseFare / riders);
};
