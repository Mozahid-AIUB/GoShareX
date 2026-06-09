import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
    Circle,
    Defs,
    Ellipse,
    G,
    LinearGradient,
    Path,
    Rect,
    Stop,
} from 'react-native-svg';

import { useRideStore, VEHICLE_CONFIG, VehicleType } from '@/store/rideStore';
import { useAuthStore } from '@/store/authStore';
import rideService from '@/services/rideService';
import { getFare } from '@/constants/fareTable';
import PremiumVehicleArt from '@/components/vehicles/PremiumVehicleArt';

// ─── Design Tokens ─────────────────────────────────────────────────────────
const C = {
    bg: '#080C14',
    surface: 'rgba(255,255,255,0.05)',
    surfaceStrong: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.1)',
    borderActive: '#6366F1',
    primary: '#6366F1',
    primaryDark: '#4F46E5',
    teal: '#14B8A6',
    text: '#E2E8F0',
    textSub: '#6E7E99',
    textMuted: '#3A4A6A',
    white: '#FFFFFF',
    amber: '#F59E0B',
    red: '#F43F5E',
};

// ─── SVG Vehicle Icons ──────────────────────────────────────────────────────
const IconRickshaw = ({ size = 48, active = false }: { size?: number; active?: boolean }) => (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Defs>
            <LinearGradient id="rk1" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={active ? '#818CF8' : '#4B5A7A'} />
                <Stop offset="1" stopColor={active ? '#6366F1' : '#2A3A5A'} />
            </LinearGradient>
            <LinearGradient id="rk2" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={active ? '#A5B4FC' : '#6E7E99'} />
                <Stop offset="1" stopColor={active ? '#6366F1' : '#3A4A6A'} />
            </LinearGradient>
        </Defs>
        {/* Body */}
        <Path d="M8 28 Q8 20 16 20 H34 Q40 20 40 28 L40 34 H8 Z" fill="url(#rk1)" />
        {/* Hood / canopy */}
        <Path d="M10 20 Q10 12 20 12 H32 Q38 14 36 20 Z" fill="url(#rk2)" opacity="0.85" />
        {/* Window */}
        <Rect x="14" y="13" width="10" height="7" rx="2" fill={active ? '#C7D2FE' : '#6E7E99'} opacity="0.5" />
        {/* Front detail */}
        <Rect x="36" y="24" width="3" height="6" rx="1.5" fill={active ? '#818CF8' : '#4B5A7A'} />
        {/* Wheels */}
        <Circle cx="14" cy="36" r="5" fill={active ? '#4F46E5' : '#1E2A40'} />
        <Circle cx="14" cy="36" r="2.5" fill={active ? '#818CF8' : '#3A4A6A'} />
        <Circle cx="36" cy="36" r="5" fill={active ? '#4F46E5' : '#1E2A40'} />
        <Circle cx="36" cy="36" r="2.5" fill={active ? '#818CF8' : '#3A4A6A'} />
        {/* Handle */}
        <Path d="M7 26 L4 26 L4 30" stroke={active ? '#A5B4FC' : '#4B5A7A'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const IconBike = ({ size = 48, active = false }: { size?: number; active?: boolean }) => (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Defs>
            <LinearGradient id="bk1" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={active ? '#2DD4BF' : '#4B5A7A'} />
                <Stop offset="1" stopColor={active ? '#14B8A6' : '#2A3A5A'} />
            </LinearGradient>
        </Defs>
        {/* Frame */}
        <Path d="M16 34 L24 18 L32 34" stroke="url(#bk1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M24 18 L36 34" stroke="url(#bk1)" strokeWidth="2" strokeLinecap="round" />
        <Path d="M16 34 L36 34" stroke={active ? '#14B8A6' : '#3A4A6A'} strokeWidth="1.5" />
        {/* Seat */}
        <Rect x="21" y="16" width="8" height="3" rx="1.5" fill={active ? '#2DD4BF' : '#4B5A7A'} />
        {/* Handlebar */}
        <Path d="M34 22 L38 20 M34 22 L38 24" stroke={active ? '#5EEAD4' : '#4B5A7A'} strokeWidth="1.5" strokeLinecap="round" />
        {/* Wheels */}
        <Circle cx="14" cy="34" r="7" stroke={active ? '#14B8A6' : '#3A4A6A'} strokeWidth="2" />
        <Circle cx="14" cy="34" r="2.5" fill={active ? '#14B8A6' : '#2A3A5A'} />
        <Circle cx="36" cy="34" r="7" stroke={active ? '#14B8A6' : '#3A4A6A'} strokeWidth="2" />
        <Circle cx="36" cy="34" r="2.5" fill={active ? '#14B8A6' : '#2A3A5A'} />
        {/* Speed lines */}
        {active && <>
            <Path d="M4 28 L8 28" stroke="#5EEAD4" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
            <Path d="M2 32 L6 32" stroke="#5EEAD4" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
        </>}
    </Svg>
);

const IconCNG = ({ size = 48, active = false }: { size?: number; active?: boolean }) => (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Defs>
            <LinearGradient id="cg1" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={active ? '#FDE68A' : '#4B5A7A'} />
                <Stop offset="1" stopColor={active ? '#F59E0B' : '#2A3A5A'} />
            </LinearGradient>
            <LinearGradient id="cg2" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={active ? '#FEF3C7' : '#3A4A6A'} />
                <Stop offset="1" stopColor={active ? '#F59E0B' : '#1E2A40'} />
            </LinearGradient>
        </Defs>
        {/* Body */}
        <Path d="M6 30 Q6 22 12 22 H36 Q42 22 42 30 L42 36 H6 Z" fill="url(#cg1)" />
        {/* Roof */}
        <Path d="M12 22 Q14 14 20 13 H30 Q36 14 36 22 Z" fill="url(#cg2)" />
        {/* Windows */}
        <Rect x="14" y="14" width="8" height="8" rx="2" fill={active ? '#FEF9C3' : '#4B5A7A'} opacity="0.55" />
        <Rect x="25" y="14" width="8" height="8" rx="2" fill={active ? '#FEF9C3' : '#4B5A7A'} opacity="0.55" />
        {/* Door line */}
        <Path d="M24 22 L24 36" stroke={active ? '#FDE68A' : '#3A4A6A'} strokeWidth="1" />
        {/* Headlight */}
        <Ellipse cx="42" cy="28" rx="2" ry="3" fill={active ? '#FEF08A' : '#2A3A5A'} />
        {/* Tail light */}
        <Rect x="5" y="27" width="2" height="5" rx="1" fill={active ? '#FCA5A5' : '#2A3A5A'} />
        {/* Wheels */}
        <Circle cx="14" cy="37" r="5" fill={active ? '#D97706' : '#1E2A40'} />
        <Circle cx="14" cy="37" r="2.5" fill={active ? '#FDE68A' : '#2A3A5A'} />
        <Circle cx="36" cy="37" r="5" fill={active ? '#D97706' : '#1E2A40'} />
        <Circle cx="36" cy="37" r="2.5" fill={active ? '#FDE68A' : '#2A3A5A'} />
        {/* CNG tank on roof */}
        <Ellipse cx="24" cy="13" rx="5" ry="2.5" fill={active ? '#6EE7B7' : '#2A3A5A'} />
        <Rect x="22" y="10" width="4" height="3" rx="1" fill={active ? '#34D399' : '#1E2A40'} />
    </Svg>
);

const VehicleIcon = ({ type, size, active }: { type: VehicleType; size?: number; active?: boolean }) => {
    return <PremiumVehicleArt type={type} size={size} active={active} />;
};

// ─── Back Arrow SVG ──────────────────────────────────────────────────────────
const IconBack = () => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#A5B4FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const IconMinus = () => (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path d="M5 12H19" stroke={C.text} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
);

const IconPlus = () => (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path d="M12 5V19M5 12H19" stroke={C.text} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
);

const IconPerson = () => (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="7" r="4" fill={C.teal} />
        <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill={C.teal} />
    </Svg>
);

const IconCheck = () => (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
        <Path d="M5 13L9 17L19 7" stroke={C.white} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function VehicleConfirmScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const {
        destination,
        pickupPoint,
        vehicleType,
        passengerCount,
        setVehicleType,
        setPassengerCount,
    } = useRideStore();

    const rider = route.params?.rider;
    const chatId = route.params?.chatId;
    const partnerName = rider?.name ?? 'Your ride partner';

    const [selected, setSelected] = useState<VehicleType>(vehicleType ?? 'rickshaw');
    const [pCount, setPCount] = useState<number>(passengerCount ?? 2);
    const [loading, setLoading] = useState(false);

    const maxPassengers = VEHICLE_CONFIG[selected].maxPassengers;
    const baseFare = getFare(pickupPoint ?? 'main_gate', destination ?? 'kuril');

    const getTotalFare = (v: VehicleType) => Math.round(baseFare * VEHICLE_CONFIG[v].fareMultiplier);
    const getSplit = (v: VehicleType, count: number) => Math.ceil(getTotalFare(v) / Math.max(1, count));

    const handleSelectVehicle = (v: VehicleType) => {
        setSelected(v);
        const max = VEHICLE_CONFIG[v].maxPassengers;
        if (pCount > max) setPCount(max);
    };

    const adjustCount = (delta: number) => {
        const next = Math.min(Math.max(1, pCount + delta), maxPassengers);
        setPCount(next);
    };

    const handleConfirm = async () => {
        if (!user || !rider) return;
        setLoading(true);
        try {
            setVehicleType(selected);
            setPassengerCount(pCount);
            const fare = getTotalFare(selected);
            const splitFare = getSplit(selected, pCount);

            const rideId = await rideService.createRide(
                user.uid, user.name ?? 'Rider',
                rider.userId, rider.name,
                destination ?? '',
                pickupPoint ?? 'main_gate',
                fare,
            );

            navigation.replace('RideConfirmed', {
                rideId,
                rider,
                chatId,
                fare,
                splitFare,
                passengerCount: pCount,
                vehicleType: selected,
            });
        } catch {
            Alert.alert('Error', 'Could not confirm ride. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const totalFare = getTotalFare(selected);
    const splitFare = getSplit(selected, pCount);

    return (
        <View style={[s.root, { paddingTop: insets.top }]}>

            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <IconBack />
                    <Text style={s.backLabel}>Back</Text>
                </TouchableOpacity>
                <Text style={s.headerTitle}>Confirm Ride</Text>
                <View style={{ width: 64 }} />
            </View>

            <ScrollView
                style={s.scroll}
                contentContainerStyle={s.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Route summary card */}
                <View style={s.routeCard}>
                    <View style={s.routeRow}>
                        <View style={s.dotPickup} />
                        <View style={s.routeInfo}>
                            <Text style={s.routeLabel}>FROM</Text>
                            <Text style={s.routeValue} numberOfLines={1}>
                                {pickupPoint ?? 'Pickup point'}
                            </Text>
                        </View>
                    </View>
                    <View style={s.routeDashes}>
                        {[0, 1, 2].map(i => <View key={i} style={s.dash} />)}
                    </View>
                    <View style={s.routeRow}>
                        <View style={s.dotDest} />
                        <View style={s.routeInfo}>
                            <Text style={s.routeLabel}>TO</Text>
                            <Text style={s.routeValue} numberOfLines={1}>
                                {destination ?? 'Destination'}
                            </Text>
                        </View>
                    </View>
                    <View style={s.partnerRow}>
                        <View style={s.partnerAvatar}>
                            <Text style={s.partnerAvatarText}>
                                {partnerName.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <Text style={s.partnerLabel}>with <Text style={s.partnerName}>{partnerName}</Text></Text>
                    </View>
                </View>

                {/* Vehicle selection */}
                <Text style={s.sectionTitle}>Choose Vehicle</Text>
                {(Object.keys(VEHICLE_CONFIG) as VehicleType[]).map((v) => {
                    const isActive = selected === v;
                    const cfg = VEHICLE_CONFIG[v];
                    return (
                        <TouchableOpacity
                            key={v}
                            style={[s.vehicleCard, isActive && s.vehicleCardActive]}
                            onPress={() => handleSelectVehicle(v)}
                            activeOpacity={0.8}
                        >
                            <VehicleIcon type={v} size={52} active={isActive} />
                            <View style={s.vehicleMeta}>
                                <View style={s.vehicleNameRow}>
                                    <Text style={[s.vehicleName, isActive && s.vehicleNameActive]}>
                                        {cfg.label}
                                    </Text>
                                    {cfg.maxPassengers === 1 && (
                                        <View style={s.soloChip}>
                                            <Text style={s.soloChipText}>SOLO ONLY</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={s.vehicleDesc}>{cfg.description}</Text>
                                <View style={s.vehiclePassRow}>
                                    <IconPerson />
                                    <Text style={s.vehiclePassText}>
                                        Max {cfg.maxPassengers} {cfg.maxPassengers === 1 ? 'rider' : 'riders'}
                                    </Text>
                                </View>
                            </View>
                            <View style={s.vehicleFareCol}>
                                <Text style={[s.vehicleFareAmount, isActive && s.vehicleFareActive]}>
                                    ৳{Math.round(baseFare * cfg.fareMultiplier)}
                                </Text>
                                <Text style={s.vehicleFareLabel}>total</Text>
                                {isActive && (
                                    <View style={s.checkCircle}>
                                        <IconCheck />
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                })}

                {/* Passenger count stepper */}
                <Text style={s.sectionTitle}>How many riders?</Text>
                <View style={s.passengerCard}>
                    <View style={s.passengerLeft}>
                        <View style={s.passengerIconRow}>
                            {Array.from({ length: maxPassengers }).map((_, i) => (
                                <View
                                    key={i}
                                    style={[s.personDot, i < pCount && s.personDotActive]}
                                />
                            ))}
                        </View>
                        <Text style={s.passengerCountLabel}>
                            <Text style={s.passengerCountNum}>{pCount}</Text>
                            {' '}of {maxPassengers} seats
                        </Text>
                        <Text style={s.passengerNote}>
                            {pCount === 1 ? 'Solo ride — full fare applies' : `Split equally among ${pCount} riders`}
                        </Text>
                    </View>
                    <View style={s.stepperRow}>
                        <TouchableOpacity
                            style={[s.stepBtn, pCount <= 1 && s.stepBtnDisabled]}
                            onPress={() => adjustCount(-1)}
                            disabled={pCount <= 1}
                            activeOpacity={0.75}
                        >
                            <IconMinus />
                        </TouchableOpacity>
                        <Text style={s.stepCount}>{pCount}</Text>
                        <TouchableOpacity
                            style={[s.stepBtn, pCount >= maxPassengers && s.stepBtnDisabled]}
                            onPress={() => adjustCount(1)}
                            disabled={pCount >= maxPassengers}
                            activeOpacity={0.75}
                        >
                            <IconPlus />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Fare breakdown */}
                <View style={s.fareCard}>
                    <View style={s.fareRow}>
                        <Text style={s.fareKey}>Vehicle</Text>
                        <Text style={s.fareVal}>{VEHICLE_CONFIG[selected].label}</Text>
                    </View>
                    <View style={s.fareRow}>
                        <Text style={s.fareKey}>Total fare</Text>
                        <Text style={s.fareVal}>৳{totalFare}</Text>
                    </View>
                    <View style={s.fareRow}>
                        <Text style={s.fareKey}>Riders sharing</Text>
                        <Text style={s.fareVal}>{pCount}</Text>
                    </View>
                    <View style={s.fareDivider} />
                    <View style={s.fareRow}>
                        <Text style={s.fareKeyBold}>You pay</Text>
                        <Text style={s.fareSplit}>৳{splitFare} each</Text>
                    </View>
                </View>

                <Text style={s.disclaimer}>
                    Actual fare may vary. Confirm with the driver on arrival.
                </Text>
            </ScrollView>

            {/* Confirm button */}
            <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
                <TouchableOpacity
                    style={[s.confirmBtn, loading && s.confirmBtnDisabled]}
                    onPress={handleConfirm}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading ? (
                        <ActivityIndicator color={C.white} />
                    ) : (
                        <>
                            <VehicleIcon type={selected} size={24} active />
                            <Text style={s.confirmText}>
                                Confirm · ৳{splitFare} each
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 4 },
    backLabel: { fontSize: 13, fontWeight: '600', color: '#A5B4FC' },
    headerTitle: { fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: -0.3 },

    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 24 },

    // Route card
    routeCard: {
        backgroundColor: C.surface,
        borderWidth: 1, borderColor: C.border,
        borderRadius: 20, padding: 16, marginBottom: 20,
    },
    routeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dotPickup: {
        width: 12, height: 12, borderRadius: 6,
        borderWidth: 2, borderColor: C.primary, backgroundColor: 'transparent',
    },
    dotDest: {
        width: 12, height: 12, borderRadius: 6,
        borderWidth: 2, borderColor: C.teal, backgroundColor: 'transparent',
    },
    routeInfo: { flex: 1 },
    routeLabel: { fontSize: 9, fontWeight: '700', color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
    routeValue: { fontSize: 14, fontWeight: '600', color: C.text },
    routeDashes: { flexDirection: 'column', alignItems: 'center', marginLeft: 5, marginVertical: 4, gap: 3 },
    dash: { width: 1.5, height: 5, borderRadius: 1, backgroundColor: C.border },
    partnerRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border,
    },
    partnerAvatar: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: 'rgba(99,102,241,0.2)',
        alignItems: 'center', justifyContent: 'center',
    },
    partnerAvatarText: { fontSize: 13, fontWeight: '800', color: '#A5B4FC' },
    partnerLabel: { fontSize: 13, color: C.textSub, fontWeight: '500' },
    partnerName: { color: C.text, fontWeight: '700' },

    // Vehicle cards
    sectionTitle: {
        fontSize: 11, fontWeight: '800', color: C.textMuted,
        letterSpacing: 1.2, textTransform: 'uppercase',
        marginBottom: 10, marginTop: 4,
    },
    vehicleCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
        borderRadius: 22, padding: 14, marginBottom: 10,
    },
    vehicleCardActive: {
        borderColor: C.borderActive,
        backgroundColor: 'rgba(99,102,241,0.08)',
    },
    vehicleMeta: { flex: 1 },
    vehicleNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    vehicleName: { fontSize: 15, fontWeight: '700', color: C.textSub },
    vehicleNameActive: { color: C.text },
    vehicleDesc: { fontSize: 11, color: C.textMuted, marginBottom: 4 },
    vehiclePassRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    vehiclePassText: { fontSize: 11, color: C.textSub },
    soloChip: {
        backgroundColor: 'rgba(20,184,166,0.12)',
        borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1,
        borderWidth: 1, borderColor: 'rgba(20,184,166,0.25)',
    },
    soloChipText: { fontSize: 8, fontWeight: '800', color: C.teal, letterSpacing: 0.5 },
    vehicleFareCol: { alignItems: 'flex-end', gap: 2 },
    vehicleFareAmount: { fontSize: 18, fontWeight: '800', color: C.textSub },
    vehicleFareActive: { color: C.text },
    vehicleFareLabel: { fontSize: 10, color: C.textMuted, fontWeight: '600' },
    checkCircle: {
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
        marginTop: 4,
    },

    // Passenger count
    passengerCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
        borderRadius: 22, padding: 16, marginBottom: 20,
    },
    passengerLeft: { flex: 1, gap: 4 },
    passengerIconRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
    personDot: {
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: C.textMuted, opacity: 0.35,
    },
    personDotActive: { backgroundColor: C.teal, opacity: 1 },
    passengerCountLabel: { fontSize: 12, color: C.textSub },
    passengerCountNum: { fontSize: 14, fontWeight: '800', color: C.text },
    passengerNote: { fontSize: 11, color: C.textMuted },
    stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: C.surfaceStrong,
        borderWidth: 1, borderColor: C.border,
        alignItems: 'center', justifyContent: 'center',
    },
    stepBtnDisabled: { opacity: 0.35 },
    stepCount: { fontSize: 22, fontWeight: '800', color: C.text, minWidth: 28, textAlign: 'center' },

    // Fare breakdown
    fareCard: {
        backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
        borderRadius: 20, padding: 16, marginBottom: 12, gap: 8,
    },
    fareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    fareKey: { fontSize: 13, color: C.textSub },
    fareVal: { fontSize: 13, fontWeight: '600', color: C.text },
    fareDivider: { height: 1, backgroundColor: C.border, marginVertical: 4 },
    fareKeyBold: { fontSize: 14, fontWeight: '700', color: C.text },
    fareSplit: { fontSize: 18, fontWeight: '800', color: C.teal },

    disclaimer: { fontSize: 11, color: C.textMuted, textAlign: 'center', marginBottom: 8, lineHeight: 16 },

    // Footer / confirm
    footer: {
        paddingHorizontal: 16, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: C.border,
        backgroundColor: C.bg,
    },
    confirmBtn: {
        height: 56, borderRadius: 20,
        backgroundColor: C.primary,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 16,
        elevation: 8,
    },
    confirmBtnDisabled: { opacity: 0.65 },
    confirmText: { fontSize: 16, fontWeight: '800', color: C.white, letterSpacing: -0.3 },
});
