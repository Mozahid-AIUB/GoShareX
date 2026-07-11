// Web fallback — react-native-maps native-only (codegenNativeCommands ইম্পোর্ট
// web-এ bundle fail করে)। GoShareX mobile-only app; এই ফাইল শুধু dev-preview-এ
// (splash/UI দেখতে `npx expo start --web`) web bundle-কে চালু রাখে।
// Metro platform-resolution অনুযায়ী web build-এ এই ফাইল ব্যবহার হয়,
// Android/iOS build-এ আসল LiveMapScreen.tsx-ই চলে (অপরিবর্তিত)।
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LiveMapScreenWeb() {
  return (
    <View style={s.root}>
      <Text style={s.text}>Map view — Android/iOS-এ দেখুন{'\n'}(react-native-maps web সাপোর্ট করে না)</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0F1E', padding: 24 },
  text: { color: '#C7D2FE', textAlign: 'center', fontSize: 14, lineHeight: 22 },
});
