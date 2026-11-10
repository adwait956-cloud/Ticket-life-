import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  applyActionCode,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');

// Validate connection to Firestore
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testFirestoreConnection();

// Configure Google Auth Provider with requested Gmail scopes
export const googleProvider = new GoogleAuthProvider();

export const GMAIL_SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
  'https://www.googleapis.com/auth/gmail.addons.current.message.action',
  'https://www.googleapis.com/auth/gmail.addons.current.message.metadata',
  'https://www.googleapis.com/auth/gmail.addons.current.message.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.insert',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/gmail.settings.sharing',
];

export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
];

export const WORKSPACE_SCOPES = [
  ...GMAIL_SCOPES,
  ...CALENDAR_SCOPES,
];

// Add scopes to provider
WORKSPACE_SCOPES.forEach((scope) => {
  googleProvider.addScope(scope);
});

// Prompt for consent to ensure refresh token and scopes are returned
googleProvider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline',
});

// In-memory access token storage (Skill requirement: never store access tokens in localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) {
        onAuthFailure();
      }
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      console.warn('Google credential returned without accessToken');
    }
    cachedAccessToken = credential?.accessToken || null;
    return {
      user: result.user,
      accessToken: cachedAccessToken || '',
    };
  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Registers a new user via Firebase Authentication and triggers
 * the official Email Verification template shown in the Firebase Console.
 */
export const firebaseRegisterUser = async (
  email: string,
  pass: string,
  displayName: string
): Promise<{ user: User; verificationSent: boolean }> => {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  if (displayName) {
    try {
      await updateProfile(cred.user, { displayName });
    } catch (e) {
      console.warn('Could not set displayName on Firebase user:', e);
    }
  }

  let verificationSent = false;
  try {
    await sendEmailVerification(cred.user);
    verificationSent = true;
  } catch (err) {
    console.warn('Firebase sendEmailVerification notice:', err);
  }

  return { user: cred.user, verificationSent };
};

/**
 * Signs in an existing user with Firebase Email and Password credentials.
 */
export const firebaseLoginUser = async (email: string, pass: string): Promise<User> => {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return cred.user;
};

/**
 * Dispatches an official Firebase Password Reset email to the user
 * from noreply@ticket-life-c4b76.firebaseapp.com.
 */
export const firebaseSendPasswordReset = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

/**
 * Re-sends official email verification to the currently authenticated Firebase user.
 */
export const firebaseSendEmailVerification = async (user: User): Promise<void> => {
  await sendEmailVerification(user);
};

/**
 * Verifies email using Firebase oobCode (from the verification link).
 */
export const firebaseVerifyEmailWithCode = async (codeOrUrl: string): Promise<void> => {
  let oobCode = codeOrUrl.trim();
  if (oobCode.includes('oobCode=')) {
    const match = oobCode.match(/oobCode=([^&]+)/);
    if (match && match[1]) {
      oobCode = match[1];
    }
  }
  await applyActionCode(auth, oobCode);
};

export const checkCurrentUserEmailVerified = async (): Promise<boolean> => {
  if (!auth.currentUser) return false;
  await auth.currentUser.reload();
  return auth.currentUser.emailVerified;
};

export const reloadFirebaseUser = async (user: User): Promise<User> => {
  await user.reload();
  return auth.currentUser || user;
};
