// ============================================================
// Supabase User Service — profile read/update
// Firebase userService-এর getUser/updateUser এর সমতুল্য (screen যা ডাকে)।
// ============================================================
import { supabase } from '@/config/supabase.config';
import type { User, UserBadge } from '@/types/auth.types';
import { logger } from '@/utils/logger';

function rowToUser(row: any): User {
  return {
    uid: row.id,
    email: row.email ?? '',
    name: row.name ?? '',
    studentId: row.student_id ?? '',
    department: row.department ?? '',
    phoneNumber: row.phone_number ?? '',
    photoURL: row.photo_url ?? undefined,
    rating: Number(row.rating ?? 5),
    totalRides: Number(row.total_rides ?? 0),
    totalSaved: Number(row.total_saved ?? 0),
    completionRate: Number(row.completion_rate ?? 100),
    badge: (row.badge ?? 'New Rider') as UserBadge,
    strikes: Number(row.strikes ?? 0),
    isSuspended: Boolean(row.is_suspended ?? false),
    suspendedUntil: row.suspended_until ? new Date(row.suspended_until).getTime() : undefined,
    trustScore: Number(row.trust_score ?? 100),
    ratingCount: Number(row.total_ratings ?? 0),
    createdAt: row.created_at ?? new Date().toISOString(),
    lastActive: row.last_active ? new Date(row.last_active).getTime() : undefined,
    profileStatus: 'live',
  };
}

export async function getSupabaseUser(uid: string): Promise<User | null> {
  const { data, error } = await supabase.from('users').select('*').eq('id', uid).single();
  if (error || !data) return null;
  return rowToUser(data);
}

// camelCase patch -> snake_case (শুধু ইউজার-পরিবর্তনযোগ্য ক্ষেত্র;
// rating/strikes/badge trigger দিয়ে সুরক্ষিত)
export async function updateSupabaseUser(
  uid: string,
  data: Partial<User>,
): Promise<User> {
  const row: Record<string, any> = { last_active: new Date().toISOString() };
  if (data.name !== undefined) row.name = data.name;
  if (data.studentId !== undefined) row.student_id = data.studentId;
  if (data.department !== undefined) row.department = data.department;
  if (data.phoneNumber !== undefined) row.phone_number = data.phoneNumber;
  if (data.photoURL !== undefined) row.photo_url = data.photoURL;

  const { error } = await supabase.from('users').update(row).eq('id', uid);
  if (error) {
    logger.error('supabaseUserService.update', error);
    throw new Error('Could not update profile.');
  }
  const updated = await getSupabaseUser(uid);
  if (!updated) throw new Error('Updated profile could not be loaded');
  return updated;
}
