import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import Svg, { Circle, Defs, LinearGradient, Path, Stop, G, Rect, Ellipse } from 'react-native-svg';

import { auth } from '@/config/firebase.config';
import { useAuthStore } from '@/store';
import authService from '@/services/authService';
import { checkSuspension } from '@/services/badgeService';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { supabase } from '@/config/supabase.config';

const { width: W, height: H } = Dimensions.get('window');
const MIN_DISPLAY_MS = 2800;

// ─── Logo SVG ─────────────────────────────────────────────────────────────────
const LogoMark = ({ size = 96 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
    <Defs>
      <LinearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#818CF8" />
        <Stop offset="1" stopColor="#6366F1" />
      </LinearGradient>
      <LinearGradient id="lg2" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#34D399" />
        <Stop offset="1" stopColor="#059669" />
      </LinearGradient>
      <LinearGradient id="lg3" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#1E2A50" />
        <Stop offset="1" stopColor="#0A0F1E" />
      </LinearGradient>
    </Defs>
    {/* Outer ring */}
    <Circle cx="48" cy="48" r="46" stroke="url(#lg1)" strokeWidth="1.5" fill="rgba(99,102,241,0.06)" />
    {/* Road */}
    <Rect x="8" y="58" width="80" height="14" rx="7" fill="url(#lg3)" />
    <Rect x="22" y="63" width="10" height="2.5" rx="1.2" fill="rgba(255,255,255,0.22)" />
    <Rect x="42" y="63" width="10" height="2.5" rx="1.2" fill="rgba(255,255,255,0.22)" />
    <Rect x="62" y="63" width="10" height="2.5" rx="1.2" fill="rgba(255,255,255,0.22)" />
    {/* Car 1 — indigo */}
    <G>
      <Rect x="10" y="42" width="32" height="17" rx="5" fill="url(#lg1)" />
      <Path d="M16 42 Q18 34 24 33 H34 Q40 34 40 42 Z" fill="#A5B4FC" opacity="0.85" />
      <Rect x="19" y="35" width="8" height="7" rx="1.5" fill="#C7D2FE" opacity="0.55" />
      <Rect x="29" y="35" width="8" height="7" rx="1.5" fill="#C7D2FE" opacity="0.55" />
      <Circle cx="18" cy="59" r="4" fill="#0A0F1E" />
      <Circle cx="18" cy="59" r="2" fill="#6366F1" />
      <Circle cx="34" cy="59" r="4" fill="#0A0F1E" />
      <Circle cx="34" cy="59" r="2" fill="#6366F1" />
      <Ellipse cx="42" cy="49" rx="1.5" ry="2.5" fill="#FEF08A" opacity="0.9" />
    </G>
    {/* Car 2 — green */}
    <G>
      <Rect x="54" y="42" width="32" height="17" rx="5" fill="url(#lg2)" />
      <Path d="M60 42 Q62 34 68 33 H78 Q84 34 84 42 Z" fill="#6EE7B7" opacity="0.85" />
      <Rect x="63" y="35" width="8" height="7" rx="1.5" fill="#A7F3D0" opacity="0.55" />
      <Rect x="73" y="35" width="8" height="7" rx="1.5" fill="#A7F3D0" opacity="0.55" />
      <Circle cx="62" cy="59" r="4" fill="#0A0F1E" />
      <Circle cx="62" cy="59" r="2" fill="#34D399" />
      <Circle cx="78" cy="59" r="4" fill="#0A0F1E" />
      <Circle cx="78" cy="59" r="2" fill="#34D399" />
      <Rect x="54" y="47" width="1.5" height="5" rx="0.8" fill="#FCA5A5" opacity="0.9" />
    </G>
    {/* Connection arc + dot */}
    <Path d="M42 46 Q48 36 54 46" stroke="url(#lg1)" strokeWidth="1.8" fill="none" strokeDasharray="3 2" strokeLinecap="round" />
    <Circle cx="48" cy="36" r="3.5" fill="url(#lg1)" />
    <Circle cx="48" cy="36" r="1.5" fill="#fff" opacity="0.9" />
  </Svg>
);

// ─── Floating particle dot ─────────────────────────────────────────────────────
const Particle = ({ x, y, size, color, delay }: { x: number; y: number; size: number; color: string; delay: number }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.7, duration: 900, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -12, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 900, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute', left: x, top: y,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color,
      opacity, transform: [{ translateY }],
    }} />
  );
};

