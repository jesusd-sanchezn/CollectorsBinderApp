import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { nightlyScryfallSync } from './scryfallSync';
import { refreshScryfallPrices } from './scryfallPriceSync';
import { refreshMtgjsonPrices } from './mtgjsonPriceSync';
import { parseDelverCsv } from './csvImport';


admin.initializeApp();


export const syncScryfall = functions.pubsub.schedule('every 24 hours').onRun(nightlyScryfallSync);
export const syncScryfallPrices = functions.pubsub.schedule('every 24 hours').onRun(refreshScryfallPrices);
export const syncMtgjsonPrices = functions.pubsub.schedule('every 24 hours').onRun(refreshMtgjsonPrices);


export const importDelverCsv = functions.https.onCall(async (data, context) => {
if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in');
const { csvText, binderId } = data as { csvText: string; binderId: string };
return parseDelverCsv(csvText, binderId, context.auth.uid);
});