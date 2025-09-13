import * as admin from 'firebase-admin';
import fetch from 'node-fetch';


export async function nightlyScryfallSync() {
// Fetch bulk "default_cards" or "oracle_cards" + "all_printings"
const bulkList = await fetch('https://api.scryfall.com/bulk-data').then((r: any) => r.json()) as any;
const printingsInfo = bulkList.data.find((b: any) => b.type === 'all_printings');
if (!printingsInfo) return null;


// Stream or chunked download is recommended for production; stubbed here
const json = await fetch(printingsInfo.download_uri).then((r: any) => r.json()) as any[];


const batch = admin.firestore().batch();
const col = admin.firestore().collection('scryfall_prints');


json.slice(0, 1000).forEach(card => { // limit for stub
const ref = col.doc(card.id);
batch.set(ref, {
id: card.id,
oracleId: card.oracle_id,
name: card.name,
set: card.set,
collectorNumber: card.collector_number,
finishes: card.finishes,
imageUris: card.image_uris || card.card_faces?.[0]?.image_uris || null,
colorIdentity: card.color_identity,
legality: card.legalities
}, { merge: true });
});


await batch.commit();
return { imported: Math.min(json.length, 1000) };
}