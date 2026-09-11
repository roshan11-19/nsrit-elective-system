import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Extracts authentication and recovery parameters from URL query strings, hash fragments,
 * and double-hash routing scenarios (common in HashRouter SPAs).
 */
export function extractAuthParams() {
  if (typeof window === 'undefined') return {};

  const fullHref = window.location.href || '';
  const search = window.location.search || '';
  const hash = window.location.hash || '';
  const params = {};

  // 1. Parse standard URL search parameters
  if (search) {
    const searchParams = new URLSearchParams(search);
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
  }

  // 2. Parse hash fragments (handles #/reset-password#access_token=... or #access_token=...)
  if (hash) {
    const hashFragments = hash.split('#').filter(Boolean);
    for (const fragment of hashFragments) {
      if (fragment.includes('=')) {
        const qs = fragment.includes('?') ? fragment.split('?')[1] : fragment;
        const subParams = new URLSearchParams(qs);
        for (const [key, value] of subParams.entries()) {
          params[key] = value;
        }
      }
    }
  }

  // 3. Fallback Regex match across entire URL string for any missed parameters
  const keysToCheck = [
    'access_token',
    'refresh_token',
    'expires_at',
    'expires_in',
    'token_type',
    'type',
    'code',
    'token_hash',
    'token',
    'error',
    'error_code',
    'error_description'
  ];

  for (const key of keysToCheck) {
    if (!params[key]) {
      const match = fullHref.match(new RegExp(`[?&#]${key}=([^&#]+)`));
      if (match) {
        try {
          params[key] = decodeURIComponent(match[1].replace(/\+/g, ' '));
        } catch {
          params[key] = match[1];
        }
      }
    }
  }

  return params;
}

/**
 * Safely recovers or establishes the Supabase Auth session from URL tokens, PKCE codes,
 * or cached session storage before URL manipulation occurs.
 */
export async function establishRecoverySession() {
  if (!isSupabaseConfigured || !supabase) return null;

  // 1. Check if Supabase client already has an active authenticated session
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return session;
    }
  } catch (err) {
    console.warn('Supabase getSession notice:', err);
  }

  const params = extractAuthParams();

  // 2. Check for explicit Supabase Auth error in URL
  if (params.error || params.error_description) {
    const errorMsg = params.error_description || params.error || 'Password reset link is invalid or has expired.';
    throw new Error(errorMsg);
  }

  // 3. Retrieve any cached recovery tokens in sessionStorage
  let storedTokens = null;
  try {
    const raw = sessionStorage.getItem('nsrit_recovery_tokens');
    if (raw) {
      storedTokens = JSON.parse(raw);
    }
  } catch (e) {
    // Ignore storage parse error
  }

  const accessToken = params.access_token || storedTokens?.access_token;
  const refreshToken = params.refresh_token || storedTokens?.refresh_token;

  // 4. If access_token and refresh_token are present, set the session directly
  if (accessToken && refreshToken) {
    try {
      // Store tokens in sessionStorage before any React Router hash navigation can clear the URL
      try {
        sessionStorage.setItem('nsrit_recovery_tokens', JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
          saved_at: Date.now()
        }));
      } catch (e) {
        // Ignore storage write error
      }

      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (error) {
        console.warn('supabase.auth.setSession error:', error);
      } else if (data?.session) {
        return data.session;
      }
    } catch (err) {
      console.warn('establishRecoverySession setSession error:', err);
    }
  }

  // 5. Handle PKCE authorization code exchange
  if (params.code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) {
        console.warn('supabase.auth.exchangeCodeForSession error:', error);
      } else if (data?.session) {
        return data.session;
      }
    } catch (err) {
      console.warn('establishRecoverySession exchangeCode error:', err);
    }
  }

  // 6. Handle token_hash verification (OTP flow)
  if (params.token_hash || (params.token && (params.type === 'recovery' || params.type === 'invite'))) {
    try {
      const tokenHash = params.token_hash || params.token;
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: params.type || 'recovery'
      });

      if (error) {
        console.warn('supabase.auth.verifyOtp error:', error);
      } else if (data?.session) {
        return data.session;
      }
    } catch (err) {
      console.warn('establishRecoverySession verifyOtp error:', err);
    }
  }

  // 7. Final check for active session after all attempts
  try {
    const { data: { session: finalSession } } = await supabase.auth.getSession();
    if (finalSession?.user) {
      return finalSession;
    }
  } catch (err) {
    // Ignore error
  }

  return null;
}

/**
 * Clears temporary recovery tokens from sessionStorage once password update succeeds.
 */
export function clearRecoveryTokens() {
  try {
    sessionStorage.removeItem('nsrit_recovery_tokens');
  } catch (e) {
    // Ignore
  }
}
