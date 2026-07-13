-- ============================================================
-- Google Sign-In profile photo — handle_new_user trigger এখনো
-- photo_url insert করত না, তাই Google দিয়ে login করলেও app-এ সবসময়
-- initial (blank) avatar দেখাত।
--
-- Google OAuth provider raw_user_meta_data-এ ছবির URL সাধারণত
-- 'avatar_url' key-তে দেয় (Supabase normalize করে), মাঝেমধ্যে raw
-- 'picture' key-ও থাকে (Google-এর নিজস্ব response field) — দুটোই
-- coalesce করে নেওয়া হলো, যেটা পাওয়া যায়।
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, student_id, department, phone_number, photo_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'student_id', ''),
    coalesce(new.raw_user_meta_data->>'department', ''),
    coalesce(new.raw_user_meta_data->>'phone_number', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- পুরনো user যাদের row আগেই তৈরি হয়ে গেছে (এই fix-এর আগে) কিন্তু
-- photo_url এখনো ফাঁকা — তাদের জন্য auth.users-এর মেটাডেটা থেকে
-- একবার backfill করে দিই।
update public.users u
set photo_url = coalesce(a.raw_user_meta_data->>'avatar_url', a.raw_user_meta_data->>'picture')
from auth.users a
where u.id = a.id
  and (u.photo_url is null or u.photo_url = '')
  and (a.raw_user_meta_data->>'avatar_url' is not null or a.raw_user_meta_data->>'picture' is not null);
