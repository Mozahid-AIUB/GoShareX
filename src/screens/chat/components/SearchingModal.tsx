/**
 * SearchingModal — 1v1 anonymous match search overlay with countdown.
 */

import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { premiumTheme } from '@/design/premium';

import { IconClose, IconGhost, IconGhostSm, IconLock, IconTrash } from './ChatListIcons';
import { CountdownRing } from './ChatIndicators';
import { SEARCH_TIMEOUT_MS } from '../utils/chatHelpers';

const C = {
  text: premiumTheme.text,
  textSub: premiumTheme.textMuted,
};

type Props = {
  visible: boolean;
  remaining: number;
  onCancel: () => void;
};

export const SearchingModal = ({ visible, remaining, onCancel }: Props) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={m.overlay}>
      <View style={m.card}>
        <View style={m.ringWrap}>
          <CountdownRing remaining={remaining} total={SEARCH_TIMEOUT_MS / 1000} />
          <View style={m.ringCenter}>
            <Text style={m.ringNum}>{remaining}</Text>
            <Text style={m.ringLabel}>sec</Text>
          </View>
        </View>

        <View style={m.ghostWrap}>
          <IconGhost />
        </View>
        <Text style={m.title}>Finding a match...</Text>
        <Text style={m.sub}>
          Searching for an anonymous partner{'\n'}nearby. Identities stay hidden.
        </Text>

        <View style={m.chipsRow}>
          <View style={m.chip}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <IconLock size={10} />
              <Text style={m.chipText}>Private</Text>
            </View>
          </View>
          <View style={m.chip}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <IconGhostSm size={10} />
              <Text style={m.chipText}>Anonymous</Text>
            </View>
          </View>
          <View style={m.chip}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <IconTrash size={10} />
              <Text style={m.chipText}>Auto-deleted</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={m.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
          <IconClose />
          <Text style={m.cancelText}>Cancel Search</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  card: {
    width: '86%',
    backgroundColor: '#0E1220',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,111,247,0.3)',
  },
  ringWrap: { width: 130, height: 130, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringNum: { fontSize: 36, fontWeight: '900', color: C.text, lineHeight: 40 },
  ringLabel: { fontSize: 11, color: C.textSub, fontWeight: '600' },
  ghostWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(124,111,247,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '900', color: C.text, marginBottom: 6, letterSpacing: -0.3 },
  sub: { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 24,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipText: { fontSize: 11, color: C.textSub, fontWeight: '600' },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(244,63,94,0.1)',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.25)',
  },
  cancelText: { fontSize: 14, fontWeight: '800', color: '#F43F5E' },
});
