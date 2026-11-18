// Server/client safe configuration helpers for Supabase PostgreSQL & Auth.
// NEVER expose SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY to client code.

export function getSupabaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
}

export function getSupabasePublishableKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();
}

export function getSupabaseSecretKey(): string {
  if (typeof window !== 'undefined') {
    throw new Error('SUPABASE_SECRET_KEY must never be accessed in browser code.');
  }
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  ).trim();
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    getSupabaseUrl() &&
      getSupabasePublishableKey() &&
      (typeof window === 'undefined' ? getSupabaseSecretKey() : true)
  );
}

export function isSupabaseDatabaseReady(): boolean {
  if (typeof window !== 'undefined') return false;
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey());
}

export function isSupabaseAuthReady(): boolean {
  if (typeof window !== 'undefined') return false;
  return Boolean(
    getSupabaseUrl() &&
      getSupabasePublishableKey() &&
      getSupabaseSecretKey()
  );
}
