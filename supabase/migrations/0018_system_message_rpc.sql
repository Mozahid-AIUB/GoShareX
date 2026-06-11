-- ============================================================
-- system message RPC — ride chat-এর "Chat started" / "deal confirmed"
-- জাতীয় system message insert করার নিরাপদ পথ।
--
-- সমস্যা (root cause of "chat unavailable"): messages-এর RLS insert policy
-- (0002) চায় sender_id = auth.uid()। কিন্তু system message sender_id = null
-- দিয়ে client থেকে insert হতো → 42501 RLS violation → getOrCreateChat
-- throw → chat খোলা fail (যদিও chat row তৈরি হয়ে যেত, তাই দ্বিতীয়বার
-- খুললে কাজ করত)। 0008-এর নোটে "system message RPC করবে" লেখা ছিল কিন্তু
-- RPC টা বানানো হয়নি — এই migration সেটা বানায়।
--
-- নিরাপত্তা: security definer (RLS bypass) কিন্তু ভিতরে নিজে চেক করে —
-- caller-কে সেই chat-এর participant হতে হবে। তাই বাইরের কেউ অন্যের chat-এ
-- system message ঢোকাতে পারবে না।
-- ============================================================

create or replace function public.insert_system_message(
  p_chat_id uuid,
  p_text    text,
  p_alias   text default 'System'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- guard: caller এই chat-এর participant তো?
  if not exists (
    select 1 from public.chats c
    where c.id = p_chat_id and auth.uid() = any(c.participants)
  ) then
    raise exception 'not a participant of this chat';
  end if;

  -- text সীমা (RLS policy-র মতোই 1-1000)
  if p_text is null or char_length(p_text) < 1 or char_length(p_text) > 1000 then
    raise exception 'invalid system message text';
  end if;

  insert into public.messages (chat_id, sender_id, sender_name, text, type, read)
  values (p_chat_id, null, coalesce(p_alias, 'System'), p_text, 'system', false);
end;
$$;

-- শুধু login-করা user ডাকতে পারবে
revoke all on function public.insert_system_message(uuid, text, text) from public;
grant execute on function public.insert_system_message(uuid, text, text) to authenticated;
