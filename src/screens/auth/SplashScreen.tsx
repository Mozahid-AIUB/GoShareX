import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

import { auth } from '@/config/firebase.config';
import { useAuthStore } from '@/store';
import authService from '@/services/authService';
import { checkSuspension } from '@/services/badgeService';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { supabase } from '@/config/supabase.config';
import SplashLogo from './SplashLogo';

const { width: W, height: H } = Dimensions.get('window');
// road draw(600)+delay(150) → car travel(800) → reveal(500) শেষ হয় ~2050ms-এ;
// তারপরই brand text শুরু হয় (নিচের Phase 3-6 দেখো) — তাই স্ক্রিন কমপক্ষে এই
// পুরো sequence + text দেখানোর মতো সময় থাকা দরকার।
const MIN_DISPLAY_MS = 3400;

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

  // Logo mark — entrance opacity/scale (পুরো SplashLogo group-এর জন্য)।
  const markOpacity = useRef(new Animated.Value(1)).current;
  const markScale   = useRef(new Animated.Value(1)).current;
  // brand text-এর উপর দিয়ে চলে যাওয়া shine sweep।
  const shineX      = useRef(new Animated.Value(-120)).current;
  // shooting star — এক কোণ থেকে আরেক কোণে দ্রুত শাঁ করে যায় (0→1 progress)।
  const starProg    = useRef(new Animated.Value(0)).current;

  // ── Signature sequence: road draws in → car travels road → G+X reveals ──
  // (SplashLogo.tsx দেখো — icon.png-এর সাথে মেলানো নতুন SVG, PNG-তে অংশ
  // আলাদা করে animate করা সম্ভব না বলে এই SVG বানানো হয়েছে)।
  const roadDraw    = useRef(new Animated.Value(0)).current;
  const carProg     = useRef(new Animated.Value(0)).current;
  const markReveal  = useRef(new Animated.Value(0)).current;

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
    // Phase 1 (0ms) — bg lifts
    Animated.timing(bgAnim, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();

    // ── Signature sequence (SplashLogo.tsx) ──
    // ১. road draw-in (~600ms) → ২. car road ধরে ভ্রমণ করে (~800ms) →
    // ৩. G+X shape reveal (~500ms)। SVG stroke/G-transform props — native
    // driver অচল, তাই সবই false (হালকা, ৩ সেকেন্ডেই একবার চলে, লুপ নয়)।
    Animated.timing(roadDraw, {
      toValue: 1, duration: 600, delay: 150,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start(() => {
      Animated.timing(carProg, {
        toValue: 1, duration: 800,
        easing: Easing.inOut(Easing.cubic), useNativeDriver: false,
      }).start(() => {
        Animated.timing(markReveal, {
          toValue: 1, duration: 500,
          easing: Easing.out(Easing.back(1.2)), useNativeDriver: false,
        }).start();
      });
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

    // Phase 3 (2150ms — road+car+reveal sequence শেষ হওয়ার পর) — "Go" fades up
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(goOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(goY,       { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
      ]).start();
    }, 2150);

    // Phase 4 (2400ms) — "Share" fades up
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(shareOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(shareY,       { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
      ]).start();
    }, 2400);

    // Phase 5 (2600ms) — "X" pops, তারপর brand text-এর উপর shine sweep loop
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
    }, 2600);

    // Phase 6 (3000ms) — tagline + bar
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
    }, 3000);

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
    if (FEATURE_FLAGS.USE_SUPABASE_AUTH) {
      (async () => {
        if (resolved.current) return;
        resolved.current = true;

        // Safety timeout: ১০ সেকেন্ডে auth শেষ না হলে force করে বেরিয়ে যাই।
        // Firebase init hang বা network সমস্যায় app splash-এ stuck থাকে —
        // এই timeout সেটা ঠেকায়।
        const timeoutId = setTimeout(() => {
          if (!resolved.current) return;
          setUser(null);
          finishLoading();
        }, 10000);

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
                clearTimeout(timeoutId);
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
        clearTimeout(timeoutId);
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
      {/* Trail — shooting star-এর ঠিক পিছনে ৩টা ছোট ম্লান বিন্দু (একই পথ,
          সামান্য পিছিয়ে + ছোট + কম opacity) — motion আরও dynamic লাগে,
          দূরের অন্য rider-দের গমনাগমনের subtle আভাস। */}
      {[0.05, 0.09, 0.13].map((lag, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: H * 0.16,
            left: -60,
            width: 5 - i, height: 5 - i,
            borderRadius: 3,
            backgroundColor: 'rgba(165,180,252,0.7)',
            opacity: starProg.interpolate({
              inputRange: [0, lag, lag + 0.1, 0.8, 1],
              outputRange: [0, 0, 0.5 - i * 0.12, 0.5 - i * 0.12, 0],
            }),
            transform: [
              { translateX: starProg.interpolate({ inputRange: [0, 1], outputRange: [0, (W * 0.95) * (1 - lag)] }) },
              { translateY: starProg.interpolate({ inputRange: [0, 1], outputRange: [0, (H * 0.42) * (1 - lag)] }) },
            ],
          }}
        />
      ))}

      {/* ── Logo mark + pulse rings ── */}
      <View style={s.logoArea}>

        {/* Pulse rings */}
        <Animated.View style={[s.ring, { transform: [{ scale: ring1Scale }], opacity: ring1Opacity }]} />
        <Animated.View style={[s.ring, { transform: [{ scale: ring2Scale }], opacity: ring2Opacity }]} />

        {/* Signature — road draws in → car travels road → G+X reveals
            (icon.png-এর সাথে মেলানো SVG, SplashLogo.tsx দেখো)। */}
        <Animated.View style={{ opacity: markOpacity, transform: [{ scale: markScale }] }}>
          <SplashLogo size={140} roadDraw={roadDraw} carProg={carProg} markReveal={markReveal} />
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
