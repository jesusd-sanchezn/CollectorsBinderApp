// Import warning suppression first, before any other imports
import './src/lib/suppressNotificationsWarning';

import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as eva from '@eva-design/eva';
import { ApplicationProvider } from '@ui-kitten/components';
import { navigationRef } from './src/lib/navigationRef';

// Custom theme with orange primary color
const customTheme = {
  ...eva.dark,
  'color-primary-100': '#FFE6D1',
  'color-primary-200': '#FFC79E',
  'color-primary-300': '#FFA570',
  'color-primary-400': '#FF8F3D',
  'color-primary-500': '#FF8610',
  'color-primary-600': '#CC6B0D',
  'color-primary-700': '#99500A',
  'color-primary-800': '#663608',
  'color-primary-900': '#4D2906',
  'color-primary-transparent-100': 'rgba(255, 134, 16, 0.08)',
  'color-primary-transparent-200': 'rgba(255, 134, 16, 0.16)',
  'color-primary-transparent-300': 'rgba(255, 134, 16, 0.24)',
  'color-primary-transparent-400': 'rgba(255, 134, 16, 0.32)',
  'color-primary-transparent-500': 'rgba(255, 134, 16, 0.40)',
  'color-primary-transparent-600': 'rgba(255, 134, 16, 0.48)',
};

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import MyBindersScreen from './src/screens/MyBindersScreen';
import BinderViewScreen from './src/screens/BinderViewScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import FriendBindersScreen from './src/screens/FriendBindersScreen';
import TradeScreen from './src/screens/TradeScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Import auth store
import { useAuthStore } from './src/state/useAuthStore';

// Import notification service
import { NotificationService } from './src/lib/notificationService';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  MyBinders: undefined;
  BinderView: { binderId: string; ownerId: string; ownerName: string };
  Friends: undefined;
  FriendBinders: { friendId: string; friendName: string };
  Trade: undefined;
  Profile: undefined;
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
        if (data?.type === 'tradeRequest') {
          // Navigate to Trades screen
          if (navigationRef.isReady()) {
            navigationRef.navigate('Trade');
          }
        }
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
      <ApplicationProvider mapping={eva.mapping} theme={customTheme}>
        <SafeAreaProvider>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF8610" />
          </View>
        </SafeAreaProvider>
      </ApplicationProvider>
    );
  }

  return (
    <ApplicationProvider mapping={eva.mapping} theme={customTheme}>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <StatusBar style="light" />
          <Stack.Navigator 
            screenOptions={{ 
              headerShown: true,
              headerStyle: { backgroundColor: '#222B45' },
              headerTintColor: '#FFFFFF',
              headerTitleStyle: { fontWeight: 'bold' },
              contentStyle: { backgroundColor: '#1A1A1A' }
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
                options={{ title: 'Trades' }}
              />
              <Stack.Screen 
                name="Profile" 
                component={ProfileScreen} 
                options={{ title: 'Profile' }}
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
      </SafeAreaProvider>
    </ApplicationProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});