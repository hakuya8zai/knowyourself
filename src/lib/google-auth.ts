/**
 * Google Sign-In (GSI) - httpOnly Cookie Auth
 * Tokens are stored in httpOnly cookies by the backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.selfkit.art/api/v1';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

// Cached config
let cachedConfig: { google_client_id: string } | null = null;

/**
 * Call logout endpoint to clear httpOnly cookies.
 */
export async function clearAuth(): Promise<void> {
  if (typeof window === 'undefined') return;
  // Remove legacy frontend-readable cookies from older deployments.
  document.cookie = 'kys_user=; path=/; domain=.selfkit.art; max-age=0';
  document.cookie = 'kys_auth=; path=/; domain=.selfkit.art; max-age=0';
  // Also try without domain (for localhost)
  document.cookie = 'kys_user=; path=/; max-age=0';
  document.cookie = 'kys_auth=; path=/; max-age=0';
  
  // Call backend to clear httpOnly cookies
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (e) {
    console.error('Logout error:', e);
  }
}

/**
 * Fetch public config from backend
 */
export async function fetchConfig(): Promise<{ google_client_id: string }> {
  if (cachedConfig) return cachedConfig;
  
  const response = await fetch(`${API_URL}/config/public`);
  if (!response.ok) {
    throw new Error('Failed to fetch config');
  }
  
  cachedConfig = await response.json();
  return cachedConfig!;
}

/**
 * Load Google Identity Services script
 */
export function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Not in browser'));
      return;
    }

    // Already loaded
    if (window.google?.accounts) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(script);
  });
}

/**
 * Initialize Google Sign-In button
 */
export async function initGoogleSignIn(
  buttonElement: HTMLElement,
  onSuccess: (user: AuthUser) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    // Load config and script in parallel
    const [config] = await Promise.all([
      fetchConfig(),
      loadGoogleScript(),
    ]);
    
    if (!config.google_client_id) {
      onError('Google 登入尚未設定');
      return;
    }

    if (!window.google?.accounts) {
      onError('Google Sign-In 載入失敗');
      return;
    }

    const callbackUrl = `${window.location.origin}/api/auth/google/callback`;
    
    // Store current URL for redirect after OAuth (cookie so server can read it)
    document.cookie = `kys_return_url=${encodeURIComponent(window.location.href)}; path=/; max-age=300; SameSite=Lax`;
    
    window.google.accounts.id.initialize({
      client_id: config.google_client_id,
      ux_mode: 'redirect',
      login_uri: callbackUrl,
      callback: async (response: { credential: string }) => {
        try {
          if (!response.credential) {
            onError('Google 登入失敗：未收到憑證');
            return;
          }
          
          // Send credential to backend - it will set httpOnly cookies
          const result = await verifyGoogleToken(response.credential);
          
          if (!result.user) {
            onError('登入失敗');
            return;
          }
          
          onSuccess(result.user);
        } catch (err) {
          console.error('[GSI] Error:', err);
          onError(err instanceof Error ? err.message : '登入失敗');
        }
      },
    });

    window.google.accounts.id.renderButton(buttonElement, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      locale: 'zh-TW',
      width: 300,
    });
  } catch (err) {
    onError(err instanceof Error ? err.message : '初始化失敗');
  }
}

/**
 * Verify Google ID token with backend
 * Backend sets httpOnly cookies, we only get user info back
 */
async function verifyGoogleToken(idToken: string): Promise<{ user: AuthUser }> {
  const response = await fetch(`${API_URL}/auth/google/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
    credentials: 'include',  // Important: allow cookies to be set
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Google 驗證失敗');
  }

  return response.json();
}

/**
 * Logout - clear local data and server cookies
 */
export async function logout(): Promise<void> {
  await clearAuth();
  // Also revoke Google session if available
  if (window.google?.accounts) {
    window.google.accounts.id.disableAutoSelect();
  }
}

// Type declarations for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback?: (response: { credential: string }) => void;
            ux_mode?: 'popup' | 'redirect';
            login_uri?: string;
            use_fedcm_for_prompt?: boolean;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              text?: string;
              locale?: string;
              width?: number;
            }
          ) => void;
          disableAutoSelect: () => void;
          prompt: () => void;
        };
      };
    };
  }
}
