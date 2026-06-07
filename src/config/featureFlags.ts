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
  // এখন false — অর্থাৎ অ্যাপ এখনো Firebase-ই চালাচ্ছে।
  // টেস্ট করার সময় true করব।
  USE_SUPABASE_AUTH: false,
} as const;
