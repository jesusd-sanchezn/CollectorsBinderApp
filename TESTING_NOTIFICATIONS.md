# Testing Notifications - Quick Guide

## 🧪 How to Test the Notification System

### Method 1: Using the Test Button (Easiest)

1. **Start the app**: 
   ```bash
   cd mtg-binder-new
   npm start
   ```

2. **Open on device/emulator**:
   - Press `a` for Android emulator
   - Press `i` for iOS simulator
   - Or scan QR code with Expo Go on your phone

3. **On first launch**, you'll see a permission dialog:
   - **Allow** notifications

4. **In the app**:
   - You should see the Home screen
   - Look for the **🔔 Test Notifications** button
   - Tap it

5. **Expected result**:
   - Alert: "Test notification sent! Check your notification tray."
   - Check your device's notification tray
   - You should see a notification: "🎉 MTG Binder - Notifications are working!"

### Method 2: Real Friend Request Flow

1. **Create two test accounts**:
   - Sign up with different emails
   - Or use existing accounts

2. **Add friend**:
   - Login as User A
   - Go to Friends screen
   - Add User B as a friend

3. **Accept friend request**:
   - Login as User B
   - Go to Friends screen
   - Accept User A's friend request

4. **Expected result**:
   - User A receives notification: "Friend Request Accepted - [User B] accepted your friend request"
   - Notification appears immediately in the notification tray

### Method 3: Using Console/Debugger

If you want to test more thoroughly:

1. Open the app
2. Use React Native debugger or console
3. Run:
   ```javascript
   import { testAllNotifications } from './src/lib/testNotifications';
   await testAllNotifications();
   ```

This will test:
- ✅ Permissions
- ✅ Immediate notification
- ✅ Friend request notification
- ✅ Friend accepted notification
- ✅ Badge count
- ✅ Badge clearing

## 🔍 What to Look For

### First Launch
- ✅ Permission dialog appears automatically
- ✅ Can grant or deny permissions
- ✅ App continues to work either way

### When Sending Test Notification
- ✅ Alert confirms notification sent
- ✅ Notification appears in device tray
- ✅ Icon shows in notification
- ✅ Can expand to see full message

### When Friend Accepts Request
- ✅ Notification appears within 1-2 seconds
- ✅ Title is descriptive
- ✅ Body shows friend's name
- ✅ Notification is tappable

### When App is in Foreground
- ✅ Notification still shows
- ✅ Doesn't get blocked
- ✅ Visible as alert or banner

### When App is in Background
- ✅ Notification appears in tray
- ✅ Badge count updates (if configured)
- ✅ Can tap to open app

## ⚠️ Troubleshooting

### No Permission Dialog Appearing
- **Solution**: Go to Settings → Apps → MTG Binder → Permissions → Enable Notifications
- Or uninstall and reinstall the app to reset permissions

### Notifications Not Showing
**Check:**
1. Permissions are granted (Settings → App → Notifications)
2. Do Not Disturb mode is off
3. Notifications aren't disabled for this app
4. Battery optimization isn't blocking notifications (Android)

### "Error: Failed to send notification"
**Check console for:**
- Permission errors
- Service initialization errors
- Expo notifications dependency issues

**Solutions:**
- Restart the app
- Clear app cache and restart
- Reinstall expo-notifications: `npm install expo-notifications`

### Test Button Not Working
- Check browser console or Metro bundler output for errors
- Ensure notification service imported correctly
- Verify `expo-notifications` is installed

## 📱 Platform-Specific Notes

### Android
- Notifications should work on emulator (API 25+)
- Icon and color configured in `app.json`
- May need to disable battery optimization

### iOS
- Works best on physical device
- Simulator may have limited notification support
- Must request permissions on first launch
- Check Settings → Notifications

### Expo Go
- Fully supported
- Real device works best
- Some limitations on older versions

## 📊 Expected Console Output

When testing, you should see:

```
Notification permissions granted - local notifications ready
✅ Permissions granted: true
Test 2: Scheduling immediate notification...
✅ Test notification scheduled
Test 3: Testing friend request notification...
✅ Friend request notification scheduled
Test 4: Testing friend accepted notification...
✅ Friend accepted notification scheduled
Test 5: Testing badge count...
✅ Badge count set to 5
✅ Badge cleared
🎉 All notification tests completed!
```

## ✅ Success Criteria

The notification system is working correctly if:

1. ✅ Permission dialog appears on first launch
2. ✅ Test button triggers a notification
3. ✅ Friend accepted notifications appear
4. ✅ Notifications show in foreground AND background
5. ✅ Notifications are tappable
6. ✅ Console shows no permission errors
7. ✅ App badge can be set and cleared

## 🚀 Next Steps After Testing

Once basic notifications work:

1. Test with real friend requests
2. Add more notification types (trades, etc.)
3. Implement deep linking from notifications
4. Set up push notifications for remote delivery
5. Add notification preferences screen

## 📝 Notes

- Notifications are **local** (device-based) for now
- **Push notifications** (from server) require additional setup
- Permissions are requested **once** per app install
- Notifications work even when app is **closed**
- Badge counts are **not persisted** across app restarts (yet)

