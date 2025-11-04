# Step-by-Step Publishing Guide for MTG Binder App

Follow these steps in order to publish your app to the app stores.

---

## PREPARATION PHASE

### Step 1: Create Required Accounts

#### 1.1 Expo Account (Free)
1. Go to https://expo.dev
2. Click "Sign Up" (you can use GitHub, Google, or email)
3. Complete the signup process
4. Verify your email if needed

#### 1.2 Apple Developer Account (For iOS - $99/year)
1. Go to https://developer.apple.com
2. Click "Account" → "Enroll"
3. Follow the enrollment process
4. Pay the $99 annual fee
5. Wait for approval (usually 24-48 hours)

#### 1.3 Google Play Developer Account (For Android - $25 one-time)
1. Go to https://play.google.com/console
2. Click "Get Started"
3. Pay the $25 one-time registration fee
4. Complete your developer profile

---

### Step 2: Install EAS CLI

Open your terminal/command prompt and run:

```bash
npm install -g eas-cli
```

**Verify installation:**
```bash
eas --version
```

You should see a version number (e.g., 5.0.0 or higher).

---

### Step 3: Login to Expo

```bash
eas login
```

This will:
- Open a browser window
- Ask you to authorize the CLI
- Log you into your Expo account

**Verify login:**
```bash
eas whoami
```

You should see your username/email.

---

### Step 4: Navigate to Your Project

```bash
cd mtg-binder-new
```

---

### Step 5: Configure EAS Build

```bash
eas build:configure
```

This will:
- Ask if you want to create a new project or link to existing
- Choose "Create a new project" (or "Link to existing" if you have one)
- Create/update `eas.json`
- Generate a project ID and add it to `app.json`

**What happens:**
- EAS will ask: "Would you like to create a new project?"
- Answer: `y` (yes)
- Project name will be suggested (you can use the default or customize)

---

## BUILDING YOUR APP

### Step 6: Build for Android (Preview/Testing First)

**Build an APK for testing:**
```bash
eas build --platform android --profile preview
```

**What happens:**
- EAS will ask: "Would you like to create a new Android build?"
- Answer: `y`
- EAS will start building your app in the cloud
- You'll get a build ID
- Build typically takes 10-20 minutes

**Monitor the build:**
- You can check progress at https://expo.dev/accounts/[your-username]/builds
- Or run: `eas build:list` to see status

**Download when complete:**
- Go to the Expo dashboard
- Click on your build
- Download the APK file
- Install on your Android device to test

---

### Step 7: Build for Android Production (Play Store)

Once you've tested the preview build:

```bash
eas build --platform android --profile production
```

**This creates an AAB (Android App Bundle) file for Play Store submission.**

**Notes:**
- AAB is required for Play Store (not APK)
- This build will take 10-20 minutes
- Download the AAB file when ready

---

### Step 8: Build for iOS (App Store)

```bash
eas build --platform ios --profile production
```

**First time setup:**
- EAS will ask about credentials
- Choose "Set up credentials" (recommended)
- EAS will automatically handle:
  - Bundle identifier setup
  - Provisioning profiles
  - Certificates

**You'll need:**
- Apple Developer account (from Step 1.2)
- Your Apple ID password (may be asked)

**What happens:**
- EAS manages iOS certificates automatically
- Build takes 15-30 minutes
- You'll get an IPA file or it will be uploaded to App Store Connect

---

## SUBMITTING TO GOOGLE PLAY STORE

### Step 9: Create App in Google Play Console

1. **Go to Play Console:**
   - Visit https://play.google.com/console
   - Sign in with your Google account

