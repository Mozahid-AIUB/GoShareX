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

  // self-freeze: marker content পুরো layout/paint হওয়ার পর তবেই freeze করি।
  // timer-only ভরসা করা যায় না (icon font/SVG কখন paint শেষ অজানা) — তাই
  // onLayout (layout মাপা শেষ) + একটা ছোট safety-delay মিলিয়ে freeze করি।
  // coordinate/match বদলালে আবার track on করি যাতে নতুন frame snapshot হয়।
  const [tracks, setTracks] = useState(true);
  const freezeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // layout শেষ হলে: চলমান freeze বাতিল করে নতুন safety-delay শুরু করি।
  // delay-এর মধ্যে চাকা/text/dot সব paint হয়ে যায়, তারপরই snapshot freeze।
  const scheduleFreeze = () => {
    if (freezeTimer.current) clearTimeout(freezeTimer.current);
    freezeTimer.current = setTimeout(() => setTracks(false), 350);
  };

  useEffect(() => {
    setTracks(true);
    scheduleFreeze(); // onLayout না এলেও (একই size হলে) fallback হিসেবে।
    return () => {
      if (freezeTimer.current) clearTimeout(freezeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    </>
  );

  return (
    <>
      <Marker
        coordinate={{ latitude: rider.lat, longitude: rider.lng }}
        onPress={() => onPress(rider)}
        zIndex={isSelected ? 30 : isMatch ? 20 : 10}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={tracks}
      >
        <View style={m.wrap} onLayout={scheduleFreeze}>
          {isMatch && <PulseRing color={matchColor} size={60} />}
          {isMatch ? <MatchGlow glowColor={matchColor}>{pin}</MatchGlow> : pin}
        </View>
      </Marker>

      {/* destination label — সম্পূর্ণ আলাদা Marker (pin-এর নিজস্ব bitmap
          snapshot থেকে স্বাধীন)। তাই এটা pin-এর icon-কে কখনো clip/ঢাকতে
          পারে না — আগের সব "icon কাটা/কালো box" সমস্যা প্রযুক্তিগতভাবে অসম্ভব।
          anchor x:0.5,y:0 → label-এর উপরের-মাঝ rider coordinate-এ, তাই text
          pin-এর নিচে ঝোলে। zIndex pin-এর চেয়ে কম। শুধু text (font আগেই
          loaded), tracksViewChanges সবসময় false → কোনো timing race নেই।
          pointerEvents/tappable false → tap শুধু pin-এ যায়। */}
      <Marker
        coordinate={{ latitude: rider.lat, longitude: rider.lng }}
        anchor={{ x: 0.5, y: 0 }}
        // pin-এর ব্যাসার্ধ (~24px) নিচে নামাই যাতে text গোল pin + tail-এর
        // নিচে বসে, গায়ে লাগে না।
        centerOffset={{ x: 0, y: 32 }}
        zIndex={(isSelected ? 30 : isMatch ? 20 : 10) - 1}
        // pin-এর মতোই self-freeze: প্রথমে track=true (label-এর bitmap তৈরি
        // হওয়ার সুযোগ), তারপর freeze। শুরু থেকেই false দিলে Android কখনো
        // কখনো bitmap-ই বানায় না → কিছু label invisible (তাই আগে অল্প কয়েকটা
        // দেখাত)। onLayout freeze schedule করে — সব label নিশ্চিত আঁকা হয়।
        tracksViewChanges={tracks}
        tappable={false}
      >
        <View style={m.destChip} onLayout={scheduleFreeze}>
          <View style={[m.destChipDot, { backgroundColor: bg }]} />
          {/* numberOfLines নেই → text কখনো কাটে না, পুরো নাম এক লাইনে দেখায়।
              chip text-এর প্রাকৃতিক প্রস্থ অনুযায়ী বড় হয় (maxWidth/flexShrink
              নেই — Android marker snapshot-এ flex-shrink text কেটে ফেলত)। */}
          <RNText style={m.destChipText}>
            {rider.destination || 'Somewhere'}
          </RNText>
        </View>
      </Marker>
    </>
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
    // icon যেন round pin-এর border-এ clip না হয় (Android-এ borderRadius
    // অনেক সময় child clip করে)।
    overflow: 'visible',
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
  // pin-এর নিচের ত্রিভুজ লেজ। pin-এর সমান elevation যাতে map-এর উপরে
  // দেখা যায়, কিন্তু chip (elevation 1)-এর চেয়ে বেশি যাতে chip এর উপরে
  // উঠে না আসে।
  pinTail: {
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 9,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    marginTop: -2,
    elevation: 7,
  },
  // premium glass pill — location dot + name (center)। wrap center-align
  // করায় chip-এর প্রস্থ যাই হোক pin-এর নিচে মাঝখানে থাকে।
  //
  // KEY: Android-এ `elevation` z-order ঠিক করে — বেশি elevation-এর View
  // destination glass pill — এখন এটা সম্পূর্ণ আলাদা Marker-এর child, তাই
  // pin-এর icon-এর সাথে z-order/clip-এর কোনো সম্পর্ক নেই।
  destChip: {
    // maxWidth নেই → chip text-এর পুরো প্রস্থ অনুযায়ী বড় হয়, নাম কখনো কাটে
    // না। (Android marker snapshot-এ maxWidth/flexShrink দিলে text কাটত।)
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(12,17,40,0.96)',
    paddingLeft: 9,
    paddingRight: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  // ছোট রঙিন বৃত্ত — pure View, font-free (snapshot-এ সাথে সাথে আঁকে)।
  destChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  destChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});
