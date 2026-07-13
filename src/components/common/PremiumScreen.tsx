import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { premiumTheme } from '@/design/premium';

type PremiumScreenProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function PremiumScreen({ children, style }: PremiumScreenProps) {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.orbPrimary} />
        <View style={styles.orbSecondary} />
        <View style={styles.orbAccent} />
        <View style={styles.topTint} />
        <View style={styles.bottomTint} />
        <View style={[styles.content, style]}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  // NOTE: এটা #FAF8FF (হালকা) করার চেষ্টা হয়েছিল tab-transition flash কমাতে,
  // কিন্তু SafeAreaView-এর bottom safe-area padding strip-এ orb/tint
  // layer-গুলো (সব position:absolute, SafeAreaView-এর ভিতরে) পৌঁছায় না —
  // ফলে ওই padding strip root-এর রঙ দেখাত, যা হালকা করায় tab bar-এর ঠিক
  // উপরে একটা দৃশ্যমান ধূসর/হালকা ব্যান্ড হিসেবে ফুটে উঠত (আগে গাঢ় থাকায়
  // বাকি dark screen-এর সাথে মিশে অদৃশ্য ছিল)। তাই আসল রঙে ফেরত।
  root: {
    flex: 1,
    backgroundColor: premiumTheme.bg,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
  },
  orbPrimary: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(139,92,246,0.16)',
  },
  orbSecondary: {
    position: 'absolute',
    top: 180,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(34,211,238,0.09)',
  },
  orbAccent: {
    position: 'absolute',
    bottom: -80,
    right: 10,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(236,72,153,0.08)',
  },
  topTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    backgroundColor: 'rgba(18,11,37,0.45)',
  },
  bottomTint: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '38%',
    backgroundColor: 'rgba(10,16,34,0.65)',
  },
});
