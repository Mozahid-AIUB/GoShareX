// ============================================================
// SplashLogo — GoShareX-এর logo shape (G-ring + R-leg + road)। road-এর
// রঙ আসল gosharex-icon-3d.png-এর অ্যাসফাল্ট কালো→গাঢ় নেভি glossy টোনের
// সাথে মিলিয়ে রাখা হয়েছে।
// coordinate গুলো একটা পরিষ্কার, simple closed-shape trace থেকে নেওয়া
// (viewBox 0 0 400 400) — আগের Figma raw-trace-এর জটিল self-intersecting
// path-এর বদলে, তাই fill করলেও shape ভাঙে না।
//
// LOGO_SCALE = 120 / 400 = 0.3 (400×400-কে আমাদের 120×120 viewBox-এ ফিট করে)
//
// Cinematic sequence (App-এর SplashScreen.tsx থেকে চালিত):
//   ১. G-ring draw-in (stroke) → fill পূর্ণ রঙে
//   ২. R-leg draw-in (stroke) → fill পূর্ণ রঙে
//   ৩. road fade-in + lane-dash গুলো একে একে pop করে
//   ৪. "GoShareX" ব্র্যান্ড-টেক্সট ভেসে ওঠে (SplashScreen.tsx-এর
//      Go/Share/X word-animation — এটার ঠিক পরে ট্রিগার হয়)
// ============================================================
import React from 'react';
import { Animated } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop, G } from 'react-native-svg';

const LOGO_SCALE = 120 / 400;

const AnimatedPath = Animated.createAnimatedComponent(Path);

// stroke draw-in-এর জন্য path-দৈর্ঘ্যের আনুমানিক মান (400-viewBox unit-এ)।
const G_RING_LEN = 900;
const R_LEG_LEN = 900;

const G_RING_PATH =
  'M 274.6 84.5 L 253.3 71.5 L 234.1 64.4 L 209.6 60.6 L 185.3 61.9 L 165.2 66.7 ' +
  'L 143.5 76.2 L 123.4 90.3 L 104.6 110.0 L 90.9 131.1 L 81.3 153.4 L 75.9 176.7 ' +
  'L 74.3 204.1 L 77.2 226.5 L 86.4 253.6 L 100.5 276.6 L 116.4 292.2 L 145.1 253.3 ' +
  'L 131.4 228.4 L 125.7 201.9 L 128.9 175.4 L 133.7 163.0 L 142.6 148.0 L 155.7 134.0 ' +
  'L 169.7 124.1 L 191.4 115.8 L 201.9 115.2 L 228.4 118.0 L 250.4 130.8 L 259.0 141.9 ' +
  'L 306.5 142.6 L 310.4 131.7 L 303.7 117.7 L 290.6 99.5 Z';

const R_LEG_PATH =
  'M 330.1 157.9 L 209.6 161.1 L 179.6 166.2 L 164.6 174.2 L 150.2 195.5 L 156.3 203.8 ' +
  'L 193.3 202.2 L 227.4 182.1 L 275.6 166.8 L 275.3 169.7 L 227.1 190.1 L 200.0 207.7 ' +
  'L 202.9 219.8 L 210.2 213.7 L 214.7 214.0 L 201.6 230.0 L 193.3 227.8 L 174.5 237.0 ' +
  'L 165.9 237.3 L 127.9 282.0 L 97.9 333.7 L 176.1 334.6 L 195.9 280.1 L 221.4 235.4 ' +
  'L 254.9 198.1 L 291.2 172.6 L 294.1 175.4 L 255.8 204.8 L 224.6 242.1 L 238.3 231.6 ' +
  'L 297.3 311.6 L 336.2 310.7 L 340.7 303.7 L 282.0 220.1 Z';

const ROAD_PATH =
  'M 328.5 157.9 L 297.0 160.1 L 249.1 170.3 L 213.4 183.4 L 192.3 196.2 L 153.7 196.8 ' +
  'L 175.1 197.1 L 154.7 203.2 L 190.4 203.8 L 217.9 187.6 L 245.6 175.4 L 297.9 161.7 ' +
  'L 259.0 175.1 L 230.0 188.5 L 206.1 203.2 L 180.5 223.3 L 152.2 251.4 L 130.1 278.8 ' +
  'L 111.0 308.1 L 94.1 341.3 L 97.3 335.2 L 141.3 336.5 L 175.1 334.6 L 174.5 340.4 ' +
  'L 185.0 306.2 L 200.0 271.5 L 214.4 245.9 L 235.4 217.5 L 256.5 196.8 L 280.7 178.9 ' +
  'L 309.4 164.0 Z';

