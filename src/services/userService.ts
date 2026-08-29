import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase.ts';
import type { UserProfile } from '../types.ts';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const userService = {
  getProfile: async (uid: string): Promise<UserProfile | null> => {
    if (uid.startsWith('guest_') || !auth.currentUser) {
      const local = localStorage.getItem(`safeshelf_profile_${uid}`);
      if (local) {
        try { return JSON.parse(local) as UserProfile; } catch { /* ignore */ }
      }
      return {
        uid,
        fullName: 'Demo User',
        email: 'demo@safeshelf.ai',
        role: 'Household User',
        provider: 'email',
        preferredLanguage: 'English',
        onboardingCompleted: true,
        createdAt: new Date(),
        lastLogin: new Date()
      };
    }

    const path = `users/${uid}`;
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      // If doc does not exist yet, build initial profile and create it
      const newProfile: UserProfile = {
        uid,
        fullName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User',
        email: auth.currentUser?.email || `${uid}@safeshelf.local`,
        role: 'Household User',
        provider: 'email',
        preferredLanguage: 'English',
        onboardingCompleted: true,
        createdAt: new Date(),
        lastLogin: new Date()
      };
      await userService.createProfile(newProfile);
      return newProfile;
    } catch (error) {
      console.warn('Firestore getProfile warning, falling back to local:', error);
      const local = localStorage.getItem(`safeshelf_profile_${uid}`);
      if (local) {
        try { return JSON.parse(local) as UserProfile; } catch { /* ignore */ }
      }
      return {
        uid,
        fullName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User',
        email: auth.currentUser?.email || `${uid}@safeshelf.local`,
        role: 'Household User',
        provider: 'email',
        preferredLanguage: 'English',
        onboardingCompleted: true,
        createdAt: new Date(),
        lastLogin: new Date()
      };
    }
  },

  createProfile: async (profile: UserProfile): Promise<void> => {
    localStorage.setItem(`safeshelf_profile_${profile.uid}`, JSON.stringify(profile));

    if (profile.uid.startsWith('guest_') || !auth.currentUser) {
      return;
    }

    const path = `users/${profile.uid}`;
    try {
      const docRef = doc(db, 'users', profile.uid);
      await setDoc(docRef, {
        ...profile,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });
    } catch (error) {
      console.warn('Firestore createProfile warning:', error);
    }
  },

  updateLastLogin: async (uid: string): Promise<void> => {
    if (uid.startsWith('guest_') || !auth.currentUser) {
      return;
    }

    const path = `users/${uid}`;
    try {
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, {
        lastLogin: serverTimestamp()
      });
    } catch (error) {
      console.warn('Firestore updateLastLogin warning:', error);
    }
  },

  markOnboardingComplete: async (uid: string): Promise<void> => {
    const local = localStorage.getItem(`safeshelf_profile_${uid}`);
    if (local) {
      try {
        const p = JSON.parse(local);
        p.onboardingCompleted = true;
        localStorage.setItem(`safeshelf_profile_${uid}`, JSON.stringify(p));
      } catch { /* ignore */ }
    }

    if (uid.startsWith('guest_') || !auth.currentUser) {
      return;
    }

    const path = `users/${uid}`;
    try {
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, {
        onboardingCompleted: true
      });
    } catch (error) {
      console.warn('Firestore markOnboardingComplete warning:', error);
    }
  },

  updateProfile: async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
    const local = localStorage.getItem(`safeshelf_profile_${uid}`);
    if (local) {
      try {
        const p = { ...JSON.parse(local), ...updates };
        localStorage.setItem(`safeshelf_profile_${uid}`, JSON.stringify(p));
      } catch { /* ignore */ }
    }

    if (uid.startsWith('guest_') || !auth.currentUser) {
      return;
    }

    const path = `users/${uid}`;
    try {
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.warn('Firestore updateProfile warning:', error);
    }
  }
};
