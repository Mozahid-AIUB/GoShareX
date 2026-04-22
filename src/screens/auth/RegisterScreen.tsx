import { RootNavProp } from '@/navigation/types';
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
import { useAuthStore } from '@/store';

const RegisterScreen = () => {
  const navigation = useNavigation<RootNavProp>();
  const { setUser } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = (): string | null => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!name.trim()) return 'Name is required';
    if (!isValidAIUBEmail(normalizedEmail)) return 'Use your @student.aiub.edu email';
    if (!isValidStudentId(studentId.trim())) return 'Student ID format: 12-34567-1';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleRegister = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const error = validate();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    setLoading(true);
    try {
      const newUser = await authService.register({
        name: name.trim(),
        email: normalizedEmail,
        studentId: studentId.trim(),
        password,
      });

      setUser(newUser);
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
          <HelperText type="info">Use your @student.aiub.edu email</HelperText>

          <TextInput
            label="Student ID (e.g. 12-34567-1)"
            value={studentId}
            onChangeText={setStudentId}
            mode="outlined"
            style={styles.input}
          />

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
  registerButton: { marginTop: 16, marginBottom: 10 },
});

export default RegisterScreen;
