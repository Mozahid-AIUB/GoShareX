// send-welcome-email — user email confirm করার ১০ মিনিট পর একটা soft,
// friendly "Welcome to GoShareX" email পাঠায়।
//
// কীভাবে: 0033 migration-এর pg_cron (dispatch_due_welcome_emails) প্রতি
// মিনিটে due হওয়া row-গুলোর জন্য এই function-কে { id, email, name } সহ
// POST করে (pg_net দিয়ে)। function Brevo-র transactional email HTTP API
// দিয়ে email পাঠায় (SMTP relay না — Edge Function-এ HTTP API সহজ)।
//
// নিরাপত্তা: শুধু DB cron (server-side, service_role context) ডাকে।
// BREVO_API_KEY secret — Brevo dashboard → Settings → SMTP & API →
// API Keys থেকে নেওয়া, Supabase → Edge Functions → Secrets-এ সেট করতে হবে।

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') ?? '';
const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

const SENDER_EMAIL = 'noreply@goshare.pro.bd';
const SENDER_NAME = 'GoShareX';

interface WelcomeReq {
  id: string;
  email: string;
  name?: string | null;
}

function buildEmailHtml(name: string): string {
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0f172a;">
      <div style="font-size:22px;font-weight:900;margin-bottom:18px;">Go<span style="color:#2563eb;">Share</span>X</div>
      <p style="font-size:15px;line-height:1.7;">Hi ${name},</p>
      <p style="font-size:15px;line-height:1.7;">
        Welcome to GoShareX! Your account is all set up. We're glad you're here.
      </p>
      <p style="font-size:15px;line-height:1.7;">
        Whenever you're ready, open the app to find a ride to share, split the fare,
        and save a little on your way to campus.
      </p>
      <p style="font-size:15px;line-height:1.7;margin-top:24px;">
        Safe travels,<br/>The GoShareX team
      </p>
    </div>
  `;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }
  if (!BREVO_API_KEY) {
    console.log('BREVO_API_KEY not configured — skipping welcome email');
    return new Response(JSON.stringify({ skipped: true }), { status: 200 });
  }

  try {
    const { email, name }: WelcomeReq = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: 'email required' }), { status: 400 });
    }

    const displayName = (name ?? email.split('@')[0] ?? 'there').trim() || 'there';

    const res = await fetch(BREVO_SEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: SENDER_EMAIL, name: SENDER_NAME },
        to: [{ email }],
        subject: 'Welcome to GoShareX 🚗',
        htmlContent: buildEmailHtml(displayName),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Brevo send failed:', res.status, errText);
      return new Response(JSON.stringify({ error: 'send failed' }), { status: 502 });
    }

    return new Response(JSON.stringify({ sent: true }), { status: 200 });
  } catch (err) {
    console.error('send-welcome-email error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
};
