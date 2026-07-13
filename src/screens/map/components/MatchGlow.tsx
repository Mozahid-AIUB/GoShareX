import React from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * MatchGlow — match-করা rider-এর bubble wrap।
 *
 * আগে এটা native-driver spring scale (0.4→1) entrance animation করত।
 * কিন্তু react-native-maps Android marker `tracksViewChanges` দিয়ে bitmap
 * snapshot নেয় — child-এ চলমান native animation থাকলে snapshot
 * mid-animation (scale≈0.4) freeze হয়ে যায় → pin ছোট/কাটা আটকে যেত।
 * তাই animation বাদ; এটা এখন একটা স্থির wrap (scale সবসময় 1) — pin
 * সবসময় পুরো আঁকা অবস্থায় freeze হয়। entrance "জীবন্ত" ভাব PulseRing দেয়।
 *
 * glowColor prop API একই রাখতে রাখা হয়েছে (ব্যবহার হয় না)।
 */
export default function MatchGlow({
  children,
}: {
  children: React.ReactNode;
  glowColor?: string;
}) {
  return <View style={s.wrap}>{children}</View>;
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center' },
});
