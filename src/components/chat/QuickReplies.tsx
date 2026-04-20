import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppText from '../common/AppText';

interface QuickReply {
  id: string;
  label: string;
  icon: string;
}

const QUICK_REPLIES: QuickReply[] = [
  { id: 'coming', label: 'আসছি', icon: 'run-fast' },
  { id: 'location', label: 'Location Share', icon: 'map-marker-radius' },
  { id: 'deal', label: 'Deal হলো', icon: 'handshake' },
  { id: 'wait', label: 'একটু অপেক্ষা করো', icon: 'clock-outline' },
  { id: 'cancel', label: 'Cancel', icon: 'close-circle-outline' },
];

interface QuickRepliesProps {
  onSelect: (replyId: string, label: string) => void;
  disabled: boolean;
}

const QuickReplies: React.FC<QuickRepliesProps> = ({ onSelect, disabled }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {QUICK_REPLIES.map((reply) => {
        const isCancelItem = reply.id === 'cancel';
        return (
          <TouchableOpacity
            key={reply.id}
            style={[
              styles.chip,
              isCancelItem && styles.chipCancel,
              disabled && styles.chipDisabled,
            ]}
            onPress={() => !disabled && onSelect(reply.id, reply.label)}
            activeOpacity={disabled ? 1 : 0.7}
          >
            <MaterialCommunityIcons
              name={reply.icon}
              size={16}
              color={
                disabled
                  ? '#9CA3AF'
                  : isCancelItem
                  ? '#E53935'
                  : '#1A73E8'
              }
            />
            <AppText
              variant="caption"
              bold
              style={[
                styles.chipLabel,
                isCancelItem && !disabled && styles.chipLabelCancel,
                disabled && styles.chipLabelDisabled,
              ]}
            >
              {reply.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#EEF4FD',
    borderWidth: 1.5,
    borderColor: '#1A73E8',
  },
  chipCancel: {
    backgroundColor: '#FFF0F0',
    borderColor: '#E53935',
  },
  chipDisabled: {
    backgroundColor: '#F5F7FA',
    borderColor: '#E8ECF0',
  },
  chipLabel: {
    color: '#1A73E8',
    fontSize: 12,
    lineHeight: undefined,
  },
  chipLabelCancel: {
    color: '#E53935',
  },
  chipLabelDisabled: {
    color: '#9CA3AF',
  },
});

export default QuickReplies;
