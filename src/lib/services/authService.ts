import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  updateDoc,
  runTransaction,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase/client';
import { handleFirestoreError, OperationType } from '@/src/lib/firebase/errors';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '@/src/constants/finance';
import type { UserPreferences, UserProfile } from '@/src/types/finance';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const DEFAULT_PREFERENCES: UserPreferences = {
  reportingCurrency: 'NGN',
  dateFormat: 'MMM dd, yyyy',
  theme: 'dark',
};

// Deduplicates concurrent profile initialization calls (e.g. onAuthStateChanged + loginWithGoogle)
const ensureProfilePromises = new Map<string, Promise<UserProfile>>();
// Preserves the full name entered on RegisterPage when onAuthStateChanged fires before updateProfile
const pendingRegistrationNames = new Map<string, string>();

export function mapAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 8 characters with an uppercase letter and a number.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in window was closed before completing authentication.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled in Firebase Console. Use Google Sign-In or enable Email/Password in Authentication -> Sign-in method.';
    case 'auth/requires-recent-login':
      return 'For security, please sign out and sign back in before changing your password.';
    default:
      return error instanceof Error ? error.message : 'Authentication failed. Please try again.';
  }
}

async function seedNewUserRecordsAtomically(user: User, fullName: string): Promise<UserProfile> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);

  const resolvedName =
    fullName.trim().slice(0, 100) ||
    user.displayName?.trim().slice(0, 100) ||
    user.email?.split('@')[0]?.slice(0, 100) ||
    'SpendWise User';

  const profileData: UserProfile = {
    uid: user.uid,
    fullName: resolvedName,
    email: (user.email || `${user.uid}@spendwise.app`).slice(0, 254),
    ...(user.photoURL ? { photoURL: user.photoURL.slice(0, 1000) } : {}),
    defaultCurrency: 'NGN',
    preferences: { ...DEFAULT_PREFERENCES },
  };

  try {
    return await runTransaction(db, async (transaction) => {
      const existingSnap = await transaction.get(userRef);
      if (existingSnap.exists()) {
        // Returning user or concurrent caller: preserve existing profile and preferences without overwriting
        return existingSnap.data() as UserProfile;
      }

      transaction.set(userRef, {
        ...profileData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const allSeeds = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];
      for (const seed of allSeeds) {
        const catRef = doc(collection(db, 'categories'));
        transaction.set(catRef, {
          id: catRef.id,
          userId: user.uid,
          name: seed.name,
          type: seed.type,
          icon: seed.icon,
          color: seed.color,
          isDefault: true,
          createdAt: serverTimestamp(),
        });
      }

      return profileData;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

async function resolveUserProfile(user: User, fallbackName?: string): Promise<UserProfile> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);

  try {
    let snap;
    try {
      snap = await getDocFromServer(userRef);
    } catch {
      snap = await getDoc(userRef);
    }

    if (snap.exists()) {
      return snap.data() as UserProfile;
    }

    const emailKey = user.email?.toLowerCase();
    const hintedName = emailKey ? pendingRegistrationNames.get(emailKey) : undefined;
    return await seedNewUserRecordsAtomically(
      user,
      fallbackName || hintedName || user.displayName || 'SpendWise User'
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('{')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, userPath);
  }
}

export async function ensureUserProfile(user: User, fallbackName?: string): Promise<UserProfile> {
  const inFlight = ensureProfilePromises.get(user.uid);
  if (inFlight) {
    return inFlight;
  }

  const promise = resolveUserProfile(user, fallbackName).finally(() => {
    ensureProfilePromises.delete(user.uid);
  });
  ensureProfilePromises.set(user.uid, promise);
  return promise;
}

export async function registerWithEmail(
  fullName: string,
  email: string,
  password: string
): Promise<User> {
  const normalizedEmail = email.trim().toLowerCase();
  pendingRegistrationNames.set(normalizedEmail, fullName.trim());

  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(credential.user, { displayName: fullName.trim() });
    await ensureUserProfile(credential.user, fullName);
    sendEmailVerification(credential.user).catch(() => {
      // Non-blocking verification email dispatch
    });
    return credential.user;
  } finally {
    pendingRegistrationNames.delete(normalizedEmail);
  }
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  await ensureUserProfile(credential.user);
  return credential.user;
}

export async function loginWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(credential.user, credential.user.displayName ?? undefined);
  return credential.user;
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function updateUserProfileRecord(
  uid: string,
  updates: {
    fullName?: string;
    photoURL?: string;
    defaultCurrency?: UserProfile['defaultCurrency'];
    preferences?: UserPreferences;
  }
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.fullName !== undefined) {
      payload.fullName = updates.fullName.trim().slice(0, 100);
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: updates.fullName.trim().slice(0, 100),
        });
      }
    }
    if (updates.photoURL !== undefined && updates.photoURL.trim().length > 0) {
      payload.photoURL = updates.photoURL.trim().slice(0, 1000);
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          photoURL: updates.photoURL.trim().slice(0, 1000),
        });
      }
    }
    if (updates.defaultCurrency !== undefined) {
      payload.defaultCurrency = updates.defaultCurrency;
    }
    if (updates.preferences !== undefined) {
      payload.preferences = updates.preferences;
    }
    await updateDoc(doc(db, 'users', uid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateUserPhotoUrl(uid: string, photoURL: string): Promise<void> {
  const path = `users/${uid}`;
  const cleanUrl = photoURL.trim();
  if (!cleanUrl || cleanUrl.length > 250_000) {
    throw new Error('Processed profile picture exceeds the maximum allowed size.');
  }
  try {
    await updateDoc(doc(db, 'users', uid), {
      photoURL: cleanUrl,
      updatedAt: serverTimestamp(),
    });
    if (auth.currentUser && !cleanUrl.startsWith('data:')) {
      await updateProfile(auth.currentUser, { photoURL: cleanUrl }).catch(() => {
        // Non-fatal auth profile sync
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function clearUserPhotoUrl(uid: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    const { deleteField } = await import('firebase/firestore');
    await updateDoc(doc(db, 'users', uid), {
      photoURL: deleteField(),
      updatedAt: serverTimestamp(),
    });
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { photoURL: '' }).catch(() => {
        // Non-fatal auth profile sync
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function changeUserPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('No authenticated email account found.');
  }
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export async function resendVerificationEmail(): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('No authenticated user.');
  }
  await sendEmailVerification(auth.currentUser);
}
