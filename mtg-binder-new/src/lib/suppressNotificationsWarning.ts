// Suppress Expo Go push notification warnings globally
// This file should be imported before any notification-related imports

const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  if (message.includes('expo-notifications') && 
      (message.includes('Expo Go') || 
       message.includes('SDK 53') || 
       message.includes('Android Push notifications') ||
       message.includes('remote notifications'))) {
    // Suppress this specific warning
    return;
  }
  originalWarn.apply(console, args);
};

console.error = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  if (message.includes('expo-notifications') && 
      (message.includes('Expo Go') || 
       message.includes('SDK 53') || 
       message.includes('Android Push notifications') ||
       message.includes('remote notifications'))) {
    // Suppress this specific error
    return;
  }
  originalError.apply(console, args);
};

