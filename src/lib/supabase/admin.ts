import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseSecretKey, getSupabaseUrl } from './config.ts';

let cachedAdminClient: SupabaseClient | null = null;
let cachedConfigFingerprint = '';

/**
 * Server-only Supabase client using the secret/service_role key.
 * Used exclusively by server-side repository logic, admin allowlist verification,
 * and server-only rate-limited RPC (`record_active_course_click`).
 * NEVER import this module from any 'use client' component.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('getSupabaseAdminClient() is server-only.');
  }

  const url = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();

  if (!url || !secretKey) {
    throw new Error(
      'Supabase server credentials (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY) are not configured.'
    );
  }

  const fingerprint = `${url}|${secretKey.slice(0, 12)}|${secretKey.length}`;
  if (cachedAdminClient && cachedConfigFingerprint === fingerprint) {
    return cachedAdminClient;
  }

  cachedAdminClient = createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  cachedConfigFingerprint = fingerprint;

  return cachedAdminClient;
}
