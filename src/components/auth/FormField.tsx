import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { C } from './authColors';
import { IconEye } from './AuthIcons';

interface Props {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  icon: React.ReactNode;
  secure?: boolean;
  onToggleSecure?: () => void;
  keyboardType?: any;
  autoCapitalize?: any;
  placeholder?: string;
  error?: string;
}

export default function FormField({
  label, value, onChangeText, icon, secure, onToggleSecure,
  keyboardType, autoCapitalize, placeholder, error,
}: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <View style={[f.row, focused && f.rowFocused, !!error && f.rowError]}>
        <View style={f.iconWrap}>{icon}</View>
        <TextInput
          style={f.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
          placeholderTextColor={C.textMuted}
          secureTextEntry={secure}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={autoCapitalize ?? 'none'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {onToggleSecure && (
          <TouchableOpacity style={f.eyeBtn} onPress={onToggleSecure} activeOpacity={0.7}>
            <IconEye off={secure} />
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={f.errorText}>{error}</Text>}
    </View>
  );
}

const f = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: C.textSub, letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9F7FF', borderRadius: 16,
    borderWidth: 1, borderColor: C.border, height: 52,
  },
  rowFocused: { borderColor: C.borderFocus, backgroundColor: 'rgba(124,58,237,0.05)' },
  rowError: { borderColor: C.error, backgroundColor: '#FEF2F2' },
  iconWrap: { paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 15, color: C.text, paddingRight: 12 },
  eyeBtn: { paddingHorizontal: 14, height: '100%', alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 11, color: C.error, marginTop: 4, marginLeft: 4 },
});
