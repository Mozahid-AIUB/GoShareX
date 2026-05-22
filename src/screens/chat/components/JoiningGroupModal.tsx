/**
 * JoiningGroupModal — Spinning loader shown while joining/creating an anonymous group.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle } from 'react-native-svg';
import { premiumTheme } from '@/design/premium';

import { IconGroup, IconLock, IconTrash } from './ChatListIcons';

const C = {
  text: premiumTheme.text,
  textSub: premiumTheme.textMuted,
};

type Props = {
  visible: boolean;
  isCreating: boolean;
};

export const JoiningGroupModal = ({ visible, isCreating }: Props) => {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1200, useNativeDriver: true }),
    ).start();
    return () => spin.setValue(0);
  }, [visible, spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={jm.overlay}>
        <View style={jm.card}>
          <Animated.View style={[jm.ring, { transform: [{ rotate }] }]}>
            <Svg width={64} height={64} viewBox="0 0 64 64">
              <Circle cx="32" cy="32" r="28" stroke="rgba(20,184,166,0.2)" strokeWidth="6" fill="none" />
              <Circle
                cx="32"
                cy="32"
                r="28"
                stroke="#14B8A6"
                strokeWidth="6"
                fill="none"
                strokeDasharray="44 132"
                strokeLinecap="round"
                transform="rotate(-90 32 32)"
              />
            </Svg>
          </Animated.View>
          <View style={jm.iconWrap}>
            <IconGroup />
          </View>
          <Text style={jm.title}>{isCreating ? 'Creating room...' : 'Joining room...'}</Text>
          <Text style={jm.sub}>
            {isCreating ? 'Setting up your anonymous group' : 'Connecting you anonymously'}
          </Text>
          <View style={jm.chipsRow}>
            <View style={jm.chip}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <IconGroup />
                <Text style={jm.chipText}>Anonymous</Text>
              </View>
            </View>
            <View style={jm.chip}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <IconLock size={10} />
                <Text style={jm.chipText}>Private</Text>
              </View>
            </View>
            <View style={jm.chip}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <IconTrash size={10} />
                <Text style={jm.chipText}>Auto-deleted</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const jm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '82%',
    backgroundColor: '#0E1220',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.3)',
  },
  ring: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(20,184,166,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '900', color: C.text, marginBottom: 6 },
  sub: { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  chipsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipText: { fontSize: 11, color: C.textSub, fontWeight: '600' },
});
