import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import MyBindersScreen from './src/screens/MyBindersScreen';
import BinderViewScreen from './src/screens/BinderViewScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import FriendBindersScreen from './src/screens/FriendBindersScreen';
import TradeScreen from './src/screens/TradeScreen';

// Import auth store
import { useAuthStore } from './src/state/useAuthStore';

// Import notification service
import { NotificationService } from './src/lib/notificationService';
import * as Notifications from 'expo-notifications';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  MyBinders: undefined;
  BinderView: { binderId: string; ownerId: string; ownerName: string };
  Friends: undefined;
  FriendBinders: { friendId: string; friendName: string };
  Trade: { tradeId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const { user, initialized, initializeAuth } = useAuthStore();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return unsubscribe;
  }, [initializeAuth]);

  // Initialize notification listeners
  useEffect(() => {
    // Request permissions when app starts
    const initNotifications = async () => {
      if (user) {
        // Request permissions for local notifications
        // Push notifications require development build, not Expo Go
        await NotificationService.requestPermissions();
      }
    };

    initNotifications();

    // Listener for notifications received while app is in foreground
    notificationListener.current = NotificationService.addNotificationReceivedListener(
      notification => {
        console.log('Notification received:', notification);
      }
    );

    // Listener for when user taps on notification
    responseListener.current = NotificationService.addNotificationResponseListener(
      response => {
        console.log('Notification response:', response);
        const data = response.notification.request.content.data;
        
        // Handle navigation based on notification type
        // This will be expanded when we have proper navigation context
      }
    );

    return () => {
      if (notificationListener.current) {
        NotificationService.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        NotificationService.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user]);

  if (!initialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: true,
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      >
        {user ? (
          // User is signed in
          <>
            <Stack.Screen 
              name="Home" 
              component={HomeScreen} 
              options={{ title: 'MTG Binder' }}
            />
            <Stack.Screen 
              name="MyBinders" 
              component={MyBindersScreen} 
              options={{ title: 'My Binders' }}
            />
            <Stack.Screen 
              name="BinderView" 
              component={BinderViewScreen} 
              options={({ route }) => ({ 
                title: `${route.params.ownerName}'s Binder` 
              })}
            />
            <Stack.Screen 
              name="Friends" 
              component={FriendsScreen} 
              options={{ title: 'Friends' }}
            />
            <Stack.Screen 
              name="FriendBinders" 
              component={FriendBindersScreen} 
              options={({ route }) => ({ 
                title: `${route.params.friendName}'s Binders` 
              })}
            />
            <Stack.Screen 
              name="Trade" 
              component={TradeScreen} 
              options={{ title: 'Trade Session' }}
            />
          </>
        ) : (
          // User is not signed in
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
});