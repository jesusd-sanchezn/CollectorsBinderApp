import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';


// TODO: replace with your config (Firebase Console → Project Settings)
// SECURITY WARNING: API keys should be stored in environment variables
const firebaseConfig = {
apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'your_api_key_here',
authDomain: 'collectorsbinderapp.firebaseapp.com',
projectId: 'collectorsbinderapp',
storageBucket: 'collectorsbinderapp.firebasestorage.app',
messagingSenderId: '964596004976',
appId: '1:964596004976:web:edca59215a38cf8dd09cb5',
measurementId: "G-K0EMNM43VT"
};


export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();


export const messagingPromise = isSupported().then(s => s ? getMessaging(app) : null);