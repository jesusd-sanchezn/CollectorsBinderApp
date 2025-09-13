# Security Setup Instructions

## ⚠️ IMPORTANT: API Key Security

This project uses Firebase for authentication and data storage. To keep your API keys secure:

### 1. Create Environment File
Copy `env.example` to `.env` and fill in your actual Firebase configuration:

```bash
cp env.example .env
```

### 2. Get Your Firebase Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `collectorsbinderapp`
3. Go to **Project Settings** → **General** tab
4. Scroll down to **Your apps** section
5. Click the **gear icon** next to your web app
6. Copy the configuration values

### 3. Fill in .env File
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_actual_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=collectorsbinderapp.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=collectorsbinderapp
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=collectorsbinderapp.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 4. Regenerate API Key (If Exposed)
If your API key was exposed in a public repository:
1. Go to Firebase Console → Project Settings
2. Find your web app configuration
3. Click **"Regenerate key"**
4. Update your `.env` file with the new key

### 5. Never Commit .env Files
The `.env` file is already in `.gitignore` and will not be committed to version control.

## Firebase Security Rules
Make sure your Firestore rules are properly configured in `firestore.rules` to prevent unauthorized access.

## Additional Security Measures
- Use Firebase App Check for additional security
- Implement proper user authentication flows
- Regularly rotate API keys
- Monitor Firebase usage for unusual activity
