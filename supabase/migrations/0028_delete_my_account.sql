-- ============================================================
-- Delete My Account (Play Store বাধ্যতামূলক — user নিজের account নিজে মুছবে)
--
-- নিরাপত্তা:
--   • security definer — auth schema (auth.users) মুছতে elevated দরকার।
--   • কিন্তু শুধু auth.uid() = caller-এর নিজের data মুছবে। কোনো parameter
--     নেয় না → user অন্য কারো id পাঠিয়ে অন্যের account মুছতে পারে না (IDOR-safe)।
--   • search_path pinned → function-hijack ঠেকায়।
--
-- যা মোছে: caller-এর সব ব্যক্তিগত data, তারপর users row, তারপর auth login।
-- on-delete-cascade টেবিল (active_riders, posts, notifications, ride_requests,
-- blocked_aliases) users row মুছলেই নিজে মুছে যায় — তবু স্পষ্টতার জন্য আগে
-- হাতে মুছি (cascade order নির্ভরতা এড়াতে)।
--
-- যা রাখি: reports (audit/compliance — Play Store-ও legal hold মানে) ও অন্যের
-- পাঠানো জিনিস যেখানে caller শুধু উল্লেখিত (যেমন অন্যের rating)। caller-এর
-- পরিচয় users row মুছে যাওয়ায় এমনিতেই আর প্রকাশ পায় না।
-- ============================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- caller protected-column guard bypass দরকার নেই (row পুরো মুছছি, update নয়)।

  -- 1) live presence
  delete from public.active_riders where user_id = uid;

  -- 2) caller-এর পাঠানো message (chat row পরে caller-হীন হলে cleanup cron সরাবে)
  delete from public.messages where sender_id = uid;

  -- 3) caller অংশ নেওয়া chat (participants array-তে uid থাকলে)
  delete from public.chats where uid = any (participants);

  -- 4) ride_requests — from/to দুদিকেই
  delete from public.ride_requests where from_user = uid or to_user = uid;

  -- 5) caller-এর rating (নিজের দেওয়া)। অন্যের দেওয়া rating (rated_id = uid)
  --    রাখি না — caller-এর পরিচয় users মুছলে এমনিতেই হারায়, কিন্তু পরিষ্কার
  --    করতে rater হিসেবে caller-এর rows মুছি।
  delete from public.ratings where rater_id = uid;

  -- 6) blocked_aliases (নিজের ব্লক করা)
  delete from public.blocked_aliases where blocker_id = uid;

  -- 7) notifications (নিজের)
  delete from public.notifications where to_user_id = uid;

  -- 8) posts (নিজের)
  delete from public.posts where author_id = uid;

  -- 9) rides — caller rider1/rider2 হিসেবে থাকা rides। পার্টনারের ইতিহাসও
  --    এতে মুছবে; ব্যক্তিগত data সরানোই অগ্রাধিকার (Play Store data-deletion)।
  delete from public.rides where rider1 = uid or rider2 = uid;

  -- 10) profile row (এতে যেসব টেবিলে on-delete-cascade আছে সেগুলোও পরিষ্কার হয়)
  delete from public.users where id = uid;

  -- 11) login credential — auth.users থেকে (পুরোপুরি অপসারণ)
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
