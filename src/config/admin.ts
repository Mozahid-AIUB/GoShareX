/**
 * Admin allow-list — শুধু এই email গুলো Admin Dashboard দেখতে পাবে।
 *
 * নিরাপত্তা নোট: এটা শুধু UI দেখানোর জন্য (Profile-এ entry দেখাবে কিনা)।
 * আসল data-সুরক্ষা server-এ — admin_stats() RPC নিজে is_admin() গার্ড করে,
 * তাই এই তালিকায় না থাকলেও কেউ data পাবে না। দুই জায়গায় email মিলিয়ে রাখো:
 * এখানে + supabase/migrations/0024_admin_stats.sql-এর is_admin()।
 */
export const ADMIN_EMAILS = [
  'mozahidislam343@gmail.com',
  'mozahidislam701@gmail.com',
] as const;

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase() as (typeof ADMIN_EMAILS)[number]);
}
