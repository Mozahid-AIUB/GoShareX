import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';
import type { VehicleType } from '@/store/rideStore';

/**
 * PremiumVehicleArt — detailed vehicle icons (rickshaw, bike, CNG).
 *
 * - rickshaw → নিজস্ব hand-drawn SVG cycle-rickshaw (ছাউনি + spoke চাকা + প্যাডেল),
 *   কারণ library-র rickshaw glyph cycle-rickshaw-এর মতো দেখায় না।
 * - bike / CNG → MaterialCommunityIcons-এর professional vector glyph
 *   (motorbike, rickshaw-electric)।
 *
 * সবই copyright-free vector, কোনো emoji/image নয়। প্রতিটার নিজস্ব brand রঙ।
 * active=true → রঙিন; active=false → ধূসর (idle)। interface অপরিবর্তিত।
 * পুরো JS — কোনো native module নেই, rebuild ছাড়াই চলে।
 */

type Props = {
  type: VehicleType;
  size?: number;
  active?: boolean;
};

const COLORS = {
  rickshaw: { c1: '#FCD34D', c2: '#F59E0B', c3: '#B45309' },
  bike: '#6366F1',
  cng: '#10B981',
} as const;

const IDLE = { c1: '#CBD5E1', c2: '#94A3B8', c3: '#475569' } as const;
const IDLE_COLOR = '#94A3B8';

/** spoke চাকা — চিকন রিম + ভিতরে spoke। */
const SpokeWheel = ({ cx, cy, r, rim, spoke }: { cx: number; cy: number; r: number; rim: string; spoke: string }) => {
  const lines = [];
  for (let a = 0; a < 360; a += 30) {
    const rad = (a * Math.PI) / 180;
    lines.push(`M${cx} ${cy} L${(cx + (r - 1.6) * Math.cos(rad)).toFixed(1)} ${(cy + (r - 1.6) * Math.sin(rad)).toFixed(1)}`);
  }
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} stroke={rim} strokeWidth={2.4} fill="none" />
      <Path d={lines.join(' ')} stroke={spoke} strokeWidth={0.8} opacity={0.55} />
      <Circle cx={cx} cy={cy} r={r * 0.18} fill={rim} />
    </G>
  );
};

const RickshawArt = ({ size, active }: { size: number; active: boolean }) => {
  const { c1, c2, c3 } = active ? COLORS.rickshaw : IDLE;
  const id = active ? 'rka' : 'rki';
  const hood = active ? '#1E1B4B' : '#334155';
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Defs>
        <LinearGradient id={`${id}b`} x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor={c1} />
          <Stop offset="1" stopColor={c2} />
        </LinearGradient>
      </Defs>
      {/* viewBox 120x120, art উপর-নিচ center করতে y≈18 থেকে */}
      <G transform="translate(0,16)">
        <Ellipse cx="60" cy="86" rx="50" ry="3.6" fill={c3} opacity="0.18" />
        {/* ভাঁজ-করা খাড়া hood */}
        <Path d="M28 60V34C28 22 36 12 44 12C46 18 46 26 45 34C46 44 44 54 44 60Z" fill={hood} />
        <Path d="M30 18C33 16 38 15 43 16M30 24C33 22 38 21 43 22M30 30C33 28 38 27 43 28"
          stroke={active ? '#A5B4FC' : '#64748B'} strokeWidth="1" opacity="0.5" />
        {/* যাত্রী আসন */}
        <Path d="M28 60H64L60 52H32Z" fill={`url(#${id}b)`} />
        <Path d="M30 52H58V46C58 43 56 41 53 41H35C32 41 30 43 30 46Z" fill={`url(#${id}b)`} />
        {/* frame + প্যাডেল + হ্যান্ডেল */}
        <Path d="M30 64L46 66L62 64" stroke={c3} strokeWidth="2.6" strokeLinecap="round" />
        <Path d="M62 64L86 66" stroke={c3} strokeWidth="2.6" strokeLinecap="round" />
        <Path d="M64 52L74 30L86 64" stroke={c2} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M62 64L72 40" stroke={c2} strokeWidth="2.6" strokeLinecap="round" />
        <Path d="M74 30L66 22M74 30L88 32M88 32L100 62" stroke={c2} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M64 21L72 23" stroke={c3} strokeWidth="2.2" strokeLinecap="round" />
        <Circle cx="72" cy="64" r="3.4" fill={c3} />
        <Path d="M72 64L77 60" stroke={c3} strokeWidth="1.8" strokeLinecap="round" />
        {/* চাকা */}
        <SpokeWheel cx={30} cy={66} r={16} rim={c3} spoke={c1} />
        <SpokeWheel cx={100} cy={64} r={16} rim={c3} spoke={c1} />
      </G>
    </Svg>
  );
};

export default function PremiumVehicleArt({ type, size = 40, active = false }: Props) {
  if (type === 'rickshaw') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <RickshawArt size={size} active={active} />
      </View>
    );
  }
  const glyph: keyof typeof MaterialCommunityIcons.glyphMap = type === 'bike' ? 'motorbike' : 'rickshaw-electric';
  const color = active ? (type === 'bike' ? COLORS.bike : COLORS.cng) : IDLE_COLOR;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name={glyph} size={size} color={color} />
    </View>
  );
}
