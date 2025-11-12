import React, { useMemo, useState } from 'react';
import { StyleSheet, ScrollView, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Layout, Text, Button, Card } from '@ui-kitten/components';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../state/useAuthStore';
import ConfirmModal from '../components/ConfirmModal';
import AlertModal from '../components/AlertModal';
import { ScreenContainer } from '../components/ScreenContainer';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { user, signOut } = useAuthStore();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const { width } = useWindowDimensions();

  const layoutStyles = useMemo(
    () => ({
      header: [
        styles.header,
        width < 480 && styles.headerStacked,
      ],
      headerButtons: [
        styles.headerButtons,
        width < 480 && styles.headerButtonsStacked,
      ],
    }),
    [width]
  );

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
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <Layout style={styles.content} level="1">
          <Layout style={layoutStyles.header} level="2">
            <Layout style={styles.headerTextContainer}>
              <Text category="h2" style={styles.welcome}>Welcome to MTG Binder!</Text>
              <Text category="s1" status="primary" style={styles.userEmail}>{user?.email}</Text>
            </Layout>
            <Layout style={layoutStyles.headerButtons}>
              <Button
                status="info"
                size="small"
                onPress={() => navigation.navigate('Profile')}
                style={styles.profileButton}
                accessoryLeft={() => <Feather name="user" size={18} color="#FFFFFF" />}
              >
                Profile
              </Button>
              <Button
                status="danger"
                size="small"
                onPress={handleSignOut}
                style={styles.signOutButton}
              >
                Sign Out
              </Button>
            </Layout>
          </Layout>
          
          <Text category="s1" appearance="hint" style={styles.description}>
            Your digital Magic: The Gathering collection manager
          </Text>
          
          <View style={styles.menuContainer}>
            <Button
              appearance="filled"
              status="primary"
              size="large"
              style={styles.menuItemButton}
              onPress={() => navigation.navigate('MyBinders')}
              accessoryLeft={() => <Feather name="book" size={20} color="#FFFFFF" />}
            >
              My Binders
            </Button>
            
            <Button
              appearance="filled"
              status="primary"
              size="large"
              style={styles.menuItemButton}
              onPress={() => navigation.navigate('Friends')}
              accessoryLeft={() => <Feather name="users" size={20} color="#FFFFFF" />}
            >
              Friends
            </Button>
            
            <Button
              appearance="filled"
              status="primary"
              size="large"
              style={styles.menuItemButton}
              onPress={() => navigation.navigate('Trade')}
              accessoryLeft={() => <Feather name="refresh-cw" size={20} color="#FFFFFF" />}
            >
              Trades
            </Button>
          </View>
          
          <Card style={styles.featuresContainer}>
            <Text category="h5" style={styles.featuresTitle} center>Features</Text>
            <Layout style={styles.featureItem} level="1">
              <Feather name="smartphone" size={32} color="#FF8610" />
              <Text category="s1" style={styles.featureText}>
                Digital binders with 9-pocket pages
              </Text>
            </Layout>
            <Layout style={styles.featureItem} level="1">
              <Feather name="search" size={32} color="#FF8610" />
              <Text category="s1" style={styles.featureText}>Real-time card pricing</Text>
            </Layout>
            <Layout style={styles.featureItem} level="1">
              <Feather name="users" size={32} color="#FF8610" />
              <Text category="s1" style={styles.featureText}>Share collections with friends</Text>
            </Layout>
            <Layout style={styles.featureItem} level="1">
              <Feather name="refresh-cw" size={32} color="#FF8610" />
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: 16,
    marginBottom: 20,
    borderRadius: 8,
    gap: 12,
  },
  headerStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
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
  headerButtons: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginLeft: 10,
    gap: 8,
  },
  headerButtonsStacked: {
    width: '100%',
    alignItems: 'stretch',
  },
  profileButton: {
    minWidth: 140,
  },
  signOutButton: {
    minWidth: 140,
  },
  description: {
    textAlign: 'center',
    marginBottom: 8,
  },
  menuContainer: {
    marginBottom: 12,
    gap: 12,
  },
  menuItemButton: {
    marginBottom: 0,
  },
  featuresContainer: {
    padding: 20,
    marginBottom: 12,
    borderRadius: 12,
  },
  featuresTitle: {
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    flex: 1,
  },
});
