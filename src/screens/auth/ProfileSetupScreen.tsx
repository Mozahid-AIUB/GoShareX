import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import authService from '@/services/firebase/authService';
import { auth } from '@/config/firebase.config';
import { isValidStudentId } from '@/utils/validators';

const DEPARTMENTS = ['CSE', 'EEE', 'BBA', 'LLB', 'Architecture', 'English', 'Other'];

const ProfileSetupScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('CSE');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!isValidStudentId(studentId)) {
      Alert.alert('Error', 'Student ID format: 12-34567-1');
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert('Error', 'Not logged in');
      return;
    }

    setLoading(true);
    try {
      await authService.completeProfile(uid, {
        name: name.trim(),
        studentId,
        department,
      });
      navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
    } catch (err: any) {
      Alert.alert('Error', err.message);
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
          <Text style={styles.title}>👤 Setup Profile</Text>
          <Text style={styles.subtitle}>Complete your profile to continue</Text>

          <TextInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            autoCapitalize="words"
          />

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

          <Button
            mode="contained"
            onPress={handleSave}
            loading={loading}
            disabled={loading}
            style={styles.saveButton}
          >
            Save & Continue
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
  subtitle: { fontSize: 13, textAlign: 'center', color: '#666', marginBottom: 30 },
  input: { marginBottom: 12 },
  label: { fontSize: 14, color: '#444', marginBottom: 8, marginTop: 4 },
  deptRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 24 },
  deptBtn: { marginBottom: 4 },
  deptLabel: { fontSize: 11 },
  saveButton: { marginTop: 8 },
});

export default ProfileSetupScreen;