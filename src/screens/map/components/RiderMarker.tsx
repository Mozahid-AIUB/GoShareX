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
    // বড় pin (44px) + PulseRing(72) + dest chip পুরো render হওয়ার সময় দিই,
    // নাহলে Android-এ freeze আগে হলে icon অর্ধেক/কাটা দেখায়।
    const t = setTimeout(() => setTracks(false), 1000);
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
          size={24}
        />
      </View>
      <View style={[m.pinTail, { borderTopColor: bg }]} />
      {/* destination chip — premium pill, শুধু name (center)। */}
      {rider.destination ? (
        <View style={[m.destChip, { borderColor: bg }]}>
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
        {isMatch && <PulseRing color={matchColor} size={72} />}
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
  // fixed bounding box — PulseRing(72)+pin+tail+chip সব এর ভেতরে যেন থাকে,
  // নাহলে Android marker view box ছোট ধরে icon অর্ধেক কেটে ফেলে।
  wrap: { width: 150, alignItems: 'center', justifyContent: 'center' },
  pin: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
    elevation: 7,
  },
  // selected pin — box একটু বড় + glow (icon size একই থাকে)।
  pinSelected: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 3,
    shadowOpacity: 0.7, shadowRadius: 11,
    elevation: 12,
  },
  pinTail: {
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 9,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    marginTop: -2,
  },
  // premium pill — শুধু name (center)। wrap center-align করায় chip-এর
  // প্রস্থ যাই হোক pin-এর নিচে মাঝখানে থাকে।
  destChip: {
    marginTop: 4,
    maxWidth: 144,
    backgroundColor: 'rgba(14,20,48,0.95)',
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 7,
  },
  destChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
    textAlign: 'center',
  },
});
