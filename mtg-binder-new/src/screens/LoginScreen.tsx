import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  
  const { 
    user, 
    loading, 
    initialized, 
    signInWithEmail, 
    signUpWithEmail, 
    sendPasswordResetEmail,
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

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      showAlertModal('Error', 'Please enter your email address');
      return;
    }

    try {
      await sendPasswordResetEmail(resetEmail.trim());
      showAlertModal('Success', 'Password reset email sent! Please check your inbox and follow the instructions to reset your password.');
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error: any) {
      showAlertModal('Error', error.message || 'Failed to send password reset email');
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
            
            {isLogin && (
              <Button
                appearance="ghost"
                status="basic"
                size="small"
                style={styles.forgotPasswordButton}
                onPress={() => setShowForgotPassword(true)}
                disabled={loading}
              >
                Forgot Password?
              </Button>
            )}
            
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

          <Text category="s1" appearance="hint" style={styles.description} center>
            Create digital binders, share with friends, and trade cards without the hassle of physical binders!
          </Text>
          </Layout>
        </ScrollView>
        
        <AlertModal
          visible={showAlert}
          title={alertTitle}
          message={alertMessage}
          type={alertTitle === 'Success' ? 'success' : 'danger'}
          onClose={() => setShowAlert(false)}
        />

        {/* Forgot Password Modal */}
        <Modal
          visible={showForgotPassword}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowForgotPassword(false)}
        >
          <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
            <Layout style={styles.modalContent}>
              <Layout style={styles.modalHeader} level="2">
                <Button
                  appearance="ghost"
                  status="basic"
                  size="small"
                  onPress={() => {
                    setShowForgotPassword(false);
                    setResetEmail('');
                  }}
                >
                  Cancel
                </Button>
                <Text category="h6" style={styles.modalTitle}>Reset Password</Text>
                <Layout style={styles.modalHeaderSpacer} />
              </Layout>

              <Layout style={styles.modalBody}>
                <Text category="s1" appearance="hint" style={styles.modalDescription} center>
                  Enter your email address and we'll send you a link to reset your password.
                </Text>

                <Input
                  style={styles.input}
                  placeholder="Email"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  disabled={loading}
                />

                <Button
                  style={styles.button}
                  status="primary"
                  size="large"
                  onPress={handleForgotPassword}
                  disabled={loading}
                  accessoryLeft={loading ? () => <Spinner size="small" status="control" /> : undefined}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </Layout>
            </Layout>
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 10,
    marginTop: -5,
  },
  description: {
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    flex: 1,
    textAlign: 'center',
    marginBottom: 0,
  },
  modalHeaderSpacer: {
    width: 60,
  },
  modalBody: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  modalDescription: {
    marginBottom: 30,
    lineHeight: 20,
  },
});