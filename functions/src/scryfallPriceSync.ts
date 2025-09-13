import * as admin from 'firebase-admin';
import fetch from 'node-fetch';


// Pull prices directly from Scryfall printing objects (usd/usd_foil)
export async function refreshScryfallPrices() {
const db = admin.firestore();


// Recent collection items (touched in last 30 days)
const since = Date.now() - 30*24*60*60*1000;
const itemsSnap = await db.collection('collection-items')
.where('updatedAt', '>=', new Date(since))
.limit(1000)
.get();


const prints: string[] = Array.from(new Set(itemsSnap.docs.map(d => d.get('scryfall.id')).filter(Boolean)));
if (prints.length === 0) return { updated: 0 };


let updated = 0;
const pricesCol = db.collection('prices');


for (const id of prints) {
const r = await fetch(`https://api.scryfall.com/cards/${id}`);
if (!r.ok) continue;
const card = await r.json() as any;
const usd = card?.prices?.usd ?? null;
const usdFoil = card?.prices?.usd_foil ?? null;


await pricesCol.doc(String(id)).set({
provider: 'scryfall',
printingId: id,
usd, usdFoil,
updatedAt: new Date().toISOString()
}, { merge: true });


updated++;
}


return { updated };
}