const LANE_DASHES = [
  'M 167.1 275.3 L 167.1 277.8 L 148.0 312.9 L 137.8 312.9 L 143.5 300.2 L 158.5 275.9 Z',
  'M 192.0 240.2 L 192.0 241.5 L 177.0 261.9 L 169.1 261.6 L 169.1 260.0 L 185.0 239.9 Z',
  'M 215.3 214.4 L 215.3 215.6 L 201.9 229.3 L 195.5 229.0 L 195.5 227.8 L 210.2 213.7 L 214.7 213.7 Z',
  'M 238.6 195.5 L 238.0 197.4 L 227.1 205.7 L 222.0 205.7 L 222.0 204.5 L 234.8 195.2 L 237.6 194.9 Z',
  'M 259.6 182.5 L 259.3 184.1 L 250.4 189.2 L 247.5 188.8 L 247.8 187.2 L 257.7 182.1 Z',
  'M 267.6 166.5 L 267.3 168.1 L 240.2 177.0 L 237.6 176.7 L 238.3 174.2 L 255.8 168.7 Z',
];

export interface SplashLogoProps {
  size?: number;
  /** 0→1 — G-ring stroke draw-in। */
  gDraw: Animated.Value;
  /** 0→1 — G-ring fill পূর্ণ রঙে আসা। */
  gFill: Animated.Value;
  /** 0→1 — R-leg stroke draw-in। */
  rDraw: Animated.Value;
  /** 0→1 — R-leg fill পূর্ণ রঙে আসা। */
  rFill: Animated.Value;
  /** 0→1 — road fade-in। */
  roadFade: Animated.Value;
  /** 0→1 — lane dash গুলো একে একে pop করে (৬টা ধাপে ভাগ করা)। */
  dashPop: Animated.Value;
}

const SplashLogo = ({ size = 140, gDraw, gFill, rDraw, rFill, roadFade, dashPop }: SplashLogoProps) => {
  const gDashoffset = gDraw.interpolate({ inputRange: [0, 1], outputRange: [G_RING_LEN, 0] });
  const rDashoffset = rDraw.interpolate({ inputRange: [0, 1], outputRange: [R_LEG_LEN, 0] });

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Defs>
        <LinearGradient id="gGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#35D6E6" />
          <Stop offset="55%" stopColor="#1F8FE0" />
          <Stop offset="100%" stopColor="#1450C8" />
        </LinearGradient>
        {/* Road — আসল icon.png-এর অ্যাসফাল্ট টোন: গাঢ় কালচে-নেভি (দূরে) →
            হালকা steel-blue glossy হাইলাইট (কাছে)। */}
        <LinearGradient id="roadGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#0A0E18" />
          <Stop offset="45%" stopColor="#1C2740" />
          <Stop offset="100%" stopColor="#4A5A78" />
        </LinearGradient>
      </Defs>

      <G scale={LOGO_SCALE} origin="0,0">
        {/* ── G-ring — fill (opacity দিয়ে ফেড-ইন) + stroke draw-in একসাথে ── */}
        <AnimatedPath d={G_RING_PATH} fill="url(#gGrad)" opacity={gFill as unknown as number} />
        <AnimatedPath
          d={G_RING_PATH}
          stroke="url(#gGrad)"
          strokeWidth={3 / LOGO_SCALE}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${G_RING_LEN}`}
          strokeDashoffset={gDashoffset}
        />

        {/* ── R-leg — G শেষ হওয়ার পর draw-in + fill ── */}
        <AnimatedPath d={R_LEG_PATH} fill="url(#gGrad)" opacity={rFill as unknown as number} />
        <AnimatedPath
          d={R_LEG_PATH}
          stroke="url(#gGrad)"
          strokeWidth={3 / LOGO_SCALE}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${R_LEG_LEN}`}
          strokeDashoffset={rDashoffset}
        />

        {/* ── Road — fade-in, তারপর lane dash গুলো একে একে pop করে ── */}
        <AnimatedPath d={ROAD_PATH} fill="url(#roadGrad)" opacity={roadFade as unknown as number} />
        {LANE_DASHES.map((d, i) => {
          const start = i / LANE_DASHES.length;
          const end = (i + 1) / LANE_DASHES.length;
          const dashOpacity = dashPop.interpolate({
            inputRange: [0, start, end, 1],
            outputRange: [0, 0, 1, 1],
            extrapolate: 'clamp',
          });
          return <AnimatedPath key={i} d={d} fill="#FFFFFF" opacity={dashOpacity as unknown as number} />;
        })}
      </G>
    </Svg>
  );
};

export default SplashLogo;
