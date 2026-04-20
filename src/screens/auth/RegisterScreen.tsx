import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import authService from '@/services/firebase/authService';
import { isValidAIUBEmail, isValidStudentId } from '@/utils/validators';

const DEPARTMENTS = ['CSE', 'EEE', 'BBA', 'LLB', 'Architecture', 'English', 'Other'];

const RegisterScreen = () => {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('CSE');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = (): string | null => {
    if (!name.trim()) return 'Name is required';
    if (!isValidAIUBEmail(email)) return 'Use your @aiub.edu.bd email';
    if (!isValidStudentId(studentId)) return 'Student ID format: 12-34567-1';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleRegister = async () => {
    const error = validate();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    setLoading(true);
    try {
      await authService.register({ name: name.trim(), email, studentId, department, password });
      navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>🛺 Create Account</Text>
          <Text style={styles.subtitle}>AIUB Students Only</Text>

          <TextInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            autoCapitalize="words"
          />

          <TextInput
            label="AIUB Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <HelperText type="info">Use your @aiub.edu.bd email</HelperText>

          <TextInput
            label="Student ID (e.g. 12-34567-1)"
            value={studentId}
            onChangeText={setStudentId}
            mode="outlined"
            style={styles.input}
          />

          <Text style={styles.label}>Department</Text>
          <View style={styles.deptRow}>
            {DEPARTMENTS.map((d) => (
              <Button
                key={d}
                mode={department === d ? 'contained' : 'outlined'}
                onPress={() => setDepartment(d)}
                style={styles.deptBtn}
                labelStyle={styles.deptLabel}
                compact
              >
                {d}
              </Button>
            ))}
          </View>

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            mode="outlined"
            style={styles.input}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            mode="outlined"
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.registerButton}
          >
            Create Account
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            Already have an account? Login
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', color: '#1A73E8', marginTop: 20 },
  subtitle: { fontSize: 13, textAlign: 'center', color: '#666', marginBottom: 24 },
  input: { marginBottom: 8 },
  label: { fontSize: 14, color: '#444', marginBottom: 8, marginTop: 4 },
  deptRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  deptBtn: { marginBottom: 4 },
  deptLabel: { fontSize: 11 },
  registerButton: { marginTop: 16, marginBottom: 10 },
});

export default RegisterScreen;