-- ============================================================
-- 0032_push_hook_secret — send-push Edge Function-কে secret দিয়ে রক্ষা (M1/audit)
--
-- সমস্যা: send-push function যে কেউ POST করলেই push পাঠাত (auth check ছিল না)
-- → attacker যেকোনো user-কে ভুয়া/spam push পাঠাতে পারত (phishing ঝুঁকি)।
--
-- সমাধান: send_push_to() এখন 'x-push-secret' header-এ একটা shared secret পাঠায়।
-- function সেই secret মিলিয়ে তবেই কাজ করে (না মিললে 401)। বাইরের কেউ secret
-- জানে না → block।
--
-- ⚙️ সেটআপ (দুই জায়গায় একই মান বসাতে হবে — তুমি একটা random string বাছো):
--   1) Supabase Dashboard → Project Settings → Edge Functions → Secrets:
--        PUSH_HOOK_SECRET = <তোমার-random-string>
--   2) Supabase Dashboard → Database → নিচের ALTER DATABASE চালাও (একবার):
--        alter database postgres set app.settings.push_hook_secret = '<একই-string>';
--      (অথবা SQL Editor-এ এই migration চালানোর আগে নিচের লাইনে বসিয়ে নাও)
--
-- secret সেট না থাকলে function পুরনো মতোই চলে (deploy ভাঙে না), কিন্তু
-- production-এ অবশ্যই দুটোই সেট করো।
-- ============================================================

create or replace function public.send_push_to(
  p_to_user uuid,
  p_title   text,
  p_body    text,
  p_data    jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  fn_url text := 'https://bzaurdogjufztmcnnxes.supabase.co/functions/v1/send-push';
  v_secret text;
begin
  if p_to_user is null then return; end if;

  -- DB-তে সেট করা secret পড়ি (না থাকলে খালি — function তখন guard skip করবে)।
  v_secret := current_setting('app.settings.push_hook_secret', true);

  perform net.http_post(
    url     := fn_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-push-secret', coalesce(v_secret, '')
    ),
    body    := jsonb_build_object(
      'to_user_id', p_to_user,
      'title',      p_title,
      'body',       p_body,
      'data',       p_data
    )
  );
end;
$$;
