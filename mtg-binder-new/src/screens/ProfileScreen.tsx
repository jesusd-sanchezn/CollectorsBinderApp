import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, Alert } from 'react-native';
import { Layout, Text, Button, Input, Card, Spinner, Select, SelectItem, IndexPath } from '@ui-kitten/components';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../state/useAuthStore';
import { COUNTRIES } from '../lib/countries';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [country, setCountry] = useState('');
  const [selectedCountryIndex, setSelectedCountryIndex] = useState<IndexPath | IndexPath[]>(new IndexPath(0));
  const [email, setEmail] = useState('');

  const { getUserProfile, updateProfile } = useAuthStore();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profile = await getUserProfile();
      
      setDisplayName(profile.displayName || '');
      setEmail(profile.email || user?.email || '');
      setCountry(profile.country || '');
      
      // Find country index
      if (profile.country) {
        const countryIndex = COUNTRIES.findIndex(c => c === profile.country);
        if (countryIndex !== -1) {
          setSelectedCountryIndex(new IndexPath(countryIndex));
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }

    try {
      setSaving(true);
      const selectedCountry = Array.isArray(selectedCountryIndex) 
        ? COUNTRIES[selectedCountryIndex[0].row] 
        : COUNTRIES[selectedCountryIndex.row];
      
      await updateProfile({
        displayName: displayName.trim(),
        country: selectedCountry
      });
      
      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout style={styles.loadingContainer}>
        <Spinner size="large" status="primary" />
        <Text category="s1" appearance="hint" style={styles.loadingText}>Loading profile...</Text>
      </Layout>
    );
  }

  return (
    <Layout style={styles.container}>
      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Text category="h5" style={styles.title} center>Edit Profile</Text>
          
          <Layout style={styles.fieldContainer}>
            <Text category="s1" style={styles.label}>Email</Text>
            <Input
              style={styles.input}
              value={email}
              disabled={true}
              placeholder="Email"
            />
          </Layout>

          <Layout style={styles.fieldContainer}>
            <Text category="s1" style={styles.label}>Display Name</Text>
            <Input
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Display Name"
              disabled={saving}
            />
          </Layout>

          <Layout style={styles.fieldContainer}>
            <Text category="s1" style={styles.label}>Country</Text>
            <Select
              style={styles.input}
              placeholder="Select Country"
              selectedIndex={selectedCountryIndex}
              onSelect={(index) => setSelectedCountryIndex(index)}
              value={Array.isArray(selectedCountryIndex) 
                ? COUNTRIES[selectedCountryIndex[0].row] 
                : COUNTRIES[selectedCountryIndex.row]}
              disabled={saving}
            >
              {COUNTRIES.map((countryName, index) => (
                <SelectItem key={index} title={countryName} />
              ))}
            </Select>
          </Layout>

          <Button
            style={styles.saveButton}
            status="success"
            size="large"
            onPress={handleSave}
            disabled={saving}
            accessoryLeft={saving ? () => <Spinner size="small" status="control" /> : undefined}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </Card>
      </ScrollView>
    </Layout>
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
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    padding: 20,
  },
  title: {
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    marginBottom: 0,
  },
  saveButton: {
    marginTop: 20,
  },
});