const PARTICLES = [
  { x: W * 0.12, y: H * 0.18, size: 5, color: '#6366F1', delay: 0 },
  { x: W * 0.82, y: H * 0.22, size: 3, color: '#34D399', delay: 300 },
  { x: W * 0.08, y: H * 0.72, size: 4, color: '#818CF8', delay: 600 },
  { x: W * 0.88, y: H * 0.65, size: 6, color: '#6366F1', delay: 150 },
  { x: W * 0.5,  y: H * 0.12, size: 3, color: '#34D399', delay: 450 },
  { x: W * 0.25, y: H * 0.85, size: 4, color: '#A78BFA', delay: 750 },
  { x: W * 0.75, y: H * 0.88, size: 3, color: '#6366F1', delay: 200 },
  { x: W * 0.92, y: H * 0.42, size: 5, color: '#34D399', delay: 550 },
  { x: W * 0.18, y: H * 0.40, size: 3, color: '#A78BFA', delay: 850 },
  { x: W * 0.68, y: H * 0.15, size: 4, color: '#818CF8', delay: 350 },
  { x: W * 0.35, y: H * 0.68, size: 3, color: '#34D399', delay: 650 },
  { x: W * 0.6,  y: H * 0.80, size: 5, color: '#6366F1', delay: 100 },
];

