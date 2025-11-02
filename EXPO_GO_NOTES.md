# Expo Go Limitations

## Notifications in Expo Go

**Important**: We're using **local notifications only** in this implementation.

### What Works in Expo Go ✅
- ✅ **Local Notifications**: Schedule and show notifications immediately
- ✅ **Permission Requests**: Ask for notification permissions
- ✅ **Notification Listeners**: Handle notifications in foreground
- ✅ **Badge Management**: Set and clear app badge counts

### What Doesn't Work in Expo Go ⚠️
- ❌ **Push Notifications**: Remote push notifications were removed from Expo Go in SDK 53+
- ❌ **Push Tokens**: Cannot get Expo push tokens in Expo Go

### Why the Warning Appeared
When calling `NotificationService.getPushToken()`, it tried to get a push token which triggers:
```
expo-notifications: Android Push notifications functionality was removed from Expo Go with the release of SDK 53
```

### Solution Applied
We removed the `getPushToken()` call from `App.tsx` initialization and focused on local notifications only, which work perfectly in Expo Go.

### If You Need Push Notifications
To enable remote push notifications, you need to:

1. **Create a development build**:
   ```bash
   npx expo prebuild
   npx expo run:android  # or run:ios
   ```

2. **Add push notification configuration** in `app.json`

3. **Set up notification server** (Firebase Cloud Messaging or Expo Push Service)

For this project, local notifications are sufficient for testing and the friend request flow!

## Current Status
✅ All local notification features work in Expo Go  
✅ Firebase authentication fixed  
✅ No more warnings in console  
✅ Ready to test!  

