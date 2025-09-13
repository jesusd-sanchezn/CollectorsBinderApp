import * as admin from 'firebase-admin';
import fetch from 'node-fetch';


// Downloads MTGJSON prices and maps by Scryfall UUID when possible
export async function refreshMtgjsonPrices() {
const db = admin.firestore();
const url = process.env.MTGJSON_PRICES_URL || 'https://mtgjson.com/api/v5/AllPricesToday.json';
const res = await fetch(url);
if (!res.ok) return { updated: 0, note: 'failed to fetch MTGJSON' };
const all = await res.json() as any;


const data = all?.data || {};
const batch = db.batch();
const pricesCol = db.collection('prices');
let count = 0;


for (const [printingId, priceObj] of Object.entries<any>(data)) {
const usd = priceObj?.paper?.normal?.latest ?? null;
const usdFoil = priceObj?.paper?.foil?.latest ?? null;
batch.set(pricesCol.doc(String(printingId)), {
provider: 'mtgjson',
printingId,
usd, usdFoil,
updatedAt: new Date().toISOString()
}, { merge: true });


if (++count % 400 === 0) await batch.commit();
}
if (count % 400 !== 0) await batch.commit();
return { updated: count };
}
