-- ============================================================
-- Fix: suspension_reason column missing
--
-- 0026_trust_rpcs_and_guard.sql-এ guard_user_protected_cols() trigger
-- এবং record_my_cancellation()/clear_expired_suspension() function
-- users.suspension_reason column reference করে, কিন্তু কোনো migration-এ
-- এই column আসলে ADD COLUMN দিয়ে তৈরি করা হয়নি — শুধু ব্যবহার হয়েছে।
--
-- ফলে public.users-এ যেকোনো UPDATE (এমনকি অন্য column-এর জন্যও) trigger
-- fire করলে guard_user_protected_cols()-এ "record 'new' has no field
-- 'suspension_reason'" error দিত, কারণ NEW/OLD row-এ সেই field-ই নেই।
-- ============================================================

alter table public.users
  add column if not exists suspension_reason text;
