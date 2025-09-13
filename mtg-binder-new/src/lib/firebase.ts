import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration - using your existing project
const firebaseConfig = {
  apiKey: 'AIzaSyDNJBZHRLJuUU-LNpW4XPtcTGn4FZTZEm4',
  authDomain: 'collectorsbinderapp.firebaseapp.com',
  projectId: 'collectorsbinderapp',
  storageBucket: 'collectorsbinderapp.firebasestorage.app',
  messagingSenderId: '964596004976',
  appId: '1:964596004976:web:edca59215a38cf8dd09cb5',
  measurementId: "G-K0EMNM43VT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
// Try initializeAuth first, fallback to getAuth if it fails
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  // If initializeAuth fails (auth already initialized), use getAuth
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export const functions = getFunctions(app);

export default app;
