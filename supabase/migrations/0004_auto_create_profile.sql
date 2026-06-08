-- ============================================================
-- ধাপ ৪ ফিক্স: নতুন auth ইউজার এলে অটো users প্রোফাইল বানানো
--
-- সমস্যা ছিল: client signUp-এর পর সাথে সাথে users টেবিলে row বানাতে
-- গেলে RLS (code 42501) আটকে দিচ্ছিল — কারণ ওই মুহূর্তে session/
-- auth.uid() এখনো প্রস্তুত না।
--
-- সমাধান: database নিজেই trigger দিয়ে প্রোফাইল বানাবে (admin হিসেবে,
-- RLS বাইপাস করে)। এটাই Supabase-এর official recommended পদ্ধতি।
-- ============================================================

-- নতুন auth.users row তৈরি হলে এই function চলবে
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer            -- admin হিসেবে চলে, তাই RLS আটকাবে না
set search_path = public
as $$
begin
  insert into public.users (id, email, name, student_id, department, phone_number)
  values (
    new.id,
    new.email,
    -- signUp-এর সময় পাঠানো extra data (raw_user_meta_data) থেকে নাম ইত্যাদি
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'student_id', ''),
    coalesce(new.raw_user_meta_data->>'department', ''),
    coalesce(new.raw_user_meta_data->>'phone_number', '')
  )
  on conflict (id) do nothing;   -- row আগে থেকে থাকলে কিছু করবে না (নিরাপদ)
  return new;
end;
$$;

-- auth.users টেবিলে নতুন row যোগ হলেই উপরের function চালাও
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
