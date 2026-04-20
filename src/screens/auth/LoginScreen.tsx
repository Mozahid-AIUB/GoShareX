import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { RootNavProp } from '@/navigation/types';
import authService from '@/services/firebase/authService';
import { isValidAIUBEmail } from '@/utils/validators';

const LoginScreen = () => {
  const navigation = useNavigation<RootNavProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (!isValidAIUBEmail(email)) {
      Alert.alert('Error', 'শুধু AIUB email দিয়ে login করা যাবে');
      return;
    }
    setLoading(true);
    try {
      await authService.login({ email, password });
      navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <Text style={styles.logo}>🛺</Text>
        <Text style={styles.title}>RideShare AIUB</Text>
        <Text style={styles.subtitle}>AIUB Students Only</Text>

        <View style={styles.form}>
          <TextInput
            label="AIUB Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            mode="outlined"
            style={styles.input}
          />
          <HelperText type="info">Use your @aiub.edu.bd email</HelperText>

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

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.loginButton}
          >
            Login with AIUB Account
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('Register' as any)}
            disabled={loading}
          >
            Don't have an account? Register
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  logo: { fontSize: 60, textAlign: 'center', marginBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#1A73E8' },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#666', marginBottom: 40 },
  form: { width: '100%' },
  input: { marginBottom: 10 },
  loginButton: { marginTop: 20, marginBottom: 10 },
});

export default LoginScreen;