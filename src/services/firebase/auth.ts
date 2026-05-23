import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './config';
import { isValidEmail } from '@/utils/validators';

export async function registerUser(email: string, password: string): Promise<User> {
  if (!isValidEmail(email)) throw new Error('Please enter a valid email address');
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  return user;
}

export async function loginUser(email: string, password: string): Promise<User> {
  if (!isValidEmail(email)) throw new Error('Please enter a valid email address');
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
