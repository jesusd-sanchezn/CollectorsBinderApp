# Publishing Guide for MTG Binder App

This guide will walk you through publishing your app to the Apple App Store and Google Play Store.

## Prerequisites

1. **Expo Account**: Sign up at https://expo.dev (free tier available)
2. **Apple Developer Account**: $99/year (required for iOS)
3. **Google Play Developer Account**: $25 one-time fee (required for Android)

## Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

## Step 2: Login to Expo

```bash
eas login
```

## Step 3: Configure Your Project

1. **Update app.json** (already done):
   - App name: "MTG Binder"
   - Bundle identifiers set
   - Version configured

2. **Link to Expo project**:
   ```bash
   cd mtg-binder-new
   eas build:configure
   ```
   
   This will:
   - Create/update `eas.json`
   - Generate a project ID (if not already set)
   - Update your `app.json` with the project ID

## Step 4: Prepare Assets

Make sure you have:
- ✅ App icon (1024x1024px PNG) at `./assets/icon.png`
- ✅ Splash screen at `./assets/splash-icon.png`
- ✅ Android adaptive icon at `./assets/adaptive-icon.png`

## Step 5: Build Your App

### For Android (APK - for testing):
```bash
eas build --platform android --profile preview
```

### For Android (AAB - for Play Store):
```bash
eas build --platform android --profile production
```

### For iOS (for App Store):
```bash
eas build --platform ios --profile production
```

**Note**: First iOS build will prompt you to set up credentials. Follow the prompts.

## Step 6: Download and Test

1. After the build completes, download the build from the Expo dashboard
2. Test on a physical device:
   - **Android**: Install the APK directly or upload AAB to Play Console for internal testing
   - **iOS**: Install via TestFlight (requires App Store Connect setup)

## Step 7: Submit to Stores

### Google Play Store:

1. **Create App in Play Console**:
   - Go to https://play.google.com/console
   - Create new app
   - Fill in app details, screenshots, description, etc.

2. **Upload AAB**:
   ```bash
   eas submit --platform android
   ```
   Or manually upload the AAB file from the Expo dashboard

3. **Complete Store Listing**:
   - App description
   - Screenshots (phone, tablet, TV if applicable)
   - Feature graphic
   - Privacy policy URL
   - Content rating

4. **Submit for Review**

### Apple App Store:

1. **Set up App Store Connect**:
   - Go to https://appstoreconnect.apple.com
   - Create new app
   - Fill in app information

2. **Submit Build**:
   ```bash
   eas submit --platform ios
   ```
   Or manually upload via Xcode or Transporter

3. **Complete Store Listing**:
   - App description
   - Screenshots for all device sizes
   - Privacy policy URL
   - Age rating questionnaire

4. **Submit for Review**

## Important Notes

### Firebase Configuration:
- Make sure your Firebase project is configured for production
- Update Firebase rules if needed
- Ensure all API keys are properly configured

### App Store Requirements:

**iOS:**
- Privacy policy URL (required)
- App description
- Screenshots (iPhone 6.5", 5.5", iPad Pro 12.9")
- Age rating

**Android:**
- Privacy policy URL (required in some regions)
- App description
- Screenshots (phone, tablet)
- Feature graphic (1024x500px)

### Version Updates:

When updating your app:
1. Update `version` in `app.json` (e.g., "1.0.1")
2. Update `buildNumber` (iOS) and `versionCode` (Android)
3. Rebuild and resubmit

## Quick Commands Reference

```bash
# Login to Expo
eas login

# Configure project
eas build:configure

# Build for Android (APK for testing)
eas build --platform android --profile preview

# Build for Android (AAB for Play Store)
eas build --platform android --profile production

# Build for iOS
eas build --platform ios --profile production

# Submit to Play Store
eas submit --platform android

# Submit to App Store
eas submit --platform ios

# Check build status
eas build:list

# View build logs
eas build:view [build-id]
```

## Troubleshooting

### Common Issues:

1. **Build fails**: Check the build logs in Expo dashboard
2. **Credentials error**: Run `eas credentials` to manage credentials
3. **Icon errors**: Ensure icons are proper size and format (PNG, no transparency for iOS)
4. **Firebase errors**: Verify Firebase config in production environment

## Next Steps After Publishing

1. Monitor crash reports (Expo provides crash reporting)
2. Collect user feedback
3. Plan updates and new features
4. Set up analytics (Firebase Analytics or similar)

Good luck with your launch! 🚀

