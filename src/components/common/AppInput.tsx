import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
  StyleProp,
  Platform,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppText from './AppText';

const COLORS = {
  primary: '#1A73E8',
  error: '#E53935',
  border: '#E0E0E0',
  borderFocused: '#1A73E8',
  text: '#212121',
  textSecondary: '#757575',
  placeholder: '#9E9E9E',
  surface: '#FFFFFF',
  inputBg: '#FAFAFA',
  disabled: '#F5F5F5',
  disabledText: '#BDBDBD',
};

type KeyboardTypeOptions = TextInputProps['keyboardType'];

interface AppInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  leftIcon?: string;
  keyboardType?: KeyboardTypeOptions;
  editable?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  maxLength?: number;
  multiline?: boolean;
  numberOfLines?: number;
  onBlur?: () => void;
  onFocus?: () => void;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
}

const AppInput: React.FC<AppInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  leftIcon,
  keyboardType = 'default',
  editable = true,
  autoCapitalize = 'none',
  autoCorrect = false,
  maxLength,
  multiline = false,
  numberOfLines = 1,
  onBlur,
  onFocus,
  returnKeyType,
  onSubmitEditing,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecureVisible, setIsSecureVisible] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
    onBlur?.();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? COLORS.error : COLORS.border,
      error ? COLORS.error : COLORS.borderFocused,
    ],
  });

  const iconColor = error
    ? COLORS.error
    : isFocused
    ? COLORS.primary
    : COLORS.textSecondary;

  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText variant="body2" style={styles.label} bold>
          {label}
        </AppText>
      ) : null}

      <Animated.View
        style={[
          styles.inputContainer,
          { borderColor },
          !editable && styles.disabledContainer,
        ]}
      >
        {leftIcon ? (
          <Icon
            name={leftIcon}
            size={20}
            color={iconColor}
            style={styles.leftIcon}
          />
        ) : null}

        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : undefined,
            secureTextEntry ? styles.inputWithRightIcon : undefined,
            multiline && styles.multilineInput,
            !editable && styles.disabledInput,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholder}
          secureTextEntry={secureTextEntry && !isSecureVisible}
          keyboardType={keyboardType}
          editable={editable}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : undefined}
          onFocus={handleFocus}
          onBlur={handleBlur}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          selectionColor={COLORS.primary}
          underlineColorAndroid="transparent"
        />

        {secureTextEntry ? (
          <TouchableOpacity
            onPress={() => setIsSecureVisible(prev => !prev)}
            style={styles.rightIconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon
              name={isSecureVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
      </Animated.View>

      {error ? (
        <View style={styles.errorRow}>
          <Icon
            name="alert-circle-outline"
            size={13}
            color={COLORS.error}
            style={styles.errorIcon}
          />
          <AppText variant="caption" color={COLORS.error}>
            {error}
          </AppText>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 4,
  },
  label: {
    color: '#424242',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  disabledContainer: {
    backgroundColor: COLORS.disabled,
  },
  leftIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    paddingHorizontal: 0,
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 8,
  },
  multilineInput: {
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  disabledInput: {
    color: COLORS.disabledText,
  },
  rightIconButton: {
    padding: 4,
    marginLeft: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  errorIcon: {
    marginRight: 4,
  },
});

export default AppInput;
