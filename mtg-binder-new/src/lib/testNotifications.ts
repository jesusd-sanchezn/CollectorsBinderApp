// Test notification functions for development
import { NotificationService } from './notificationService';

/**
 * Test all notification functionality
 * Call this from the app to verify notifications work
 */
export async function testAllNotifications() {
  console.log('🧪 Testing notification system...');

  // Test 1: Check permissions
  console.log('Test 1: Checking permissions...');
  const hasPermission = await NotificationService.requestPermissions();
  console.log(`✅ Permissions granted: ${hasPermission}`);

  if (!hasPermission) {
    console.error('❌ Permissions not granted. Cannot test further.');
    return;
  }

  // Test 2: Schedule immediate notification
  console.log('Test 2: Scheduling immediate notification...');
  await NotificationService.scheduleLocalNotification(
    '🧪 Test Notification',
    'This is a test notification from the MTG Binder app!',
    { type: 'test', timestamp: Date.now() }
  );
  console.log('✅ Test notification scheduled');

  // Test 3: Friend request notification
  console.log('Test 3: Testing friend request notification...');
  await NotificationService.notifyFriendRequest('Test Friend', 'test-friend-id');
  console.log('✅ Friend request notification scheduled');

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 4: Friend accepted notification
  console.log('Test 4: Testing friend accepted notification...');
  await NotificationService.notifyFriendAccepted('Test Friend', 'test-friend-id');
  console.log('✅ Friend accepted notification scheduled');

  // Test 5: Badge count
  console.log('Test 5: Testing badge count...');
  await NotificationService.setBadgeCount(5);
  console.log('✅ Badge count set to 5');
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));

  await NotificationService.clearBadge();
  console.log('✅ Badge cleared');

  console.log('🎉 All notification tests completed! Check your device for notifications.');
}

/**
 * Test a single immediate notification
 */
export async function testSimpleNotification() {
  const hasPermission = await NotificationService.requestPermissions();
  if (!hasPermission) {
    console.error('Permissions not granted');
    return;
  }

  await NotificationService.scheduleLocalNotification(
    '🎉 MTG Binder',
    'Notifications are working!',
    { type: 'test' }
  );
}

