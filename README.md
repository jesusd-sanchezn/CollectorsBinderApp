# MTG Binder – Starter


## Prereqs
- Node 18+, Yarn or npm
- Firebase project created
- TCGplayer API credentials (client id/secret)


## Setup
1. Clone repo and install deps:
```bash
cd app && npm i && cd ../functions && npm i
```
2. Firebase config (app/src/lib/firebase.ts): replace placeholders with your project keys. Add `google-services.json` to `app/` for Android.
3. Firestore security rules & indexes:
```bash
firebase login
firebase init firestore
firebase deploy --only firestore:rules,firestore:indexes
```
4. Functions env (TCG keys):
```bash
cd functions
export TCG_CLIENT_ID=xxxx
export TCG_CLIENT_SECRET=yyyy
npm run build && firebase deploy --only functions
```
5. Run the app:
```bash
cd app
npm run start
```


## Next steps
- Implement binder read/listing in HomeScreen.
- Hook ImportCsvScreen to call callable `importDelverCsv`.
- Build Scryfall → TCG product mapping cache.
- Add push notifications (FCM) and topic logic for wants/trade sessions.