import React from 'react';
import { Circle } from 'react-native-maps';

interface ProximityCircleProps {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
}

const PRIMARY_FILL = 'rgba(26, 115, 232, 0.10)';
const PRIMARY_STROKE = 'rgba(26, 115, 232, 0.55)';

const ProximityCircle: React.FC<ProximityCircleProps> = ({
  latitude,
  longitude,
  radiusMeters = 30,
}) => {
  return (
    <Circle
      center={{ latitude, longitude }}
      radius={radiusMeters}
      fillColor={PRIMARY_FILL}
      strokeColor={PRIMARY_STROKE}
      strokeWidth={1.5}
      lineDashPattern={[6, 4]}
    />
  );
};

export default ProximityCircle;