// ─── Main Splash ──────────────────────────────────────────────────────────────
const SplashScreen = () => {
  const { setUser, setLoading, setSuspension } = useAuthStore();
  const resolved = useRef(false);

  // Background
  const bgAnim = useRef(new Animated.Value(0)).current;

  // Logo mark
  const markOpacity = useRef(new Animated.Value(0)).current;
  const markScale   = useRef(new Animated.Value(0.5)).current;
  // logo "breathing" — entrance-এর পর আস্তে শ্বাস নেওয়ার মতো (premium feel)।
  const markBreath  = useRef(new Animated.Value(0)).current;
  // brand text-এর উপর দিয়ে চলে যাওয়া shine sweep।
  const shineX      = useRef(new Animated.Value(-120)).current;
  // shooting star — এক কোণ থেকে আরেক কোণে দ্রুত শাঁ করে যায় (0→1 progress)।
  const starProg    = useRef(new Animated.Value(0)).current;

  // Ring pulse around logo
  const ring1Scale   = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale   = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;

  // "Go" word
  const goOpacity = useRef(new Animated.Value(0)).current;
  const goY       = useRef(new Animated.Value(16)).current;

  // "Share" word
  const shareOpacity = useRef(new Animated.Value(0)).current;
  const shareY       = useRef(new Animated.Value(16)).current;

  // "X" word
  const xOpacity = useRef(new Animated.Value(0)).current;
  const xScale   = useRef(new Animated.Value(0.6)).current;

  // Tagline
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const tagY       = useRef(new Animated.Value(10)).current;

  // Progress bar
  const barWidth   = useRef(new Animated.Value(0)).current;
  const barOpacity = useRef(new Animated.Value(0)).current;
  const shimmerX   = useRef(new Animated.Value(-80)).current;

  const buildFallbackUser = (firebaseUser: FirebaseUser) => {
    const email = (firebaseUser.email ?? '').trim().toLowerCase();
    const name = firebaseUser.displayName || email.split('@')[0] || 'Rider';
    return {
      uid: firebaseUser.uid, email, name,
      studentId: '', department: '', phoneNumber: '',
      rating: 5, totalRides: 0, totalSaved: 0,
      completionRate: 100, badge: 'New Rider' as const,
      strikes: 0, isSuspended: false,
      createdAt: new Date().toISOString(),
    };
  };

  useEffect(() => {
    // Phase 1 (0ms) — bg lifts, logo mark pops in
    Animated.timing(bgAnim, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    Animated.parallel([
      Animated.spring(markScale,   { toValue: 1,   tension: 70, friction: 7,  useNativeDriver: true }),
      Animated.timing(markOpacity, { toValue: 1,   duration: 500,              useNativeDriver: true }),
    ]).start(() => {
      // entrance শেষ → logo আস্তে শ্বাস নেওয়া শুরু (subtle 0↔1 loop)।
      Animated.loop(
        Animated.sequence([
          Animated.timing(markBreath, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(markBreath, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    });

    // Phase 2 (500ms) — ring pulses
    setTimeout(() => {
      const pulse = (scale: Animated.Value, opacity: Animated.Value, delay: number) => {
        Animated.loop(Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale,   { toValue: 2.2, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0,   duration: 1200,                                    useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scale,   { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
          ]),
        ])).start();
      };
      pulse(ring1Scale, ring1Opacity, 0);
      pulse(ring2Scale, ring2Opacity, 500);
    }, 500);

    // Phase 3 (700ms) — "Go" fades up
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(goOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(goY,       { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
      ]).start();
    }, 700);

    // Phase 4 (950ms) — "Share" fades up
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(shareOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(shareY,       { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
      ]).start();
    }, 950);

    // Phase 5 (1150ms) — "X" pops, তারপর brand text-এর উপর shine sweep loop
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(xOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(xScale,   { toValue: 1, tension: 120, friction: 5, useNativeDriver: true }),
      ]).start();
      // brand text পুরো এলে — একটা আলোর ঝলক বাঁ→ডান চলে যায় (premium shine)।
      Animated.loop(
        Animated.sequence([
          Animated.delay(900),
          Animated.timing(shineX, { toValue: W * 0.6, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(shineX, { toValue: -120, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    }, 1150);

    // Phase 6 (1550ms) — tagline + bar
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(tagOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(tagY,       { toValue: 0, tension: 70, friction: 9, useNativeDriver: true }),
        Animated.timing(barOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(barWidth,   { toValue: W * 0.52, duration: 1800, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      ]).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerX, { toValue: W * 0.52 + 80, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
          Animated.timing(shimmerX, { toValue: -80, duration: 0, useNativeDriver: false }),
        ])
      ).start();
    }, 1550);

    // Shooting star — মাঝে মাঝে এক কোণ থেকে আরেক কোণে দ্রুত শাঁ করে যায়।
    // fast (550ms) + লম্বা বিরতি (2.6s) → বিরল, premium "শুটিং স্টার" feel।
    Animated.loop(
      Animated.sequence([
        Animated.delay(1800),
        Animated.timing(starProg, { toValue: 1, duration: 550, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(starProg, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(2600),
      ])
    ).start();

    // Auth
    const startTime = Date.now();
    const finishLoading = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
      setTimeout(() => setLoading(false), remaining);
    };

    // ---- Supabase auth mode ----
    // Firebase onAuthStateChanged-এর বদলে Supabase session দেখি।
    // suspension চেক এখন Supabase badgeService দিয়ে — RLS-এ কাজ করে
    // (Firebase-এ permission_denied দিত, তাই আগে skip করা ছিল)।
    if (FEATURE_FLAGS.USE_SUPABASE_AUTH) {
      (async () => {
        if (resolved.current) return;
        resolved.current = true;
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const userData = await authService.getCurrentUser();
            if (userData) {
              const suspension = await checkSuspension(userData.uid);
              if (suspension.suspended) {
                await authService.logout();
                setSuspension({ reason: suspension.reason, suspendedUntil: (userData as any).suspendedUntil });
                setUser(null);
                finishLoading();
                return;
              }
            }
            setUser(userData ?? null);
          } else {
            setUser(null);
          }
        } catch {
          setUser(null);
        }
        finishLoading();
      })();
      return;
    }

    // ---- Firebase auth mode (default) ----
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (resolved.current) return;
      resolved.current = true;
      if (firebaseUser) {
        setUser(buildFallbackUser(firebaseUser));
        try {
          const userData = await authService.getCurrentUser();
          if (userData) {
            const suspension = await checkSuspension(userData.uid);
            if (suspension.suspended) {
              const { signOut } = await import('firebase/auth');
              await signOut(auth);
              setSuspension({ reason: suspension.reason, suspendedUntil: (userData as any).suspendedUntil });
              setUser(null);
              finishLoading();
              return;
            }
            setUser(userData);
          }
        } catch { /* fallback already set */ }
      } else {
        setUser(null);
      }
      finishLoading();
    });

    return unsubscribe;
  }, []);

  const bgColor = bgAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['#020408', '#060C1A'],
  });

  return (
    <Animated.View style={[s.root, { backgroundColor: bgColor }]}>

      {/* Ambient blobs */}
      <View style={s.blobTR} />
      <View style={s.blobBL} />
      <View style={s.blobCenter} />

      {/* Floating particles */}
      {PARTICLES.map((p, i) => <Particle key={i} {...p} />)}

      {/* Shooting star — চিকন আলোর streak (trail সহ) উপর-বাঁ → নিচ-ডানে
          দ্রুত শাঁ করে যায়। translate দিয়ে চলে, opacity দিয়ে শুরু/শেষে fade।
          pointerEvents none → শুধু দৃশ্য। */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: H * 0.16,
          left: -60,
          width: 90,
          height: 2.5,
          borderRadius: 2,
          backgroundColor: 'rgba(199,210,254,0.9)',
          shadowColor: '#A5B4FC',
          shadowOpacity: 0.9,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
          opacity: starProg.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateX: starProg.interpolate({ inputRange: [0, 1], outputRange: [0, W * 0.95] }) },
            { translateY: starProg.interpolate({ inputRange: [0, 1], outputRange: [0, H * 0.42] }) },
            { rotate: '24deg' },
          ],
        }}
      />

      {/* ── Logo mark + pulse rings ── */}
      <View style={s.logoArea}>

        {/* Pulse rings */}
        <Animated.View style={[s.ring, { transform: [{ scale: ring1Scale }], opacity: ring1Opacity }]} />
        <Animated.View style={[s.ring, { transform: [{ scale: ring2Scale }], opacity: ring2Opacity }]} />

        {/* Logo mark — entrance scale + subtle breathing (0↔1 → 1↔1.045)। */}
        <Animated.View style={{
          opacity: markOpacity,
          transform: [
            { scale: markScale },
            { scale: markBreath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] }) },
          ],
        }}>
          <LogoMark size={100} />
        </Animated.View>

        {/* Brand name + shine sweep */}
        <View style={s.brandRow}>
          <Animated.Text style={[s.brandGo,    { opacity: goOpacity,    transform: [{ translateY: goY }] }]}>Go</Animated.Text>
          <Animated.Text style={[s.brandShare, { opacity: shareOpacity, transform: [{ translateY: shareY }] }]}>Share</Animated.Text>
          <Animated.Text style={[s.brandX,     { opacity: xOpacity,     transform: [{ scale: xScale }] }]}>X</Animated.Text>
          {/* আলোর ঝলক — brand text-এর উপর দিয়ে বাঁ→ডান চলে যায়। তির্যক
              (rotate) সাদা streak, pointerEvents none → শুধু দৃশ্য, tap নয়। */}
          <Animated.View
            pointerEvents="none"
            style={[s.shine, { transform: [{ translateX: shineX }, { rotate: '18deg' }] }]}
          />
        </View>

        {/* Tagline */}
        <Animated.Text style={[s.tagline, { opacity: tagOpacity, transform: [{ translateY: tagY }] }]}>
          Share rides · Split fares · Save more
        </Animated.Text>

        {/* Divider line */}
        <Animated.View style={[s.divider, { opacity: tagOpacity }]} />

        {/* Progress bar */}
        <Animated.View style={[s.barTrack, { opacity: barOpacity }]}>
          <Animated.View style={[s.barFill, { width: barWidth }]} />
          <Animated.View style={[s.barGlow, { width: barWidth }]} />
          <Animated.View style={[s.shimmer, { left: shimmerX }]} />
        </Animated.View>

      </View>

      {/* Bottom version */}
      <Animated.Text style={[s.version, { opacity: tagOpacity }]}>v1.0.0 · GoShareX</Animated.Text>

    </Animated.View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Ambient blobs
  blobTR: {
    position: 'absolute', top: -120, right: -80,
    width: 380, height: 380, borderRadius: 190,
    backgroundColor: 'rgba(99,102,241,0.13)',
  },
  blobBL: {
    position: 'absolute', bottom: -140, left: -100,
    width: 340, height: 340, borderRadius: 170,
    backgroundColor: 'rgba(52,211,153,0.08)',
  },
  blobCenter: {
    position: 'absolute',
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(99,102,241,0.05)',
  },

  // Logo area
  logoArea: { alignItems: 'center', gap: 0 },

  // Pulse rings
  ring: {
    position: 'absolute',
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.5)',
  },

  // Brand name
  brandRow: {
    flexDirection: 'row', alignItems: 'baseline',
    marginTop: 24, gap: 2,
  },
  brandGo:    { fontSize: 44, fontWeight: '900', color: '#FFFFFF',  letterSpacing: -2 },
  brandShare: { fontSize: 44, fontWeight: '900', color: '#818CF8',  letterSpacing: -2 },
  brandX:     { fontSize: 44, fontWeight: '900', color: '#34D399',  letterSpacing: -2 },

  // brand text-এর উপর দিয়ে যাওয়া তির্যক আলোর streak (premium shine)।
  shine: {
    position: 'absolute',
    top: -10, left: 0,
    width: 36, height: 80,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 18,
  },

  // Tagline
  tagline: {
    marginTop: 10,
    fontSize: 12.5, fontWeight: '500',
    color: '#4A5A78', letterSpacing: 0.5,
  },

  // Divider
  divider: {
    marginTop: 36,
    width: W * 0.18, height: 1,
    backgroundColor: 'rgba(99,102,241,0.25)',
    borderRadius: 1,
  },

  // Progress bar
  barTrack: {
    marginTop: 16,
    width: W * 0.52, height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  barFill: {
    position: 'absolute', left: 0, top: 0,
    height: 2.5, borderRadius: 2,
    backgroundColor: '#6366F1',
  },
  barGlow: {
    position: 'absolute', left: 0, top: -4,
    height: 10, borderRadius: 5,
    backgroundColor: 'rgba(99,102,241,0.22)',
  },
  shimmer: {
    position: 'absolute', top: -1,
    width: 80, height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // Version
  version: {
    position: 'absolute', bottom: 36,
    fontSize: 10.5, color: '#1E2A3A',
    fontWeight: '600', letterSpacing: 1.2,
  },
});

export default SplashScreen;
