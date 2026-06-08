// ============================================================
// Feature Flags — Firebase ↔ Supabase সুইচ
//
// migration চলাকালীন এই একটা সুইচ দিয়ে পুরো অ্যাপের backend
// বদলানো যায়। কিছু ভাঙলে false করে দিলেই Firebase-এ ফিরে আসে।
//
//   USE_SUPABASE_AUTH = false  ->  Firebase auth (এখনকার, নিরাপদ)
//   USE_SUPABASE_AUTH = true   ->  Supabase auth (নতুন)
// ============================================================

export const FEATURE_FLAGS = {
  // টেস্ট চলছে — এখন Supabase auth ব্যবহার হচ্ছে।
  // কিছু ভাঙলে এক্ষুনি false করে দিলেই Firebase-এ ফিরবে।
  USE_SUPABASE_AUTH: true,

  // Chat (real-time messages) Supabase Realtime দিয়ে।
  USE_SUPABASE_CHAT: true,

  // Ride flow (status, cancel, complete) Supabase দিয়ে।
  USE_SUPABASE_RIDE: true,
} as const;
