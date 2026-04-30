import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { VehicleType } from '@/store/rideStore';

type Props = {
  type: VehicleType;
  size?: number;
  active?: boolean;
};

const ACTIVE = {
  rickshaw: ['#FBBF24', '#F59E0B', '#B45309'],
  bike: ['#818CF8', '#6366F1', '#4338CA'],
} as const;

const IDLE = {
  rickshaw: ['#94A3B8', '#64748B', '#475569'],
  bike: ['#94A3B8', '#64748B', '#475569'],
} as const;

const RickshawArt = ({ size = 40, active = false }: { size?: number; active?: boolean }) => {
  const [c1, c2, c3] = active ? ACTIVE.rickshaw : IDLE.rickshaw;
  const id = active ? 'rka' : 'rki';

  const spokes = (cx: number, cy: number, r: number) => {
    const pts = [];
    for (let a = 0; a < 360; a += 30) {
      const rad = (a * Math.PI) / 180;
      const x2 = cx + r * Math.cos(rad);
      const y2 = cy + r * Math.sin(rad);
      pts.push(`M${cx} ${cy} L${x2.toFixed(1)} ${y2.toFixed(1)}`);
    }
    return pts.join(' ');
  };

  return (
    <Svg width={size} height={size * 0.72} viewBox="0 0 100 72" fill="none">
      <Defs>
        <LinearGradient id={`${id}g1`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={c1} />
          <Stop offset="1" stopColor={c2} />
        </LinearGradient>
        <LinearGradient id={`${id}g2`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1D4ED8" />
          <Stop offset="1" stopColor="#4338CA" />
        </LinearGradient>
      </Defs>

      <Circle cx="20" cy="54" r="15" stroke={`url(#${id}g1)`} strokeWidth="3" fill="none" />
      <Circle cx="20" cy="54" r="9" stroke={c3} strokeWidth="1" fill="none" opacity="0.45" />
      <Path d={spokes(20, 54, 13.2)} stroke={c1} strokeWidth="0.9" opacity="0.45" />
      <Circle cx="80" cy="54" r="15" stroke={`url(#${id}g1)`} strokeWidth="3" fill="none" />
      <Circle cx="80" cy="54" r="9" stroke={c3} strokeWidth="1" fill="none" opacity="0.45" />
      <Path d={spokes(80, 54, 13.2)} stroke={c1} strokeWidth="0.9" opacity="0.45" />

      <Rect x="10" y="10" width="36" height="28" rx="2" fill={`url(#${id}g2)`} />
      <Path d="M10 10Q28 0 46 10" fill={`url(#${id}g2)`} />
      <Path d="M14 14C22 12 30 12 38 14M16 18C23 16 30 17 36 20M16 24C22 22 28 23 34 27" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
      <G opacity="0.9">
        <Circle cx="18" cy="16" r="1.6" fill="#FACC15" />
        <Circle cx="24" cy="12" r="1.2" fill="#22C55E" />
        <Circle cx="31" cy="11" r="1.4" fill="#FB7185" />
        <Circle cx="36" cy="14" r="1.3" fill="#FACC15" />
      </G>

      <Rect x="16" y="38" width="24" height="10" rx="1.5" fill={`url(#${id}g1)`} />
      <Path d="M18 48L32 48L44 32L67 32L74 54" stroke={c3} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M52 32L60 20M60 20L72 20M72 20L82 31" stroke={c3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M53 37L58 46L71 46" stroke={c3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M65 18L74 16M74 16L78 20" stroke={c3} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M48 38L43 54" stroke={c3} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M42 44L49 44" stroke={c3} strokeWidth="1.8" strokeLinecap="round" />
      <Ellipse cx="50" cy="68" rx="42" ry="2.5" fill={c3} opacity="0.14" />
    </Svg>
  );
};

const CngArt = ({ size = 40, active = false }: { size?: number; active?: boolean }) => {
  const id = active ? 'cnga' : 'cngi';
  const shellTop = active ? '#FFFFFF' : '#E2E8F0';
  const shellBottom = active ? '#E5E7EB' : '#CBD5E1';
  const roofTop = active ? '#111827' : '#1F2937';
  const roofBottom = active ? '#020617' : '#0F172A';
  const line = active ? '#0F172A' : '#475569';
  const accent = active ? '#16A34A' : '#64748B';

  return (
    <Svg width={size} height={size * 0.72} viewBox="0 0 110 80" fill="none">
      <Defs>
        <LinearGradient id={`${id}body`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={shellTop} />
          <Stop offset="1" stopColor={shellBottom} />
        </LinearGradient>
        <LinearGradient id={`${id}roof`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={roofTop} />
          <Stop offset="1" stopColor={roofBottom} />
        </LinearGradient>
      </Defs>

      <Ellipse cx="56" cy="73" rx="48" ry="3.2" fill="#0F172A" opacity="0.14" />

      <Circle cx="20" cy="62" r="9" fill="#111827" />
      <Circle cx="20" cy="62" r="5.5" stroke="#CBD5E1" strokeWidth="1.1" fill="none" />
      <Circle cx="84" cy="62" r="9" fill="#111827" />
      <Circle cx="84" cy="62" r="5.5" stroke="#CBD5E1" strokeWidth="1.1" fill="none" />

      <Path d="M10 58L16 58L24 27H52C70 27 86 28.5 93 34L96 58H10Z" fill={`url(#${id}body)`} stroke={line} strokeWidth="1.5" />
      <Path d="M26 22H68C82 22 90 25 93 33H53C45 27 36 24 26 22Z" fill={`url(#${id}roof)`} />
      <Path d="M24 27C28 20 39 18 52 20C63 21.5 72 25 78 31" stroke="#F8FAFC" strokeWidth="1" opacity="0.65" />

      <Path d="M28 29H46V57H28Z" fill="#FFFFFF" stroke={line} strokeWidth="1.2" />
      <Path d="M50 30H70V58H50Z" fill="#FFFFFF" stroke={line} strokeWidth="1.2" />
      <Path d="M72 33H89V54H72Z" fill="#FFFFFF" stroke={line} strokeWidth="1.2" />

      <Path d="M59 31V57" stroke={line} strokeWidth="1.2" />
      <Path d="M78 33V54" stroke={line} strokeWidth="1.1" />

      <Path d="M51 31C55 34 57 40 57 49C57 54 54.5 57 50 57" fill="#FFFFFF" stroke={line} strokeWidth="1.6" />
      <Path d="M48 31H58" stroke={line} strokeWidth="1.2" />

      <Circle cx="40" cy="35" r="4.1" fill="#111827" />
      <Path d="M36 40C37.5 47 39 52 41 57" stroke="#111827" strokeWidth="1.4" strokeLinecap="round" />
      <Path d="M41 42C45 40.5 47.5 41 50 43" stroke="#111827" strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M41.5 47C45 48.5 47 50.5 48.5 54" stroke="#111827" strokeWidth="1.2" strokeLinecap="round" />

      <Path d="M12 40H18V47H11" fill="#FFFFFF" stroke={line} strokeWidth="1.2" />
      <Ellipse cx="9.5" cy="44" rx="2.5" ry="3.4" fill="#111827" />
      <Path d="M17 44H23" stroke={line} strokeWidth="1.3" strokeLinecap="round" />

      <Path d="M69 59H91" stroke={line} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M70 40H87M69 45H90" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
      <Path d="M64 51H84" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />

      <Path d="M27 51H92" stroke={line} strokeWidth="1.2" opacity="0.85" />
      <Path d="M27 55H92" stroke={accent} strokeWidth="1.2" opacity="0.95" />
      <Path d="M29 58H90" stroke={accent} strokeWidth="0.9" opacity="0.8" />

      <Rect x="45" y="46" width="17" height="10" rx="1.8" fill="#FFFFFF" stroke={line} strokeWidth="1.2" />
      <Path d="M49 51H58" stroke="#111827" strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M49 54.5H55" stroke="#111827" strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
  );
};

const BikeArt = ({ size = 40, active = false }: { size?: number; active?: boolean }) => {
  const [c1, c2, c3] = active ? ACTIVE.bike : IDLE.bike;
  const id = active ? 'bka' : 'bki';

  const spokes = (cx: number, cy: number, r: number) => {
    const pts = [];
    for (let a = 0; a < 360; a += 30) {
      const rad = (a * Math.PI) / 180;
      const x2 = cx + r * Math.cos(rad);
      const y2 = cy + r * Math.sin(rad);
      pts.push(`M${cx} ${cy} L${x2.toFixed(1)} ${y2.toFixed(1)}`);
    }
    return pts.join(' ');
  };

  return (
    <Svg width={size} height={size * 0.62} viewBox="0 0 110 68" fill="none">
      <Defs>
        <LinearGradient id={`${id}g1`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={c1} />
          <Stop offset="1" stopColor={c2} />
        </LinearGradient>
        <LinearGradient id={`${id}g2`} x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor={c3} />
          <Stop offset="1" stopColor={c2} />
        </LinearGradient>
      </Defs>

      <Circle cx="22" cy="52" r="15" stroke={`url(#${id}g1)`} strokeWidth="3" fill="none" />
      <Circle cx="22" cy="52" r="9" stroke={c3} strokeWidth="1" fill="none" opacity="0.45" />
      <Path d={spokes(22, 52, 13)} stroke={c1} strokeWidth="0.9" opacity="0.45" />
      <Circle cx="88" cy="54" r="14" stroke={`url(#${id}g1)`} strokeWidth="3" fill="none" />
      <Circle cx="88" cy="54" r="8.5" stroke={c3} strokeWidth="1" fill="none" opacity="0.45" />
      <Path d={spokes(88, 54, 12)} stroke={c1} strokeWidth="0.9" opacity="0.45" />

      <Path d="M24 50L38 32L62 32L80 46" stroke={`url(#${id}g1)`} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M40 51L77 51" stroke={`url(#${id}g1)`} strokeWidth="3" strokeLinecap="round" />
      <Path d="M46 32C54 20 69 18 81 24L73 36L50 36Z" fill={`url(#${id}g2)`} />
      <Path d="M49 28H63C72 28 79 31 83 36L72 36C66 33 58 32 49 33Z" fill={`url(#${id}g1)`} opacity="0.9" />
      <Path d="M78 23L89 18M87 18L92 24" stroke={`url(#${id}g1)`} strokeWidth="2" strokeLinecap="round" />
      <Path d="M36 34L30 24" stroke={c3} strokeWidth="2" strokeLinecap="round" />
      <Path d="M72 46L93 48" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M58 40L52 52" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />
      <Path d="M53 37L63 37" stroke="#EF4444" strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />
      <Ellipse cx="55" cy="66" rx="44" ry="2.4" fill={c3} opacity="0.14" />
    </Svg>
  );
};

export default function PremiumVehicleArt({ type, size = 40, active = false }: Props) {
  if (type === 'rickshaw') return <RickshawArt size={size} active={active} />;
  if (type === 'bike') return <BikeArt size={size} active={active} />;
  return <CngArt size={size} active={active} />;
}
