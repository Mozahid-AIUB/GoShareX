/**
 * useSystemBars — প্রতিটা screen নিজের background অনুযায়ী status bar ও
 * Android navigation bar-এর icon/text color (light/dark) মানিয়ে নেয়।
 *
 * SDK 54-এ Android edge-to-edge default enabled — এই মোডে navigation bar
 * transparent থাকে (নিজস্ব solid রঙ নেই, content তার নিচ পর্যন্ত extend
 * হয়), তাই পুরনো expo-navigation-bar/expo-status-bar imperative API
 * (setBackgroundColorAsync ইত্যাদি) silently no-op হয়ে যায়। এখানে
 * react-native-edge-to-edge-এর SystemBars stack API ব্যবহার করছি, যেটা
 * edge-to-edge মোডে আসল কাজ করে — pushStackEntry/popStackEntry screen
 * focus/blur-এর সাথে মিলিয়ে ব্যবহার করলে navigation-এ আগের screen-এর
 * bar style ফিরে আসে (stack-এর মতো)।
 */

import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { SystemBars } from 'react-native-edge-to-edge';

type BarTheme = 'light' | 'dark';

/**
 * @param _background  ব্যবহার হয় না (edge-to-edge nav bar transparent) — signature-এ রাখা হয়েছে call site গুলোতে screen-এর background স্পষ্ট থাকার জন্য
 * @param theme         'dark' = কালো আইকন/টেক্সট (হালকা background-এর জন্য), 'light' = সাদা (গাঢ় background-এর জন্য)
 */
export function useSystemBars(_background: string, theme: BarTheme): void {
  useFocusEffect(
    useCallback(() => {
      const entry = SystemBars.pushStackEntry({ style: theme });
      return () => SystemBars.popStackEntry(entry);
    }, [theme]),
  );
}
