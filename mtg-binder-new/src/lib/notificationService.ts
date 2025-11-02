import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type: 'friend_request' | 'friend_accepted' | 'trade_request' | 'trade_update' | 'trade_accepted' | 'trade_declined';
  userId?: string;
  friendId?: string;
  friendName?: string;
  tradeId?: string;
  cardCount?: number;
  [key: string]: any;
}

export class NotificationService {
  // Request notification permissions
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Notification permissions denied');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Get the device push token
  static async getPushToken(): Promise<string | null> {
    try {
      const permissionsGranted = await this.requestPermissions();
      if (!permissionsGranted) {
        return null;
      }

      // For now, we'll use local notifications
      // To implement push notifications, you'll need to:
      // 1. Get Expo project ID or configure FCM
      // 2. Get token from Notifications.getExpoPushTokenAsync()
      // 3. Store token in Firebase for sending push notifications
      
      console.log('Notification permissions granted - local notifications ready');
      return 'local-only';
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // Schedule a local notification
  static async scheduleLocalNotification(
    title: string,
    body: string,
    data?: NotificationData,
    seconds: number = 0
  ): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Cannot schedule notification: permissions not granted');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: seconds > 0 ? { seconds } : null, // null means show immediately
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  // Cancel all notifications
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }

  // Get all scheduled notifications
  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Add notification received listener
  static addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  // Add notification response listener (when user taps notification)
  static addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Remove notification listener
  static removeNotificationSubscription(
    subscription: Notifications.Subscription
  ): void {
    // The subscription object has a remove() method
    subscription.remove();
  }

  // Set notification badge count
  static async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  // Clear notification badge
  static async clearBadge(): Promise<void> {
    await this.setBadgeCount(0);
  }

  // Helper method to format friend request notification
  static async notifyFriendRequest(friendName: string, friendId: string): Promise<void> {
    await this.scheduleLocalNotification(
      'New Friend Request',
      `${friendName} wants to be your friend`,
      {
        type: 'friend_request',
        friendId,
        friendName,
      }
    );
  }

  // Helper method to format friend accepted notification
  static async notifyFriendAccepted(friendName: string, friendId: string): Promise<void> {
    await this.scheduleLocalNotification(
      'Friend Request Accepted',
      `${friendName} accepted your friend request`,
      {
        type: 'friend_accepted',
        friendId,
        friendName,
      }
    );
  }

  // Helper method to format trade request notification
  static async notifyTradeRequest(friendName: string, tradeId: string, cardCount: number): Promise<void> {
    const cardText = cardCount === 1 ? 'card' : 'cards';
    await this.scheduleLocalNotification(
      'New Trade Request',
      `${friendName} wants to trade ${cardCount} ${cardText} with you`,
      {
        type: 'trade_request',
        friendName,
        tradeId,
        cardCount,
      }
    );
  }

  // Helper method to format trade accepted notification
  static async notifyTradeAccepted(friendName: string, tradeId: string): Promise<void> {
    await this.scheduleLocalNotification(
      'Trade Accepted',
      `${friendName} accepted your trade request`,
      {
        type: 'trade_accepted',
        friendName,
        tradeId,
      }
    );
  }

  // Helper method to format trade declined notification
  static async notifyTradeDeclined(friendName: string, tradeId: string): Promise<void> {
    await this.scheduleLocalNotification(
      'Trade Declined',
      `${friendName} declined your trade request`,
      {
        type: 'trade_declined',
        friendName,
        tradeId,
      }
    );
  }
}

