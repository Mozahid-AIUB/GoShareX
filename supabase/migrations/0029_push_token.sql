-- ============================================================
-- Push token storage — user-কে notification পাঠাতে তার device-এর push
-- "ঠিকানা" (Expo push token) দরকার। সেটা users টেবিলে রাখি।
--
-- নিরাপত্তা: token শুধু নিজের row-তে লেখা যায় (C1 RLS policy "users: write
-- own" আগে থেকেই আছে — auth.uid() = id)। অন্য কেউ পড়তে/বদলাতে পারে না।
-- guard trigger (0026) protected column list-এ push_token নেই → client
-- নিজের token নিজে লিখতে পারবে (এটা ব্যক্তিগত, server-only নয়)।
-- idempotent।
-- ============================================================

alter table public.users
  add column if not exists push_token            text,
  add column if not exists push_token_updated_at timestamptz;
