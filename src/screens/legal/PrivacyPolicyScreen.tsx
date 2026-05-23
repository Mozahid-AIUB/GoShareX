import React from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';

const IconBack = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="#1A1A2E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const Section = ({ title, children }: { title: string; children: string }) => (
  <View style={s.section}>
    <Text style={s.sectionTitle}>{title}</Text>
    <Text style={s.sectionBody}>{children}</Text>
  </View>
);

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <IconBack />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.lastUpdated}>Last updated: May 1, 2025</Text>

        <View style={s.introBadge}>
          <Text style={s.introBadgeText}>GoShareX — AIUB Ride Sharing</Text>
        </View>

        <Text style={s.intro}>
          GoShareX ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use the GoShareX mobile application.
        </Text>

        <Section title="1. Information We Collect">
          {`We collect the following types of information:\n\n• Account Information: Name, email address, student ID, department\n• Location Data: Real-time GPS location while the app is active and during rides\n• Usage Data: Ride history, ratings, chat messages, app activity\n• Device Data: Device type, operating system, push notification token\n\nWe do NOT collect payment information directly. No credit card or banking data is stored.`}
        </Section>

        <Section title="2. How We Use Your Information">
          {`We use your information to:\n\n• Match you with nearby riders going to the same destination\n• Enable real-time location sharing during active rides\n• Send push notifications about ride requests and confirmations\n• Calculate and display ride statistics and savings\n• Maintain your trust score and badge level\n• Prevent fraud and ensure community safety`}
        </Section>

        <Section title="3. Location Data">
          {`GoShareX uses your location to:\n\n• Show your position on the live map\n• Match you with riders within your search radius\n• Track active rides for safety\n\nLocation is only shared with matched ride partners. Your precise location is never shared publicly. You may disable location access in your device settings, but this will prevent core app functionality.`}
        </Section>

        <Section title="4. Data Sharing">
          {`We do not sell your personal data. We share data only with:\n\n• Firebase (Google) — Authentication, database, and cloud storage\n• Google Maps — Location and routing services\n• Other GoShareX users — Only your name, destination, pickup point, and rating are visible to nearby riders\n\nWe do not share your email address or student ID with other users.`}
        </Section>

        <Section title="5. Data Retention">
          {`• Account data is retained while your account is active\n• Ride history is kept for 12 months\n• Chat messages expire automatically after 24 hours (anonymous chats: 10 minutes)\n• Location data is not stored permanently — only used in real-time\n\nYou may request deletion of your account and all associated data by contacting us.`}
        </Section>

        <Section title="6. Security">
          {`We implement industry-standard security measures:\n\n• All data transmitted over HTTPS/TLS encryption\n• Firebase Security Rules restrict data access to authorized users only\n• Passwords are hashed by Firebase Authentication — we never see your password\n• Sensitive tokens stored in device secure storage`}
        </Section>

        <Section title="7. Your Rights">
          {`You have the right to:\n\n• Access the personal data we hold about you\n• Request correction of inaccurate data\n• Request deletion of your account and data\n• Withdraw consent for location tracking at any time\n• Opt out of push notifications via device settings\n\nTo exercise these rights, contact us at the email below.`}
        </Section>

        <Section title="8. Children's Privacy">
          {`GoShareX is intended for university students aged 18 and above. We do not knowingly collect data from anyone under 18. If you believe a minor has created an account, please contact us immediately.`}
        </Section>

        <Section title="9. Changes to This Policy">
          {`We may update this Privacy Policy from time to time. We will notify you of significant changes via the app or email. Continued use of GoShareX after changes constitutes acceptance of the updated policy.`}
        </Section>

        <Section title="10. Contact Us">
          {`For privacy-related questions or data deletion requests:\n\nEmail: mozahidislam343@gmail.com\nApp: GoShareX\nDeveloper: Mozahid Islam\n\nWe will respond within 7 business days.`}
        </Section>

        <View style={s.footer}>
          <Text style={s.footerText}>© 2025 GoShareX. All rights reserved.</Text>
          <Text style={s.footerText}>Built by AIUB CSE — ভাড়া ভাগ করো, টাকা বাঁচাও 🛺</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F7FF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EDE9FE',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F0FF', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.3 },
  scroll: { padding: 20, paddingBottom: 48 },
  lastUpdated: { fontSize: 12, color: '#9896A8', marginBottom: 12 },
  introBadge: {
    backgroundColor: '#EDE9FE', borderRadius: 20, alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16,
  },
  introBadgeText: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
  intro: { fontSize: 13, color: '#4B5563', lineHeight: 20, marginBottom: 24 },
  section: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: '#EDE9FE',
    shadowColor: '#7C3AED', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#1A1A2E', marginBottom: 10, letterSpacing: -0.2 },
  sectionBody: { fontSize: 13, color: '#4B5563', lineHeight: 21 },
  footer: { alignItems: 'center', marginTop: 24, gap: 4 },
  footerText: { fontSize: 11, color: '#9896A8', textAlign: 'center' },
});
