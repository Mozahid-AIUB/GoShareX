// VehicleIcon — thin wrapper around PremiumVehicleArt for use outside the home screen
import React from 'react';
import PremiumVehicleArt from '@/components/vehicles/PremiumVehicleArt';
import type { VehicleType } from '@/store/rideStore';

export type { VehicleType };
export type VehicleTone = 'indigo' | 'teal' | 'amber' | 'purple' | 'mono';

interface Props {
  type: 'motorcycle' | 'cng' | 'rickshaw';
  size?: number;
  tone?: VehicleTone;
  active?: boolean;
}

// Map VehicleIcon type → rideStore VehicleType
const TYPE_MAP: Record<'motorcycle' | 'cng' | 'rickshaw', VehicleType> = {
  motorcycle: 'bike',
  cng:        'cng',
  rickshaw:   'rickshaw',
};

// tone → active flag mapping (indigo/teal/amber = active color, mono = idle)
const isActiveTone = (tone: VehicleTone) => tone !== 'mono';

export default function VehicleIcon({ type, size = 40, tone = 'indigo', active }: Props) {
  const vehicleType = TYPE_MAP[type];
  const isActive = active !== undefined ? active : isActiveTone(tone);
  return <PremiumVehicleArt type={vehicleType} size={size} active={isActive} />;
}
