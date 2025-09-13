import * as admin from 'firebase-admin';


interface Row {
Name: string;
SetCode?: string; Set?: string;
CollectorNumber?: string;
Count?: string;
Finish?: string; // foil/nonfoil/etched
Condition?: string; // NM/LP/...
Language?: string; // English, Spanish, etc.
ScryfallID?: string;
}


export async function parseDelverCsv(csvText: string, binderId: string, ownerId: string) {
const rows = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
const header = rows.shift()!;
const cols = header.split(',');


const get = (cells: string[], key: string) => {
const idx = cols.findIndex(c => c.replace(/\"/g,'').toLowerCase() === key.toLowerCase());
return idx >= 0 ? (cells[idx] || '').replace(/^\"|\"$/g, '') : '';
};


const db = admin.firestore();
const batch = db.batch();
const itemsCol = db.collection('collection-items');
const binderRef = db.collection('binders').doc(binderId);


let created = 0; const failed: any[] = [];


for (const line of rows) {
const cells = line.split(',');
const r: Row = {
Name: get(cells, 'Name'),
SetCode: get(cells, 'SetCode') || get(cells, 'Set'),
CollectorNumber: get(cells, 'CollectorNumber'),
Count: get(cells, 'Count') || '1',
Finish: get(cells, 'Finish') || 'nonfoil',
Condition: get(cells, 'Condition') || 'NM',
Language: get(cells, 'Language') || 'English',
ScryfallID: get(cells, 'ScryfallID')
};


try {
// Resolve printing using scryfall_prints collection: set + collectorNumber + finish
const q = await db.collection('scryfall_prints')
.where('set', '==', (r.SetCode||'').toLowerCase())
.where('collectorNumber', '==', r.CollectorNumber)
.limit(1).get();


if (q.empty) throw new Error(`Unknown printing: ${r.Name} ${r.SetCode} #${r.CollectorNumber}`);
const card = q.docs[0].data();


const id = admin.firestore().collection('_').doc().id;
batch.set(itemsCol.doc(id), {
id,
ownerId,
scryfall: {
id: card.id,
oracleId: card.oracleId,
name: card.name,
set: card.set,
collectorNumber: card.collectorNumber,
imageUri: card.imageUris?.normal || null,
colorIdentity: card.colorIdentity,
legality: card.legality
},
printing: { finish: (r.Finish||'nonfoil').toLowerCase(), language: r.Language, condition: r.Condition },
qty: parseInt(r.Count||'1',10),
tradable: true,
price: { latest: null, currency: 'USD' }
});
created++;
} catch (e:any) {
failed.push({ row: r, error: String(e.message || e) });
}
}


await batch.commit();
return { created, failed };
}