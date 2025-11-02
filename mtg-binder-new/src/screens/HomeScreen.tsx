import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View } from 'react-native';
import { Layout, Text, Button, Card } from '@ui-kitten/components';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../state/useAuthStore';
import ConfirmModal from '../components/ConfirmModal';
import AlertModal from '../components/AlertModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { user, signOut } = useAuthStore();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const handleSignOut = async () => {
    setShowSignOutConfirm(true);
  };

  const confirmSignOut = async () => {
    setShowSignOutConfirm(false);
    try {
      await signOut();
    } catch (error) {
      setAlertTitle('Error');
      setAlertMessage('Failed to sign out');
      setShowAlert(true);
    }
  };

  const showAlertModal = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setShowAlert(true);
  };

  return (
    <Layout style={styles.container}>
      <ScrollView>
        <Layout style={styles.content}>
          <Layout style={styles.header} level="2">
            <Layout style={styles.headerTextContainer}>
              <Text category="h2" style={styles.welcome}>Welcome to MTG Binder!</Text>
              <Text category="s1" status="success" style={styles.userEmail}>{user?.email}</Text>
            </Layout>
            <Button 
              status="danger" 
              size="small"
              onPress={handleSignOut}
              style={styles.signOutButton}
            >
              Sign Out
            </Button>
          </Layout>
          
          <Text category="s1" appearance="hint" style={styles.description} center>
            Your digital Magic: The Gathering collection manager
          </Text>
          
          <View style={styles.menuContainer}>
            <Button
              appearance="filled"
              status="primary"
              size="large"
              style={styles.menuItemButton}
              onPress={() => navigation.navigate('MyBinders')}
            >
              📚 My Binders
            </Button>
            
            <Button
              appearance="filled"
              status="primary"
              size="large"
              style={styles.menuItemButton}
              onPress={() => navigation.navigate('Friends')}
            >
              👥 Friends
            </Button>
            
            <Button
              appearance="filled"
              status="primary"
              size="large"
              style={styles.menuItemButton}
              onPress={() => navigation.navigate('Trade')}
            >
              🔄 Trades
            </Button>
            
            <Button
              appearance="filled"
              status="info"
              size="large"
              style={styles.menuItemButton}
              onPress={() => navigation.navigate('Profile')}
            >
              👤 Profile
            </Button>
          </View>
          
          <Card style={styles.featuresContainer}>
            <Text category="h5" style={styles.featuresTitle} center>Features</Text>
            <Layout style={styles.featureItem}>
              <Text category="h4" style={styles.featureIcon}>📱</Text>
              <Text category="s1" style={styles.featureText}>
                Digital binders with 9-pocket pages
              </Text>
            </Layout>
            <Layout style={styles.featureItem}>
              <Text category="h4" style={styles.featureIcon}>🔍</Text>
              <Text category="s1" style={styles.featureText}>Real-time card pricing</Text>
            </Layout>
            <Layout style={styles.featureItem}>
              <Text category="h4" style={styles.featureIcon}>👥</Text>
              <Text category="s1" style={styles.featureText}>Share collections with friends</Text>
            </Layout>
            <Layout style={styles.featureItem}>
              <Text category="h4" style={styles.featureIcon}>🔄</Text>
              <Text category="s1" style={styles.featureText}>Digital trade negotiations</Text>
            </Layout>
          </Card>
        </Layout>
      </ScrollView>
      
      <ConfirmModal
        visible={showSignOutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        cancelText="Cancel"
        confirmStatus="danger"
        onConfirm={confirmSignOut}
        onCancel={() => setShowSignOutConfirm(false)}
      />
      
      <AlertModal
        visible={showAlert}
        title={alertTitle}
        message={alertMessage}
        type="danger"
        onClose={() => setShowAlert(false)}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: 16,
    marginBottom: 20,
    borderRadius: 8,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  welcome: {
    marginBottom: 5,
  },
  userEmail: {
    marginTop: 4,
  },
  signOutButton: {
    marginLeft: 10,
  },
  description: {
    marginBottom: 30,
  },
  menuContainer: {
    marginBottom: 30,
  },
  menuItemButton: {
    marginBottom: 15,
  },
  featuresContainer: {
    padding: 20,
  },
  featuresTitle: {
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    flex: 1,
  },
});
