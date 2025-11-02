# Quick Start: Testing Notifications

## 🚀 Ready to Test!

All notification features have been implemented. Here's how to run the app and test:

## Starting the App

### Option 1: From Root Directory
```bash
cd mtg-binder-new
npm start
```

### Option 2: Already in mtg-binder-new
```bash
npm start
```

### Then Choose Your Device:
- **Physical Device**: Scan QR code with Expo Go app
- **Android Emulator**: Press `a`
- **iOS Simulator**: Press `i`

## First Test: Check if It Works

1. **Launch the app** → Wait for permission dialog
2. **Allow notifications** when prompted
3. **Look for the 🔔 Test Notifications button** on Home screen
4. **Tap it** → You should see a success alert
5. **Check your notification tray** → You should see: "🎉 MTG Binder - Notifications are working!"

If you see the notification, **✅ SUCCESS!** The system is working.

## Testing Real Friend Flow

Want to test the actual feature?

1. Have two accounts ready (or create test accounts)
2. As **User A**: Send friend request to **User B**
3. As **User B**: Accept the friend request
4. **User A should receive notification**: "Friend Request Accepted"

This is the real-world notification flow!

## What's Been Implemented

✅ **Notification Service**: Complete service with all methods  
✅ **Permission Handling**: Auto-requests on app launch  
✅ **Local Notifications**: Immediate and scheduled  
✅ **Friend Notifications**: Triggers on friend accepted  
✅ **App Integration**: Listeners in main App component  
✅ **Test Button**: Easy way to verify it works  
✅ **Badge Support**: Can show badge counts  

## Files to Check

### New Files Created:
- `src/lib/notificationService.ts` - Main notification service
- `src/lib/testNotifications.ts` - Test utilities
- `NOTIFICATIONS.md` - Full documentation
- `TESTING_NOTIFICATIONS.md` - Detailed testing guide
- `QUICK_START_TESTING.md` - This file

### Modified Files:
- `App.tsx` - Added notification listeners
- `app.json` - Added notification config
- `package.json` - Added expo-notifications
- `src/lib/friendsService.ts` - Added notification triggers
- `src/screens/HomeScreen.tsx` - Added test button

## Common Issues

**"No permission dialog"**  
→ Go to Settings → App → Permissions → Enable Notifications

**"Button doesn't work"**  
→ Check console for errors, make sure app fully loaded

**"Notification appears in app but not in tray"**  
→ Check Do Not Disturb mode, battery optimization settings

**"React Native errors"**  
→ Try: `npm install` then restart Metro bundler

## Next Steps

Once basic testing works:

1. ✅ Remove test button from HomeScreen (optional)
2. ✅ Add more notification types (trades, etc.)
3. ✅ Implement deep linking
4. ✅ Set up push notifications (cloud)
5. ✅ Add notification settings screen

## Need Help?

Check these files:
- `TESTING_NOTIFICATIONS.md` - Detailed troubleshooting
- `NOTIFICATIONS.md` - Technical documentation
- Console logs - Look for "Notification" keywords

## Summary

**What works now:**
- Local notifications ✅
- Permission requests ✅
- Friend accepted notifications ✅
- Foreground notifications ✅
- Badge management ✅

**What's planned:**
- Push notifications (cloud)
- Deep linking from notifications
- Notification preferences
- More notification types

---

**Ready to test?** Just run `npm start` and look for the 🔔 button!

