// ============================================================
// SplashLogo — GoShareX-এর আসল icon.png (GX road-logo)-এর সাথে মেলানো
// নতুন SVG, যেটার প্রতিটা অংশ (G-arc, X-strokes, road, car) আলাদা করে
// animate করা যায়। PNG-তে এটা সম্ভব না (flat pixel grid, অংশ আলাদা করা
// যায় না) — তাই brand-এর shape হুবহু SVG দিয়ে পুনর্নির্মাণ করা হলো।
//
// Cinematic sequence (App-এর SplashScreen.tsx থেকে চালিত):
//   ০. G + X shape শুরু থেকেই muted/outline-এ দেখা যায় (icon.png-এর মতো
//      কাঠামো আগে থেকে আছে — শুধু road অংশটা এখনো আঁকা হয়নি)
//   ১. road তার ভিতর দিয়ে draw-in হয় (নিচ থেকে দূরত্বে মিলিয়ে যাওয়া পর্যন্ত)
//   ২. car রাস্তা ধরে ভ্রমণ করে (scale+fade perspective সহ)
//   ৩. car পৌঁছালে পুরো logo (G+X+road) পূর্ণ রঙে "জ্বলে ওঠে" (glow reveal)
//   ৪. "GoShareX" ব্র্যান্ড-টেক্সট ভেসে ওঠে (বিদ্যমান SplashScreen.tsx-এর
//      Go/Share/X word-animation ইতিমধ্যে আছে — এটা তার ঠিক পরে ট্রিগার হয়)
// ============================================================
import React from 'react';
import { Animated } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop, G } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

// road path-এর আনুমানিক দৈর্ঘ্য (viewBox unit-এ) — draw-in stroke-dasharray-এ লাগে।
const ROAD_LEN = 130;

export interface SplashLogoProps {
  size?: number;
  /** 0→1 — road নিচ থেকে উপরের ভ্যানিশিং পয়েন্ট পর্যন্ত আঁকা হয়। */
  roadDraw: Animated.Value;
  /** 0→1 — car road বরাবর নিচ থেকে উপরে ভ্রমণ করে। */
  carProg: Animated.Value;
  /** 0→1 — G+X shape reveal (car পৌঁছানোর পর)। */
  markReveal: Animated.Value;
}

