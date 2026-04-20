import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './config';
import { isAIUBEmail } from '@/utils/validators';

export async function registerUser(email: string, password: string): Promise<User> {
  if (!isAIUBEmail(email)) throw new Error('শুধু AIUB email দিয়ে register করা যাবে');
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  return user;
}

export async function loginUser(email: string, password: string): Promise<User> {
  if (!isAIUBEmail(email)) throw new Error('শুধু AIUB email দিয়ে login করা যাবে');
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
