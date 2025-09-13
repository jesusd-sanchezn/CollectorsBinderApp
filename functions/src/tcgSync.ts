import * as admin from 'firebase-admin';
import fetch from 'node-fetch';


// Set in Functions config: tcg.clientId, tcg.clientSecret
async function getTcgToken() {
const cfg = admin.instanceId().app.options; // placeholder; use functions:config in real code
const clientId = process.env.TCG_CLIENT_ID!;
const clientSecret = process.env.TCG_CLIENT_SECRET!;
const res = await fetch('https://api.tcgplayer.com/token', {
method: 'POST',
headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
body: new URLSearchParams({
grant_type: 'client_credentials',
client_id: clientId,
client_secret: clientSecret
})
});
const json = await res.json() as any;
return json.access_token as string;
}


export async function nightlyTcgSync() {
const db = admin.firestore();
const token = await getTcgToken();


// Collect distinct product IDs to price (you'll map scryfall_prints → tcg product once)
const toPrice: string[] = [];
const pricesCol = db.collection('prices');


// Stub: price a small, hardcoded set for now
const productIds = toPrice.length ? toPrice : ['123456'];


const res = await fetch(`https://api.tcgplayer.com/pricing/product/${productIds.join(',')}`, {
headers: { Authorization: `bearer ${token}` }
});
const data = await res.json() as any;


const batch = db.batch();
for (const p of data.results ?? []) {
const ref = pricesCol.doc(String(p.productId));
batch.set(ref, { productId: p.productId, marketPrice: p.marketPrice ?? null, updatedAt: new Date().toISOString() }, { merge: true });
}
await batch.commit();
return { priced: data.results?.length || 0 };
}