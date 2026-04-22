import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { RootNavProp } from '@/navigation/types';
import { useAuthStore } from '@/store/authStore';
import { updateUser } from '@/services/firebase/userService';
import { isValidName, isValidPhoneNumber, isValidStudentId } from '@/utils/validators';

export default function EditProfileScreen() {
  const navigation = useNavigation<RootNavProp>();
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(user?.name ?? '');
    setStudentId(user?.studentId ?? '');
    setDepartment(user?.department ?? '');
    setPhoneNumber(user?.phoneNumber ?? '');
  }, [user]);

  const validate = (): string | null => {
    if (!user?.uid) return 'You must be logged in to edit your profile';
    if (!isValidName(name)) return 'Please enter a valid full name';
    if (!isValidStudentId(studentId)) return 'Student ID format should be 12-34567-1';
    if (phoneNumber.trim() && !isValidPhoneNumber(phoneNumber)) return 'Phone number is not valid';
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      Alert.alert('Profile Update Failed', error);
      return;
    }

    if (!user?.uid) return;

    setLoading(true);
    try {
      const updatedUser = await updateUser(user.uid, {
        name: name.trim(),
        studentId: studentId.trim(),
        department: department.trim(),
        phoneNumber: phoneNumber.trim(),
      });

      setUser(updatedUser);
      Alert.alert('Profile Updated', 'Your profile has been saved successfully.');
      navigation.goBack();
    } catch (updateError: any) {
      Alert.alert('Profile Update Failed', updateError.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>Keep your rider profile accurate and up to date.</Text>

          <View style={styles.form}>
            <TextInput
              label="Full Name"
              mode="outlined"
              value={name}
              onChangeText={setName}
              style={styles.input}
              autoCapitalize="words"
            />
            <TextInput
              label="Student ID"
              mode="outlined"
              value={studentId}
              onChangeText={setStudentId}
              style={styles.input}
            />
            <TextInput
              label="Department"
              mode="outlined"
              value={department}
              onChangeText={setDepartment}
              style={styles.input}
            />
            <TextInput
              label="Phone Number"
              mode="outlined"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              style={styles.input}
              keyboardType="phone-pad"
            />
          </View>

          <Button mode="contained" onPress={handleSave} loading={loading} disabled={loading}>
            Save Profile
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  flex: { flex: 1 },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#202124' },
  subtitle: { fontSize: 14, color: '#5F6368' },
  form: { gap: 12 },
  input: { backgroundColor: '#FFFFFF' },
});
