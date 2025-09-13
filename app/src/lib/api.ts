import { db } from './firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';


export async function getMyProfile(uid: string) {
const ref = doc(db, 'users', uid);
const snap = await getDoc(ref);
return snap.exists() ? snap.data() : null;
}


export async function createBinder(uid: string, name: string) {
const id = crypto.randomUUID();
const pages = Array.from({ length: 10 }, (_, i) => ({ index: i, slots: Array.from({ length: 9 }, (_, s) => ({ row: Math.floor(s/3), col: s%3 })) }));
await setDoc(doc(db, 'binders', id), { id, ownerId: uid, name, visibility: 'friends', pageCount: pages.length, pages });
return id;
}