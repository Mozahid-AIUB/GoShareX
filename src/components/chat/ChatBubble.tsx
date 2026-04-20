import React from 'react';
import { View, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Message } from '../../types';
import AppText from '../common/AppText';

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isOwn }) => {
  const isQuickReply = message.type === 'quick_reply';
  const isSystem = message.type === 'system';

  if (isSystem) {
    return (
      <View style={styles.systemRow}>
        <View style={styles.systemBubble}>
          <AppText variant="caption" style={styles.systemText}>
            {message.text}
          </AppText>
        </View>
      </View>
    );
  }

  if (isQuickReply) {
    return (
      <View style={[styles.row, isOwn ? styles.rowRight : styles.rowLeft]}>
        <View style={[styles.quickPill, isOwn ? styles.quickPillOwn : styles.quickPillTheir]}>
          <AppText
            variant="caption"
            bold
            style={[styles.quickText, isOwn ? { color: '#1A73E8' } : { color: '#43A047' }]}
          >
            {message.text}
          </AppText>
        </View>
        <AppText variant="caption" style={styles.timestamp}>
          {formatTime(message.timestamp)}
        </AppText>
      </View>
    );
  }

  return (
    <View style={[styles.row, isOwn ? styles.rowRight : styles.rowLeft]}>
      {isOwn ? (
        <View style={styles.ownGroup}>
          <LinearGradient
            colors={['#1A73E8', '#1557B0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.ownBubble]}
          >
            <AppText variant="body2" style={styles.ownText}>
              {message.text}
            </AppText>
          </LinearGradient>
          <View style={styles.metaRow}>
            <AppText variant="caption" style={styles.timestamp}>
              {formatTime(message.timestamp)}
            </AppText>
            <MaterialCommunityIcons
              name={message.read ? 'check-all' : 'check'}
              size={14}
              color={message.read ? '#43A047' : '#9CA3AF'}
              style={{ marginLeft: 3 }}
            />
          </View>
        </View>
      ) : (
        <View style={styles.theirGroup}>
          <View style={[styles.bubble, styles.theirBubble]}>
            <AppText variant="body2" style={styles.theirText}>
              {message.text}
            </AppText>
          </View>
          <AppText variant="caption" style={[styles.timestamp, { marginLeft: 4 }]}>
            {formatTime(message.timestamp)}
          </AppText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowLeft: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: 260,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  ownBubble: {
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  ownText: {
    color: '#FFFFFF',
  },
  theirText: {
    color: '#1A1A2E',
  },
  ownGroup: {
    alignItems: 'flex-end',
  },
  theirGroup: {
    alignItems: 'flex-start',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    marginRight: 2,
  },
  timestamp: {
    color: '#9CA3AF',
    fontSize: 10,
    lineHeight: 14,
  },
  quickPill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1.5,
  },
  quickPillOwn: {
    borderColor: '#1A73E8',
    backgroundColor: '#EEF4FD',
  },
  quickPillTheir: {
    borderColor: '#43A047',
    backgroundColor: '#F1F8F1',
  },
  quickText: {
    fontSize: 13,
    lineHeight: undefined,
  },
  systemRow: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 24,
  },
  systemBubble: {
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  systemText: {
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default ChatBubble;
