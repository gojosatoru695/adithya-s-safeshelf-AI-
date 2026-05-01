import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';
import type { UserProfile } from '../types.ts';

export const userService = {
  getProfile: async (uid: string): Promise<UserProfile | null> => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  createProfile: async (profile: UserProfile): Promise<void> => {
    try {
      const docRef = doc(db, 'users', profile.uid);
      await setDoc(docRef, {
        ...profile,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  },

  updateLastLogin: async (uid: string): Promise<void> => {
    try {
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, {
        lastLogin: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  },

  markOnboardingComplete: async (uid: string): Promise<void> => {
    try {
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, {
        onboardingCompleted: true
      });
    } catch (error) {
      console.error('Error updating onboarding status:', error);
    }
  }
};
