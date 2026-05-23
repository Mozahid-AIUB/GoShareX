/**
 * LegalScreen — Combined Terms of Service + Privacy Policy.
 * Two tabs at the top so user can switch without going back.
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';

type Tab = 'terms' | 'privacy';

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

const TermsContent = () => (
  <>
    <Text style={s.lastUpdated}>Last updated: May 23, 2026</Text>

    <View style={s.introBadge}>
      <Text style={s.introBadgeText}>GoShareX — Terms of Service</Text>
    </View>

    <Text style={s.intro}>
      Welcome to GoShareX. By creating an account or using this app, you agree to the following
      terms. Please read them carefully.
    </Text>

    <Section title="1. What GoShareX Is">
      {`GoShareX is a peer-to-peer co-passenger matching app. We help you find other people going to the same destination so you can share a rickshaw, CNG, or bike and split the fare.\n\nGoShareX does NOT own vehicles, employ drivers, or operate rides. Every ride is a private agreement between two or more users.`}
    </Section>

    <Section title="2. Your Account">
      {`• You must be 18+ to use GoShareX.\n• You agree to provide accurate information (real name, valid email).\n• You are responsible for keeping your login credentials safe.\n• One account per person. Multiple accounts may be suspended.`}
    </Section>

    <Section title="3. How Matching Works">
      {`• You set a destination; the app shows nearby users going to the same place.\n• You may send / receive ride offers and chat with matched users.\n• Confirming a deal in chat is a verbal agreement between users — GoShareX is not a party to that agreement.`}
    </Section>

    <Section title="4. Fare & Payments">
      {`• GoShareX does NOT process payments. You pay the rickshaw / CNG / bike driver directly.\n• Fare suggestions in the app are estimates only. The actual fare is between you and the vehicle operator.\n• Splitting the fare with your co-passenger is between the two of you.\n• We are not responsible for fare disputes.`}
    </Section>

    <Section title="5. User Conduct">
      {`You agree NOT to:\n\n• Harass, threaten, or harm other users\n• Use the app for any illegal activity\n• Impersonate another person or create fake profiles\n• Share inappropriate content in chat\n• Spam ride requests or messages\n\nViolations may result in account suspension or permanent ban.`}
    </Section>

    <Section title="6. Ratings & Reports">
      {`After each ride, both users may rate each other (1–5 stars) and leave a comment. Ratings affect each user's public trust score and badge.\n\nRatings are anonymous — the rated user does not know who rated them what. Comments are visible only to GoShareX admins for review.\n\nFalse or malicious ratings may result in your own account being penalized.`}
    </Section>

    <Section title="7. Safety">
      {`• Always meet in well-lit, public pickup points.\n• Verify your co-passenger before getting in the vehicle.\n• Share your live ride link with a trusted contact (feature in app).\n• Use the in-app report feature for any safety concern.\n• In an emergency, call 999 immediately. GoShareX is not an emergency service.`}
    </Section>

    <Section title="8. Limitation of Liability">
      {`GoShareX is provided "as is". We make no warranties about uptime, accuracy of location data, behavior of other users, or the safety of rides.\n\nTo the maximum extent permitted by law, GoShareX is not liable for:\n• Injuries or accidents during rides\n• Lost or stolen property\n• Disputes between co-passengers\n• Behavior of rickshaw / CNG / bike operators\n• Any indirect, incidental, or consequential damages`}
    </Section>

    <Section title="9. Termination">
      {`We may suspend or terminate your account at any time for violations of these terms. You may delete your account at any time from the Settings screen.\n\nOn termination, your personal data is removed per our Privacy Policy.`}
    </Section>

    <Section title="10. Changes to These Terms">
      {`We may update these terms occasionally. Significant changes will be announced in the app. Continuing to use GoShareX after changes means you accept the updated terms.`}
    </Section>

    <Section title="11. Contact">
      {`Questions about these terms?\n\nEmail: mozahidislam343@gmail.com\nDeveloper: Mozahid Islam`}
    </Section>
  </>
);

const PrivacyContent = () => (
  <>
    <Text style={s.lastUpdated}>Last updated: May 23, 2026</Text>

    <View style={s.introBadge}>
      <Text style={s.introBadgeText}>GoShareX — Privacy Policy</Text>
    </View>

    <Text style={s.intro}>
      GoShareX ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy
      explains how we collect, use, and safeguard your information when you use the GoShareX
      mobile application.
    </Text>

    <Section title="1. Information We Collect">
      {`We collect the following types of information:\n\n• Account Information: Name, email address (Google profile picture if you sign in with Google)\n• Location Data: Real-time GPS location while the app is active and during rides\n• Usage Data: Ride history, ratings, chat messages, app activity\n• Device Data: Device type, operating system, push notification token\n\nWe do NOT collect payment information directly. No credit card or banking data is stored.`}
    </Section>

    <Section title="2. How We Use Your Information">
      {`We use your information to:\n\n• Match you with nearby riders going to the same destination\n• Enable real-time location sharing during active rides\n• Send push notifications about ride requests and confirmations\n• Calculate and display ride statistics and savings\n• Maintain your trust score and badge level\n• Prevent fraud and ensure community safety`}
    </Section>

    <Section title="3. Location Data">
      {`GoShareX uses your location to:\n\n• Show your position on the live map\n• Match you with riders within your search radius\n• Track active rides for safety\n\nLocation is only shared with matched ride partners. Your precise location is never shared publicly. You may disable location access in your device settings, but this will prevent core app functionality.`}
    </Section>

    <Section title="4. Data Sharing">
      {`We do not sell your personal data. We share data only with:\n\n• Firebase (Google) — Authentication, database, and cloud storage\n• Google Maps — Location and routing services\n• Other GoShareX users — Only your name, destination, pickup point, and rating are visible to nearby riders\n\nWe do not share your email address with other users.`}
    </Section>

    <Section title="5. Data Retention">
      {`• Account data is retained while your account is active\n• Ride history is kept for 12 months\n• Chat messages expire automatically after 24 hours (anonymous chats: 10 minutes)\n• Location data is not stored permanently — only used in real-time\n\nYou may request deletion of your account and all associated data by contacting us.`}
    </Section>

    <Section title="6. Security">
      {`We implement industry-standard security measures:\n\n• All data transmitted over HTTPS/TLS encryption\n• Firebase Security Rules restrict data access to authorized users only\n• Passwords are hashed by Firebase Authentication — we never see your password\n• Sensitive tokens stored in device secure storage`}
    </Section>

    <Section title="7. Ratings & Comments Privacy">
      {`When you rate another user after a ride:\n\n• Your stars and trait choices update their public trust score\n• Your written comment is visible ONLY to GoShareX admins\n• The rated user does not see who rated them or what was said\n• This anonymity protects honest feedback`}
    </Section>

    <Section title="8. Your Rights">
      {`You have the right to:\n\n• Access the personal data we hold about you\n• Request correction of inaccurate data\n• Request deletion of your account and data\n• Withdraw consent for location tracking at any time\n• Opt out of push notifications via device settings\n\nTo exercise these rights, contact us at the email below.`}
    </Section>

    <Section title="9. Children's Privacy">
      {`GoShareX is intended for users aged 18 and above. We do not knowingly collect data from anyone under 18. If you believe a minor has created an account, please contact us immediately.`}
    </Section>

    <Section title="10. Changes to This Policy">
      {`We may update this Privacy Policy from time to time. We will notify you of significant changes via the app or email. Continued use of GoShareX after changes constitutes acceptance of the updated policy.`}
    </Section>

    <Section title="11. Contact Us">
      {`For privacy-related questions or data deletion requests:\n\nEmail: mozahidislam343@gmail.com\nApp: GoShareX\n\nWe will respond within 7 business days.`}
    </Section>
  </>
);

export default function LegalScreen() {
  const navigation = useNavigation();
  const route = useRoute<{ key: string; name: string; params?: { initialTab?: Tab } }>();
  const [tab, setTab] = useState<Tab>(route.params?.initialTab ?? 'terms');

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <IconBack />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Terms & Privacy</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={s.tabsRow}>
        <TouchableOpacity
          style={[s.tab, tab === 'terms' && s.tabActive]}
          onPress={() => setTab('terms')}
          activeOpacity={0.75}
        >
          <Text style={[s.tabText, tab === 'terms' && s.tabTextActive]}>Terms of Service</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'privacy' && s.tabActive]}
          onPress={() => setTab('privacy')}
          activeOpacity={0.75}
        >
          <Text style={[s.tabText, tab === 'privacy' && s.tabTextActive]}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {tab === 'terms' ? <TermsContent /> : <PrivacyContent />}

        <View style={s.footer}>
          <Text style={s.footerText}>© 2026 GoShareX. All rights reserved.</Text>
          <Text style={s.footerText}>Share rides, save money 🛺</Text>
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

  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE9FE',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#6366F1' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#6366F1' },
  tabTextActive: { color: '#FFFFFF' },

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
