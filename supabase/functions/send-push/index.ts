// send-push — app বন্ধ থাকলেও user-কে status bar push পাঠায় (ধাপ D)।
//
// কীভাবে: notifications টেবিলে নতুন row এলে DB trigger এই function-কে ওই
// row-এর payload সহ POST করে। function receiver-এর push_token নিয়ে
// EXPO PUSH API-তে পাঠায় — কোনো Firebase/FCM credential লাগে না (Expo
// নিজে FCM/APNs-এ deliver করে)। তাই কোনো secret ফাঁসের ঝুঁকি নেই।
//
// নিরাপত্তা: শুধু service_role (server-side) চলে; push_token RLS-এ সুরক্ষিত,
// এখানে service key দিয়ে পড়ি। client কখনো এই function সরাসরি ডাকে না —
// DB trigger (pg_net) ডাকে।

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.40.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, serviceKey);

// shared secret — শুধু DB trigger (send_push_to) এই secret সহ ডাকতে পারে।
// বাইরের কেউ function URL জানলেও secret ছাড়া push পাঠাতে পারবে না (spam/phishing রোধ)।
// সেট করতে: Supabase → Edge Functions → Secrets → PUSH_HOOK_SECRET, এবং DB-তে
// app.settings.push_hook_secret একই মান। দুটো না মিললে function 401 দেয়।
const PUSH_HOOK_SECRET = Deno.env.get('PUSH_HOOK_SECRET') ?? '';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// DB trigger (send_push_to) যা পাঠায়: { to_user_id, title, body, data }।
interface PushReq {
  to_user_id: string;
  title?: string;
  body: string;
  data?: Record<string, unknown> | null;
}

async function sendExpoPush(
  token: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  // Expo token format guard — ভুল token-এ API কল নষ্ট না করি।
  if (!token.startsWith('ExponentPushToken') && !token.startsWith('ExpoPushToken')) {
    console.log(`Skip: not an Expo token (${token.slice(0, 12)}...)`);
    return;
  }
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      title,
      body,
      data,
      sound: 'default',
      priority: 'high',
      channelId: 'rides',
    }),
  });
  const json = await res.json().catch(() => null);
  console.log('Expo push result:', JSON.stringify(json));
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  // secret guard — DB trigger ছাড়া অন্য কেউ (বাইরের attacker) ডাকলে block।
  // secret সেট থাকলে তবেই enforce করি (সেট না থাকলে পুরনো behaviour — deploy
  // ভাঙবে না; কিন্তু production-এ অবশ্যই PUSH_HOOK_SECRET সেট করা উচিত)।
  if (PUSH_HOOK_SECRET) {
    const provided = req.headers.get('x-push-secret') ?? '';
    if (provided !== PUSH_HOOK_SECRET) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    }
  }

  try {
    const r: PushReq = await req.json();
    if (!r?.to_user_id || !r?.body) {
      return new Response(JSON.stringify({ skipped: 'bad payload' }), { status: 200 });
    }

    // receiver-এর push token নিই (service key → RLS bypass, server-only)।
    const { data: user, error } = await supabase
      .from('users')
      .select('push_token')
      .eq('id', r.to_user_id)
      .single();

    if (error || !user?.push_token) {
      console.log(`No push token for ${r.to_user_id} — skip (user maybe on Expo Go).`);
      return new Response(JSON.stringify({ skipped: 'no token' }), { status: 200 });
    }

    await sendExpoPush(
      user.push_token,
      r.title ?? 'GoShareX',
      r.body,
      r.data ?? {},
    );

    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-push error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
