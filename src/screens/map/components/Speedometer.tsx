/**
 * Speedometer — Circular arc speedometer widget for LiveMapScreen.
 */

import React from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';

const MAX_SPEED = 80;
const SPEEDO_R = 24;
const SPEEDO_STROKE = 4;
const SPEEDO_CX = 32;
const SPEEDO_CY = 32;
const SPEEDO_SIZE = 64;

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export const Speedometer = ({ speedKmh }: { speedKmh: number | null }) => {
  const speed = Math.max(0, Math.min(speedKmh ?? 0, MAX_SPEED));
  const START_DEG = 135;
  const END_DEG = 405;
  const fillDeg = START_DEG + ((END_DEG - START_DEG) * speed) / MAX_SPEED;

  const isMoving = speed > 2;
  const arcColor = speed > 60 ? '#FB7185' : speed > 30 ? '#F59E0B' : '#34D399';

  const trackPath = arcPath(SPEEDO_CX, SPEEDO_CY, SPEEDO_R, START_DEG, END_DEG);
  const fillPath = speed > 0.5 ? arcPath(SPEEDO_CX, SPEEDO_CY, SPEEDO_R, START_DEG, fillDeg) : null;

  return (
    <View style={sp.wrap}>
      <Svg width={SPEEDO_SIZE} height={SPEEDO_SIZE} viewBox={`0 0 ${SPEEDO_SIZE} ${SPEEDO_SIZE}`}>
        <Path
          d={trackPath}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={SPEEDO_STROKE}
          fill="none"
          strokeLinecap="round"
        />
        {fillPath && (
          <Path
            d={fillPath}
            stroke={arcColor}
            strokeWidth={SPEEDO_STROKE}
            fill="none"
            strokeLinecap="round"
          />
        )}
        <SvgCircle
          cx={SPEEDO_CX}
          cy={SPEEDO_CY}
          r={3}
          fill={isMoving ? arcColor : 'rgba(255,255,255,0.25)'}
        />
      </Svg>
      <View style={sp.label}>
        <RNText style={[sp.value, isMoving && { color: arcColor }]}>
          {speedKmh == null ? '--' : Math.round(speed)}
        </RNText>
        <RNText style={sp.unit}>km/h</RNText>
      </View>
    </View>
  );
};

const sp = StyleSheet.create({
  wrap: {
    width: SPEEDO_SIZE,
    height: SPEEDO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5,10,25,0.92)',
    borderRadius: SPEEDO_SIZE / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(52,211,153,0.3)',
    elevation: 14,
    shadowColor: '#34D399',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
  },
  label: { position: 'absolute', alignItems: 'center' },
  value: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ECFDF5',
    lineHeight: 16,
    letterSpacing: -0.5,
  },
  unit: { fontSize: 6, fontWeight: '800', color: '#6EE7B7', letterSpacing: 0.8, marginTop: 1 },
});