2. **Create New App:**
   - Click "Create app" button
   - Fill in:
     - **App name:** MTG Binder
     - **Default language:** English (United States)
     - **App or game:** App
     - **Free or paid:** Free
     - **Privacy Policy:** (You'll need a URL - see Step 10)
   - Click "Create app"

3. **Complete Store Listing:**
   - Go to "Store presence" → "Main store listing"
   - Fill in:
     - **Short description:** (80 characters max)
       Example: "Digital MTG card collection manager. Share binders with friends and trade cards."
     - **Full description:** (4000 characters max)
       Example: 
       ```
       MTG Binder is a digital Magic: The Gathering card collection manager that allows you to:
       
       • Create digital binders with 9-pocket pages
       • Import cards from DelverLens CSV exports
       • Get real-time card pricing from Scryfall
       • Share your collection with friends
       • Request and manage trades digitally
       • Track card conditions and finishes
       
       Perfect for collectors who want to manage their MTG collection digitally without physical binders.
       ```
     - **App icon:** Upload 512x512px icon
     - **Feature graphic:** 1024x500px image
     - **Screenshots:** 
       - Phone: At least 2 screenshots (recommended: 4-8)
       - Tablet: Optional but recommended
     - **Contact details:**
       - Email address
       - Phone number (optional)
       - Website (optional)

---

### Step 10: Create Privacy Policy

**Required for both stores!**

You can:
1. Create a simple HTML page with your privacy policy
2. Host it on GitHub Pages (free)
3. Or use a service like https://www.privacypolicygenerator.info

**Minimum requirements:**
- What data you collect (email, card collections)
- How you use it (authentication, app functionality)
- Third-party services (Firebase, Scryfall)
- User rights (data deletion, account deletion)

**Example structure:**
```
Privacy Policy for MTG Binder

1. Information We Collect
   - Email address (for account creation)
   - Card collection data (stored locally and in Firebase)
   
2. How We Use Information
   - Account authentication
   - App functionality
   - Cloud storage of collections
   
3. Third-Party Services
   - Firebase (authentication and database)
   - Scryfall API (card images and pricing)
   
4. Data Security
   - All data encrypted in transit
   - Firebase security rules in place
   
5. User Rights
   - Delete account and data
   - Request data export
   
Contact: [your-email@example.com]
```

---

### Step 11: Complete App Content in Play Console

1. **Go to "App content" section:**

2. **Privacy Policy:**
   - Click "Privacy Policy"
   - Enter your privacy policy URL
   - Click "Save"

3. **Content Rating:**
   - Click "Content rating"
   - Complete the questionnaire:
     - App category: Games/Entertainment
     - Does it contain: No (for MTG cards)
     - Age rating: Everyone
   - Submit for rating

4. **Data Safety:**
   - Click "Data safety"
   - Answer questions about data collection
   - For MTG Binder:
     - User data collected: Email, Collections
     - Data shared: No (unless you share with friends)
     - Data encrypted: Yes
   - Save

---

### Step 12: Upload AAB to Play Console

**Option A: Using EAS CLI (Recommended)**
```bash
eas submit --platform android
```

**What happens:**
- EAS will ask for your Google Play credentials
- You can create a service account or use manual upload
- EAS uploads the AAB automatically

**Option B: Manual Upload**
1. Go to Play Console → Your App → "Production" → "Create new release"
2. Click "Upload" under "App bundles and APKs"
3. Upload your AAB file (from Step 7)
4. Add release notes (e.g., "Initial release - MVP version 1.0.0")
5. Click "Save"
6. Click "Review release"

---

### Step 13: Review and Submit to Play Store

1. **Review all sections:**
   - Store listing complete
   - App content complete
   - Content rating done
   - Data safety form filled

2. **Submit for Review:**
   - Go to "Production" → "Review release"
   - Click "Start rollout to Production"
   - Confirm submission

3. **Wait for Review:**
   - Google typically reviews within 1-3 days
   - You'll get email notifications about status
   - Check status in Play Console

---

## SUBMITTING TO APPLE APP STORE

### Step 14: Create App in App Store Connect

1. **Go to App Store Connect:**
   - Visit https://appstoreconnect.apple.com
   - Sign in with your Apple Developer account

2. **Create New App:**
   - Click "My Apps" → "+" button
   - Fill in:
     - **Platform:** iOS
     - **Name:** MTG Binder
     - **Primary Language:** English (U.S.)
     - **Bundle ID:** com.mtgbinder.app (must match app.json)
     - **SKU:** mtg-binder-001 (unique identifier)
   - Click "Create"

---

### Step 15: Complete App Information

1. **App Information:**
   - **Category:** Games → Entertainment
   - **Privacy Policy URL:** (same as Step 10)
   - **Subtitle:** (optional, 30 characters)
     Example: "Digital MTG Collection Manager"

2. **Pricing and Availability:**
   - **Price:** Free
   - **Availability:** All countries (or select specific)

---

### Step 16: Complete App Store Listing

1. **Go to "App Store" tab:**

2. **Fill in Version Information:**
   - **Name:** MTG Binder
   - **Subtitle:** Digital MTG Collection Manager
   - **Promotional Text:** (optional, 170 characters)
   - **Description:** (same as Google Play, up to 4000 characters)
   - **Keywords:** mtg, magic, cards, collection, trading, binder
   - **Support URL:** (your website or GitHub)
   - **Marketing URL:** (optional)
   - **Privacy Policy URL:** (required)

3. **Screenshots:**
   - **iPhone 6.5" Display:** 1290 x 2796 pixels (at least 1, up to 10)
   - **iPhone 5.5" Display:** 1242 x 2208 pixels (optional)
   - **iPad Pro 12.9":** 2048 x 2732 pixels (optional but recommended)
   
   **Tip:** Take screenshots showing:
   - Login screen
   - Home screen
   - Binder view
   - Trade screen
   - Friends screen

4. **App Preview Video:** (optional but recommended)
   - Up to 30 seconds
   - Shows app functionality

5. **App Icon:** (1024x1024px, no transparency)
   - Upload your app icon

---

### Step 17: Complete App Review Information

1. **Go to "App Review" tab:**

2. **Fill in:**
   - **Contact Information:**
     - First name, Last name
     - Phone number
     - Email address
   - **Demo Account:**
     - Create a test account for reviewers
     - Email: reviewer@mtgbinder.com (example)
     - Password: (test password)
   - **Notes:**
     - Add any special instructions for reviewers
     - Example: "This is a digital card collection app. Please use the provided demo account to test functionality."

---

### Step 18: Submit Build to App Store

**Option A: Using EAS CLI (Recommended)**
```bash
eas submit --platform ios
```

**What happens:**
- EAS will ask for App Store Connect credentials
- You can use App Store Connect API key
- Or provide your Apple ID credentials
- EAS uploads the build automatically

**Option B: Manual Upload via Transporter**
1. Download "Transporter" app from Mac App Store (Mac only)
2. Open Transporter
3. Drag your IPA file into Transporter
4. Click "Deliver"
5. Wait for upload to complete

---

### Step 19: Select Build in App Store Connect

1. **Go to App Store Connect:**
   - Navigate to your app
   - Go to "TestFlight" or "App Store" tab
   - Wait for build to process (can take 10-30 minutes)

2. **Once build appears:**
   - Go to "App Store" → "Version [1.0]"
   - Under "Build" section, click "+"
   - Select your build
   - Click "Done"

---

### Step 20: Submit for Review

1. **Complete all sections:**
   - ✅ App Information
   - ✅ App Store Listing
   - ✅ Build selected
   - ✅ App Review Information

2. **Submit:**
   - Click "Submit for Review" button (top right)
   - Answer export compliance questions (usually "No" for most apps)
   - Confirm submission

3. **Wait for Review:**
   - Apple typically reviews within 1-3 days
   - You'll get email notifications
   - Check status in App Store Connect

---

## POST-SUBMISSION

### Step 21: Monitor Submissions

**Google Play:**
- Check Play Console → "Production" → Status
- Respond to any feedback quickly

**Apple App Store:**
- Check App Store Connect → "App Store" → Status
- If rejected, read feedback and fix issues

### Step 22: Prepare for Launch

While waiting for approval:
- Set up social media accounts (if desired)
- Prepare announcement posts
- Create landing page or website
- Prepare marketing materials

### Step 23: Celebrate! 🎉

Once approved:
- Your app will be live on the stores
- Share with friends and family
- Start collecting user feedback
- Plan your first update

---

## TROUBLESHOOTING

### Common Issues:

**Build fails:**
```bash
# Check build logs
eas build:view [build-id]

# Or check in Expo dashboard
```

**Credentials issues:**
```bash
# Manage credentials
eas credentials

# Reset credentials if needed
eas credentials --platform ios
eas credentials --platform android
```

**Missing assets:**
- Ensure all image files exist in `./assets/` folder
- Check file sizes and formats (PNG, no transparency for iOS icon)

**Version conflicts:**
- Update version in `app.json` before each new build
- Increment buildNumber (iOS) and versionCode (Android)

---

## QUICK COMMAND REFERENCE

```bash
# Login
eas login

# Configure
eas build:configure

# Build Android (testing)
eas build --platform android --profile preview

# Build Android (production)
eas build --platform android --profile production

# Build iOS
eas build --platform ios --profile production

# Submit Android
eas submit --platform android

# Submit iOS
eas submit --platform ios

# Check builds
eas build:list

# View build details
eas build:view [build-id]
```

---

## CHECKLIST

Before submitting, make sure:

**App Configuration:**
- [ ] App name is correct
- [ ] Bundle identifiers are set
- [ ] Version numbers are correct
- [ ] All assets are in place

**Google Play:**
- [ ] Store listing complete
- [ ] Screenshots uploaded
- [ ] Privacy policy URL added
- [ ] Content rating completed
- [ ] Data safety form filled
- [ ] AAB uploaded

**Apple App Store:**
- [ ] App Store listing complete
- [ ] Screenshots uploaded (all sizes)
- [ ] Privacy policy URL added
- [ ] App review information filled
- [ ] Demo account created
- [ ] Build uploaded and selected

**Both Stores:**
- [ ] Privacy policy created and hosted
- [ ] Support email configured
- [ ] App description written
- [ ] Keywords optimized

---

Good luck with your launch! 🚀

If you encounter any issues, check the Expo documentation: https://docs.expo.dev

