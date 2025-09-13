import React, { useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import { auth, googleProvider, facebookProvider } from '../lib/firebase';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { useAuthStore } from '../state/useAuthStore';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';


export default function LoginScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Login'>) {
const { user, initialized } = useAuthStore();


useEffect(() => { if (initialized && user) navigation.replace('Home'); }, [user, initialized]);


return (
<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
<Text style={{ fontSize: 24, fontWeight: '600' }}>MTG Binder</Text>
<Button title="Sign in with Google" onPress={() => signInWithPopup(auth, googleProvider)} />
<Button title="Sign in with Facebook" onPress={() => signInWithPopup(auth, facebookProvider)} />
{/* Minimal email demo (replace with proper form) */}
<Button title="Demo email login" onPress={async () => {
try { await signInWithEmailAndPassword(auth, 'demo@example.com', 'demopassword'); } catch (e) { console.warn(e); }
}} />
</View>
);
}