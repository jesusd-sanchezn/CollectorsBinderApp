import { create } from 'zustand';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';


interface AuthState { user: User | null; initialized: boolean; }


export const useAuthStore = create<AuthState>((set) => ({ user: null, initialized: false }));


onAuthStateChanged(auth, (u) => {
useAuthStore.setState({ user: u, initialized: true });
});