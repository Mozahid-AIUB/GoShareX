import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import { Marker } from 'react-native-maps';
import VehicleIcon from '@/components/common/VehicleIcon';
import { VehicleType } from '@/store/rideStore';
import PulseRing from './PulseRing';
import MatchGlow from './MatchGlow';

/**
 * RiderMarker — map-এ একটা rider-এর pin। প্রতিটা marker *নিজে নিজে*
 * tracksViewChanges manage করে: প্রথম render-এ track=true (SVG icon পুরো
 * আঁকার সুযোগ দেয়), short delay পরে track=false (freeze → performance)।
 *
 * কেন এই pattern (timer hack নয়):
 *   - react-native-maps-এ tracksViewChanges=false শুরু থেকে দিলে SVG/child
 *     পুরো render হওয়ার আগেই freeze হয় → icon ছোট/ফাঁকা আটকে যায়।
 *   - parent থেকে একটা শেয়ার্ড timer দিয়ে সব marker একসাথে track/freeze করলে
 *     নতুন marker mid-cycle এলে miss করে, আর সব marker একসাথে re-render হয়ে
 *     flicker করে।
 *   - তাই প্রতিটা marker নিজের freeze নিজে চালায়। coordinate বদলালে
 *     pin নড়াতে আবার অল্প সময় track করি। এটা Uber/react-native-maps-এর
 *     official recommended approach।
 *
 * stacking: Android-এ <Marker zIndex> অনির্ভরযোগ্য — parent render order
 * দিয়েই stacking ঠিক করা হয় (কমলা আগে, সবুজ/selected পরে)।
 */
export interface RiderMarkerData {
  userId: string;
  lat: number;
  lng: number;
  destination: string;
  vehicleType?: string;
  isMatch: boolean;
}

interface Props {
  rider: RiderMarkerData;
  isSelected: boolean;
  matchColor: string;
  nearbyColor: string;
  onPress: (rider: RiderMarkerData) => void;
}

function RiderMarkerBase({ rider, isSelected, matchColor, nearbyColor, onPress }: Props) {
  const isMatch = rider.isMatch;
  const bg = isMatch ? matchColor : nearbyColor;
  const vType = (rider.vehicleType as VehicleType) ?? 'rickshaw';

  // self-freeze: render-এর পর অল্প সময় track করি, তারপর freeze।
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    // coordinate/match অবস্থা বদলালে আবার track করি (pin নড়া/রং বদল render হোক)।
    setTracks(true);
    const t = setTimeout(() => setTracks(false), 600);
    return () => clearTimeout(t);
  }, [rider.lat, rider.lng, isMatch, isSelected]);

  const pin = (
    <>
      <View
        style={[
          m.pin,
          { backgroundColor: bg, borderColor: isMatch ? '#ECFDF5' : '#FFF7ED' },
          isSelected && m.pinSelected,
        ]}
      >
        {/* সব pin-এর icon একই size (match/non-match/selected নির্বিশেষে) —
            শুধু রং আলাদা, size কখনো বদলায় না। */}
        <VehicleIcon
          type={vType === 'bike' ? 'motorcycle' : vType === 'cng' ? 'cng' : 'rickshaw'}
          tone="mono"
          active
          size={20}
        />
      </View>
      <View style={[m.pinTail, { borderTopColor: bg }]} />
      {/* destination chip — premium glass pill: ছোট location pin glyph
          (pin-এর রঙে) + destination name (center)। */}
      {rider.destination ? (
        <View style={[m.destChip, { borderColor: bg }]}>
          <MaterialCommunityIcons name="map-marker" size={11} color={bg} style={m.destChipIcon} />
          <RNText style={m.destChipText} numberOfLines={1}>
            {rider.destination}
          </RNText>
        </View>
      ) : null}
    </>
  );

  return (
    <Marker
      coordinate={{ latitude: rider.lat, longitude: rider.lng }}
      onPress={() => onPress(rider)}
      zIndex={isSelected ? 30 : isMatch ? 20 : 10}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracks}
    >
      <View style={m.wrap}>
        {isMatch && <PulseRing color={matchColor} size={60} />}
        {isMatch ? <MatchGlow glowColor={matchColor}>{pin}</MatchGlow> : pin}
      </View>
    </Marker>
  );
}

// rider-এর মান না বদলালে re-render না — flicker কমে, perf বাড়ে।
export default memo(RiderMarkerBase, (prev, next) =>
  prev.rider.userId === next.rider.userId &&
  prev.rider.lat === next.rider.lat &&
  prev.rider.lng === next.rider.lng &&
  prev.rider.isMatch === next.rider.isMatch &&
  prev.rider.destination === next.rider.destination &&
  prev.rider.vehicleType === next.rider.vehicleType &&
  prev.isSelected === next.isSelected,
);

const m = StyleSheet.create({
  // d0b559d-এর working wrap — fixed size দিলে anchor 0.5/0.5 + বড় box
  // pin-কে GPS থেকে সরিয়ে দেয়/lukিয়ে ফেলে। center-align যথেষ্ট।
  wrap: { alignItems: 'center' },
  pin: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 5, shadowOffset: { width: 0, height: 3 },
    elevation: 7,
  },
  // selected pin — box একটু বড় + glow (icon size একই থাকে)।
  pinSelected: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 3,
    shadowOpacity: 0.7, shadowRadius: 10,
    elevation: 12,
  },
  pinTail: {
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 9,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    marginTop: -2,
  },
  // premium glass pill — location glyph + name (center)। wrap center-align
  // করায় chip-এর প্রস্থ যাই হোক pin-এর নিচে মাঝখানে থাকে।
  destChip: {
    marginTop: 5,
    maxWidth: 152,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(12,17,40,0.96)',
    paddingLeft: 8,
    paddingRight: 11,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 9,
  },
  destChipIcon: {
    marginRight: 3,
    marginLeft: -1,
  },
  destChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
    textAlign: 'center',
  },
});
