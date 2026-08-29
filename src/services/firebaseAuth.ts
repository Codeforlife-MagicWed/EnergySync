import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App with dynamic fallback support
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Google Workspace Scopes
export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
];

// Resolved Google Client ID (Dynamic environment variable or provisioned configuration)
export const GOOGLE_CLIENT_ID =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID) ||
  (firebaseConfig as any)?.oAuthClientId ||
  '226543423176-kmk4ks7rcoofkb07ffvf2e36qdii6asn.apps.googleusercontent.com';

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

/**
 * Dynamically loads the official Google Identity Services (GIS) client script if not already present.
 */
function loadGoogleIdentityScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window is undefined'));
    }
    const googleObj = typeof window !== 'undefined' ? (window as any).google : undefined;
    if (googleObj?.accounts?.oauth2) {
      return resolve();
    }
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (e) => reject(e));
      // In case it already loaded
      if ((window as any).google?.accounts?.oauth2) return resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

/**
 * Native Google Identity Services (GIS) token client.
 * Uses window.location.origin dynamically for Authorized JavaScript Origins matching without redirect URI mismatches.
 */
async function signInWithGoogleIdentityServices(): Promise<{ user: User; accessToken: string } | null> {
  await loadGoogleIdentityScript();

  const googleObj = typeof window !== 'undefined' ? (window as any).google : undefined;
  if (!googleObj?.accounts?.oauth2) {
    throw new Error('Google Identity Services SDK could not be loaded.');
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return new Promise((resolve, reject) => {
    try {
      const client = googleObj.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES.join(' '),
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            if (
              tokenResponse.error === 'popup_closed_by_user' ||
              tokenResponse.error === 'access_denied' ||
              tokenResponse.error === 'user_cancelled'
            ) {
              resolve(null);
              return;
            }
            console.warn('GIS Token Client error:', tokenResponse.error, tokenResponse.error_description);
            reject(new Error(tokenResponse.error_description || tokenResponse.error));
            return;
          }

          const accessToken = tokenResponse.access_token;
          if (!accessToken) {
            reject(new Error('No access token received from Google Identity Services.'));
            return;
          }

          // Fetch user profile info from Google's userinfo endpoint
          let profileUser: User;
          try {
            const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (profileRes.ok) {
              const info = await profileRes.json();
              profileUser = {
                uid: info.sub || `google_${Date.now()}`,
                displayName: info.name || info.given_name || 'Google User',
                email: info.email || null,
                photoURL: info.picture || null,
                emailVerified: info.email_verified || false,
                isAnonymous: false,
                metadata: {} as any,
                providerData: [],
                refreshToken: '',
                tenantId: null,
                delete: async () => {},
                getIdToken: async () => accessToken,
                getIdTokenResult: async () => ({} as any),
                reload: async () => {},
                toJSON: () => ({}),
                phoneNumber: null,
                providerId: 'google.com',
              } as unknown as User;
            } else {
              profileUser = {
                uid: `google_${Date.now()}`,
                displayName: 'Google User',
                email: null,
                photoURL: null,
              } as unknown as User;
            }
          } catch {
            profileUser = {
              uid: `google_${Date.now()}`,
              displayName: 'Google User',
              email: null,
              photoURL: null,
            } as unknown as User;
          }

          cachedAccessToken = accessToken;
          cachedUser = profileUser;
          resolve({ user: profileUser, accessToken });
        },
        error_callback: (error) => {
          console.warn('GIS Error Callback:', error);
          if (error?.type === 'popup_closed') {
            resolve(null);
            return;
          }
          reject(error);
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      console.warn(`[OAuth Origin Note] Current origin is: ${origin}. Ensure ${origin} is in Authorized JavaScript Origins in Google Cloud Console if popup fails.`);
      reject(err);
    }
  });
}

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      cachedUser = user;
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthSuccess) onAuthSuccess(user, null);
      }
    } else {
      if (!cachedAccessToken) {
        cachedUser = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

/**
 * Universal Google Sign In
 * Tries Firebase Auth popup first; automatically falls back to native Google Identity Services (GIS)
 * if deployed on custom production domains (e.g. Render) without domain mismatch blockage.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isSigningIn) return null;
  isSigningIn = true;

  try {
    // 1. Try Firebase Auth popup
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
        cachedUser = result.user;
        return { user: result.user, accessToken: cachedAccessToken };
      }
    } catch (firebaseErr: any) {
      // If popup was cancelled by user, stop cleanly
      if (
        firebaseErr?.code === 'auth/popup-closed-by-user' ||
        firebaseErr?.code === 'auth/cancelled-popup-request' ||
        firebaseErr?.code === 'auth/user-cancelled'
      ) {
        return null;
      }

      // If Firebase fails due to unauthorized domain (common on Render / custom hosts), fallback to Google Identity Services
      console.info('Firebase popup status:', firebaseErr?.code || firebaseErr?.message, '— attempting Google Identity Services fallback...');
    }

    // 2. Fallback to Google Identity Services (GIS) Token Client
    const gisResult = await signInWithGoogleIdentityServices();
    return gisResult;
  } catch (error: any) {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    console.warn(`Google Sign-In failed on origin "${currentOrigin}". Verify that "${currentOrigin}" is added to Authorized JavaScript Origins in your Google Cloud Console.`);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCurrentUser = (): User | null => {
  return cachedUser || auth.currentUser;
};

export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch {
    // ignore
  }
  cachedAccessToken = null;
  cachedUser = null;
};