const SplashLogo = ({ size = 140, roadDraw, carProg, markReveal }: SplashLogoProps) => {
  // car-এর position + scale — road-এর perspective অনুসরণ করে (নিচে বড়,
  // উপরে দূরে ছোট হয়ে মিলিয়ে যায়)। quadratic-bezier-এর কাছাকাছি sample।
  const carY = carProg.interpolate({
    inputRange:  [0, 0.25, 0.5, 0.75, 1],
    outputRange: [148, 122, 96, 74, 58],
  });
  const carX = carProg.interpolate({
    inputRange:  [0, 0.25, 0.5, 0.75, 1],
    outputRange: [46, 50, 56, 62, 66],
  });
  const carScale = carProg.interpolate({
    inputRange:  [0, 0.7, 1],
    outputRange: [1, 0.55, 0.32],
  });
  const carOpacity = carProg.interpolate({
    inputRange:  [0, 0.05, 0.85, 1],
    outputRange: [0, 1, 1, 0],
  });

  // logo-র মূল shape (G+X) শুরু থেকেই muted (~0.22) দেখা যায় — road শেষে
  // full color-এ "জ্বলে ওঠে" (glow reveal, markReveal 0→1)।
  const gxOpacity = markReveal.interpolate({ inputRange: [0, 1], outputRange: [0.22, 1] });
  const glowOpacity = markReveal.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0.8, 0] });

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Defs>
        {/* "G" — turquoise (উপরে) → নীল (নিচে) */}
        <LinearGradient id="gGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2DD4BF" />
          <Stop offset="1" stopColor="#2563EB" />
        </LinearGradient>
        {/* "X" — নীল gradient */}
        <LinearGradient id="xGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#38BDF8" />
          <Stop offset="1" stopColor="#2563EB" />
        </LinearGradient>
        {/* Road — কালো (কাছে) → গাঢ় নেভি (দূরে) */}
        <LinearGradient id="roadGrad" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#0A0F1E" />
          <Stop offset="1" stopColor="#1E293B" />
        </LinearGradient>
      </Defs>

      {/* ── Glow halo — car পৌঁছানোর মুহূর্তে G/X-এর পিছনে একটা soft radial
          জ্বলে উঠে মিলিয়ে যায় (full-color reveal-কে জোর দেয়)। road/car-এর
          নিচে (z-order-এ আগে) আঁকা, তাই ওদের উপর ছাপায় না। */}
      <Circle cx="60" cy="55" r="40" fill="url(#gGrad)" opacity={glowOpacity as unknown as number} />

      {/* ── G + X — শুরু থেকেই কাঠামো হিসেবে দেখা যায় (muted), road শেষে
          পুরো রঙে জ্বলে ওঠে। icon.png-এর মতো — G/X সবসময় আছে, road তার
          ভিতর দিয়ে "যাচ্ছে"। ── */}
      <AnimatedG opacity={gxOpacity as unknown as number}>
        {/* "G" — বড় গোলাকার arc, নিচে-বামে খোলা */}
        <Path
          d="M60 18
             A38 38 0 1 0 96 62
             L96 50
             A26 26 0 1 1 60 30
             Z"
          fill="url(#gGrad)"
        />
        {/* "X" — দুই diagonal stroke, ডান পাশে */}
        <Path
          d="M78 42 L108 42 L90 60 L108 78 L78 78 L96 60 Z"
          fill="url(#xGrad)"
        />
      </AnimatedG>

      {/* ── Road — G/X-এর ভিতর দিয়ে নিচ থেকে দূরত্বে মিলিয়ে যাওয়া পর্যন্ত draw-in ── */}
      <AnimatedPath
        d="M40 118 C 42 100, 48 80, 60 58 C 64 51, 68 46, 72 42"
        stroke="url(#roadGrad)"
        strokeWidth="16"
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${ROAD_LEN}`}
        strokeDashoffset={roadDraw.interpolate({ inputRange: [0, 1], outputRange: [ROAD_LEN, 0] })}
      />
      {/* centerline dashes — road-এর সাথেই আঁকা হয় (একটু চিকন, ভিতরে) */}
      <AnimatedPath
        d="M40 118 C 42 100, 48 80, 60 58 C 64 51, 68 46, 72 42"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="4 5"
        fill="none"
        opacity={roadDraw}
      />

      {/* ── Car — road বরাবর ভ্রমণ করে, দূরে যেতে যেতে ছোট হয়ে মিলিয়ে যায় ── */}
      <AnimatedCarGroup carX={carX} carY={carY} carScale={carScale} carOpacity={carOpacity} />
    </Svg>
  );
};

// car-কে ছোট আলাদা component হিসেবে রাখা হলো যাতে animated x/y/scale/opacity
// props পরিষ্কারভাবে একসাথে group হয় (SVG <G>-এর animated transform)।
const AnimatedCarGroup = ({
  carX, carY, carScale, carOpacity,
}: {
  carX: Animated.AnimatedInterpolation<number>;
  carY: Animated.AnimatedInterpolation<number>;
  carScale: Animated.AnimatedInterpolation<number>;
  carOpacity: Animated.AnimatedInterpolation<number>;
}) => {
  return (
    <AnimatedG opacity={carOpacity as unknown as number}>
      <AnimatedG
        // react-native-svg-তে <G> translateX/Y/scale prop নেয় না সরাসরি;
        // পরিবর্তে x/y offset নিজে বসাই ছোট car shape এঁকে।
        x={carX as unknown as number}
        y={carY as unknown as number}
        scale={carScale as unknown as number}
        origin="0,0"
      >
        <Circle cx="0" cy="0" r="3.5" fill="#FBBF24" />
        <Path d="M-4 0 L4 0 L2.5 -3 L-2.5 -3 Z" fill="#F8FAFC" opacity="0.9" />
      </AnimatedG>
    </AnimatedG>
  );
};

export default SplashLogo;
