import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  Platform,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppText from './AppText';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ANIMATION_DURATION = 280;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  snapPoint?: number;
  scrollable?: boolean;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  children,
  title,
  snapPoint = SCREEN_HEIGHT * 0.5,
  scrollable = false,
}) => {
  const translateY = useRef(new Animated.Value(snapPoint)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, backdropOpacity]);

  const animateOut = useCallback(
    (callback?: () => void) => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: snapPoint,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => callback?.());
    },
    [translateY, backdropOpacity, snapPoint],
  );

  useEffect(() => {
    if (visible) {
      // Reset before animating in
      translateY.setValue(snapPoint);
      backdropOpacity.setValue(0);
      animateIn();
    }
  }, [visible, animateIn, snapPoint, translateY, backdropOpacity]);

  const handleClose = useCallback(() => {
    animateOut(onClose);
  }, [animateOut, onClose]);

  const ContentWrapper = scrollable ? ScrollView : View;
  const contentWrapperProps = scrollable
    ? { showsVerticalScrollIndicator: false, bounces: false }
    : {};

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          />
        </TouchableWithoutFeedback>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            { height: snapPoint, transform: [{ translateY }] },
          ]}
        >
          {/* Drag handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          {title ? (
            <View style={styles.header}>
              <AppText variant="h3" bold style={styles.titleText}>
                {title}
              </AppText>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="close" size={22} color="#757575" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Content */}
          <ContentWrapper
            style={styles.content}
            {...(contentWrapperProps as any)}
          >
            {children}
          </ContentWrapper>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  titleText: {
    flex: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
});

export default BottomSheet;
