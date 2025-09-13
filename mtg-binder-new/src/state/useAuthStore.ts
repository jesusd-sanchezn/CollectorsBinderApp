import { create } from 'zustand';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signOut: () => Promise<void>;
  initializeAuth: () => void;
}

// Helper function to create or update user document in Firestore
const createOrUpdateUserDocument = async (user: User) => {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // Create new user document
      await setDoc(userRef, {
        email: user.email?.toLowerCase(),
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        avatarUrl: user.photoURL || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('User document created for:', user.email);
    } else {
      // Update existing user document
      await setDoc(userRef, {
        email: user.email?.toLowerCase(),
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        avatarUrl: user.photoURL || null,
        updatedAt: serverTimestamp()
      }, { merge: true });
      console.log('User document updated for:', user.email);
    }
  } catch (error) {
    console.error('Error creating/updating user document:', error);
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,

  signInWithEmail: async (email: string, password: string) => {
    try {
      set({ loading: true });
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Create or update user document
      await createOrUpdateUserDocument(userCredential.user);
    } catch (error) {
      console.error('Email sign in error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signUpWithEmail: async (email: string, password: string) => {
    try {
      set({ loading: true });
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Create user document
      await createOrUpdateUserDocument(userCredential.user);
    } catch (error) {
      console.error('Email sign up error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signInWithGoogle: async () => {
    try {
      set({ loading: true });
      // Google Sign-In will be implemented with the native module
      // For now, we'll throw an error to indicate it needs native setup
      throw new Error('Google Sign-In requires native configuration');
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signInWithFacebook: async () => {
    try {
      set({ loading: true });
      // Facebook Sign-In will be implemented with the native module
      // For now, we'll throw an error to indicate it needs native setup
      throw new Error('Facebook Sign-In requires native configuration');
    } catch (error) {
      console.error('Facebook sign in error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    try {
      set({ loading: true });
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  initializeAuth: () => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Create or update user document when user signs in
        await createOrUpdateUserDocument(user);
      }
      set({ user, initialized: true });
    });

    // Return unsubscribe function for cleanup
    return unsubscribe;
  },
}));
