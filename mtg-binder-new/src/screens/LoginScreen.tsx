import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Layout, Text, Button, Input, Card, Spinner, Select, SelectItem, IndexPath } from '@ui-kitten/components';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../state/useAuthStore';
import { COUNTRIES } from '../lib/countries';
import AlertModal from '../components/AlertModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedCountryIndex, setSelectedCountryIndex] = useState<IndexPath | IndexPath[]>(new IndexPath(0));
  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  
  const { 
    user, 
    loading, 
    initialized, 
    signInWithEmail, 
    signUpWithEmail, 
    signInWithGoogle, 
    signInWithFacebook, 
    signOut,
    initializeAuth 
  } = useAuthStore();

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return unsubscribe;
  }, [initializeAuth]);

  useEffect(() => {
    if (initialized && user) {
      navigation.replace('Home');
    }
  }, [initialized, user, navigation]);

  const showAlertModal = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setShowAlert(true);
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      showAlertModal('Error', 'Please fill in all fields');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      showAlertModal('Error', 'Passwords do not match');
      return;
    }

    try {
      if (isLogin) {
        await signInWithEmail(email.trim(), password);
      } else {
        const country = Array.isArray(selectedCountryIndex) 
          ? COUNTRIES[selectedCountryIndex[0].row] 
          : COUNTRIES[selectedCountryIndex.row];
        await signUpWithEmail(email.trim(), password, country);
      }
    } catch (error: any) {
      showAlertModal('Error', error.message || 'Authentication failed');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      showAlertModal('Error', error.message || 'Google sign-in failed');
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      await signInWithFacebook();
    } catch (error: any) {
      showAlertModal('Error', error.message || 'Facebook sign-in failed');
    }
  };

  if (!initialized) {
    return (
      <Layout style={styles.loadingContainer}>
        <Spinner size="large" status="primary" />
        <Text category="s1" appearance="hint" style={styles.loadingText}>Loading...</Text>
      </Layout>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Layout style={styles.content}>
          <Text category="h1" status="primary" style={styles.title}>MTG Binder</Text>
          <Text category="s1" appearance="hint" style={styles.subtitle} center>
            Share your Magic: The Gathering collection with friends and trade cards digitally
          </Text>

          {/* Email/Password Form */}
          <Card style={styles.formContainer}>
            <Text category="h5" style={styles.formTitle} center>
              {isLogin ? 'Sign In' : 'Create Account'}
            </Text>
            
            <Input
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              disabled={loading}
            />
            
            <Input
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              disabled={loading}
            />
            
            {!isLogin && (
              <>
                <Input
                  style={styles.input}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  disabled={loading}
                />
                
                <Select
                  style={styles.input}
                  placeholder="Select Country"
                  selectedIndex={selectedCountryIndex}
                  onSelect={(index) => setSelectedCountryIndex(index)}
                  value={Array.isArray(selectedCountryIndex) 
                    ? COUNTRIES[selectedCountryIndex[0].row] 
                    : COUNTRIES[selectedCountryIndex.row]}
                  disabled={loading}
                >
                  {COUNTRIES.map((country, index) => (
                    <SelectItem key={index} title={country} />
                  ))}
                </Select>
              </>
            )}
            
            <Button
              style={styles.button}
              status="primary"
              size="large"
              onPress={handleEmailAuth}
              disabled={loading}
              accessoryLeft={loading ? () => <Spinner size="small" status="control" /> : undefined}
            >
              {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
            
            <Button
              appearance="ghost"
              status="primary"
              size="small"
              style={styles.switchButton}
              onPress={() => setIsLogin(!isLogin)}
              disabled={loading}
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </Button>
          </Card>

          {/* Social Sign-In */}
          <Layout style={styles.socialContainer}>
            <Text category="s1" appearance="hint" style={styles.socialTitle} center>Or continue with</Text>
            
            <Button
              style={styles.button}
              status="danger"
              size="large"
              onPress={handleGoogleSignIn}
              disabled={loading}
              accessoryLeft={() => <Feather name="search" size={20} color="#FFFFFF" />}
            >
              Sign in with Google
            </Button>
            
            <Button
              style={styles.button}
              status="info"
              size="large"
              onPress={handleFacebookSignIn}
              disabled={loading}
            >
              📘 Sign in with Facebook
            </Button>
          </Layout>

          <Text category="s1" appearance="hint" style={styles.description} center>
            Create digital binders, share with friends, and trade cards without the hassle of physical binders!
          </Text>
        </Layout>
      </ScrollView>
      
      <AlertModal
        visible={showAlert}
        title={alertTitle}
        message={alertMessage}
        type="danger"
        onClose={() => setShowAlert(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    marginBottom: 10,
  },
  subtitle: {
    marginBottom: 30,
    lineHeight: 24,
  },
  formContainer: {
    width: '100%',
    marginBottom: 30,
    padding: 20,
  },
  formTitle: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginBottom: 15,
  },
  switchButton: {
    marginTop: 10,
  },
  socialContainer: {
    width: '100%',
    marginBottom: 30,
  },
  socialTitle: {
    marginBottom: 20,
  },
  description: {
    lineHeight: 20,
  },
});