/**
 * GroupRoomsModal — Bottom sheet to join/create anonymous group rooms.
 */

import React from 'react';
import { FlatList, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { premiumTheme } from '@/design/premium';

import { IconClose, IconPlus, IconUsers } from './ChatListIcons';
import { minutesLeft, type GroupRoom } from '../utils/chatHelpers';

const C = {
  text: premiumTheme.text,
  textSub: premiumTheme.textMuted,
  teal: premiumTheme.teal,
  white: '#FFFFFF',
};

type Props = {
  visible: boolean;
  rooms: GroupRoom[];
  onJoin: (id: string) => void;
  onCreate: () => void;
  onClose: () => void;
  joining: boolean;
};

export const GroupRoomsModal = ({ visible, rooms, onJoin, onCreate, onClose, joining }: Props) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={g.overlay}>
      <View style={g.sheet}>
        <View style={g.handle} />
        <View style={g.header}>
          <View>
            <Text style={g.title}>Anonymous Groups</Text>
            <Text style={g.sub}>
              {rooms.length > 0
                ? `${rooms.length} active room${rooms.length > 1 ? 's' : ''} available`
                : 'No rooms right now'}
            </Text>
          </View>
          <TouchableOpacity style={g.closeBtn} onPress={onClose}>
            <IconClose />
          </TouchableOpacity>
        </View>

        {rooms.length > 0 ? (
          <FlatList
            data={rooms}
            keyExtractor={(r) => r.id}
            style={{ maxHeight: 280 }}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
            renderItem={({ item }) => {
              const mins = minutesLeft(item.expiresAt);
              return (
                <TouchableOpacity
                  style={g.roomCard}
                  onPress={() => onJoin(item.id)}
                  disabled={joining}
                  activeOpacity={0.82}
                >
                  <View style={g.roomAvatar}>
                    <IconUsers />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={g.roomName}>Anonymous Group</Text>
                    <Text style={g.roomMeta}>
                      {item.participants.length} member{item.participants.length !== 1 ? 's' : ''} ·{' '}
                      {mins}m left
                    </Text>
                  </View>
                  <View style={g.joinBtn}>
                    <Text style={g.joinBtnText}>Join</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        ) : (
          <View style={g.emptyWrap}>
            <Text style={g.emptyText}>No groups available right now.</Text>
            <Text style={g.emptySubText}>Be the first — create a new room!</Text>
          </View>
        )}

        <TouchableOpacity
          style={[g.createBtn, joining && { opacity: 0.5 }]}
          onPress={onCreate}
          disabled={joining}
          activeOpacity={0.85}
        >
          <IconPlus />
          <Text style={g.createBtnText}>{joining ? 'Joining...' : 'Create New Group'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const g = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0E1220',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(124,111,247,0.2)',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '900', color: C.text },
  sub: { fontSize: 12, color: C.textSub, marginTop: 3 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(20,184,166,0.07)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.2)',
  },
  roomAvatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(20,184,166,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.3)',
  },
  roomName: { fontSize: 14, fontWeight: '800', color: C.text },
  roomMeta: { fontSize: 11, color: C.textSub, marginTop: 2 },
  joinBtn: { backgroundColor: C.teal, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  joinBtnText: { fontSize: 12, fontWeight: '800', color: C.white },

  emptyWrap: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  emptyText: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 6 },
  emptySubText: { fontSize: 12, color: C.textSub },

  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(20,184,166,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.35)',
  },
  createBtnText: { fontSize: 15, fontWeight: '800', color: '#5EEAD4' },
});
