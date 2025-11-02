import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  Alert, 
  Modal,
  TouchableOpacity
} from 'react-native';
import { Layout, Text, Button, Input, Card, Spinner } from '@ui-kitten/components';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Binder } from '../types';
import { BinderService } from '../lib/binderService';
import { updateAllBindersToPublic } from '../lib/updateBindersToPublic';

// Helper function to format Firebase timestamps
const formatFirebaseTimestamp = (timestamp: any): string => {
  if (!timestamp) return 'Recently';
  
  try {
    // If it's a Firebase timestamp, convert it to Date
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString();
    }
    // If it's already a Date object
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString();
    }
    // If it's a number (milliseconds)
    if (typeof timestamp === 'number') {
      return new Date(timestamp).toLocaleDateString();
    }
    return 'Recently';
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Recently';
  }
};

type Props = NativeStackScreenProps<RootStackParamList, 'MyBinders'>;

export default function MyBindersScreen({ navigation }: Props) {
  const [binders, setBinders] = useState<Binder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBinderName, setNewBinderName] = useState('');
  const [newBinderDescription, setNewBinderDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const loadBinders = async () => {
    try {
      setLoading(true);
      // Update existing binders to be public (one-time migration)
      await updateAllBindersToPublic();
      // Load binders from Firebase for current user
      const userBinders = await BinderService.getUserBinders();
      setBinders(userBinders || []); // Ensure we always have an array
    } catch (error) {
      console.error('Error loading binders:', error);
      // Don't show error alert for empty results, just set empty array
      setBinders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBinders();
  }, []);

  const createBinder = async () => {
    if (!newBinderName.trim()) {
      Alert.alert('Error', 'Please enter a binder name');
      return;
    }

    try {
      setCreating(true);
      const binderId = await BinderService.createBinder(
        newBinderName.trim(),
        newBinderDescription.trim(),
        true
      );
      
      Alert.alert('Success', 'Binder created successfully!');
      setNewBinderName('');
      setNewBinderDescription('');
      setShowCreateModal(false);
      await loadBinders(); // Reload binders to show the new one
    } catch (error) {
      console.error('Error creating binder:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to create binder: ${errorMessage}`);
    } finally {
      setCreating(false);
    }
  };

  const openBinder = (binder: Binder) => {
    console.log('Opening binder:', binder.id);
    navigation.navigate('BinderView', {
      binderId: binder.id,
      ownerId: binder.ownerId,
      ownerName: 'You'
    });
  };

  if (loading) {
    return (
      <Layout style={styles.loadingContainer}>
        <Spinner size="large" status="primary" />
        <Text category="s1" appearance="hint" style={styles.loadingText}>Loading binders...</Text>
      </Layout>
    );
  }

  return (
    <Layout style={styles.container}>
      <Layout style={styles.header} level="2">
        <Text category="h4" style={styles.title}>My Binders</Text>
        <Button 
          status="success"
          size="small"
          onPress={() => setShowCreateModal(true)}
        >
          + New Binder
        </Button>
      </Layout>

      <ScrollView style={styles.bindersList}>
        {binders.length === 0 ? (
          <Layout style={styles.emptyState}>
            <Text category="h1" style={styles.emptyIcon}>📚</Text>
            <Text category="h5" style={styles.emptyTitle}>No binders yet</Text>
            <Text category="s1" appearance="hint" style={styles.emptyDescription} center>
              Create your first binder to start organizing your MTG collection
            </Text>
          </Layout>
        ) : (
          binders.map((binder) => (
            <Card
              key={binder.id}
              style={styles.binderCard}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => openBinder(binder)}
              >
                <Layout style={styles.binderContent}>
                  <Layout style={styles.binderHeader}>
                    <Text category="h6" style={styles.binderName}>{binder.name}</Text>
                    <Layout style={styles.binderStatus}>
                      <Text category="c1" style={styles.statusText}>
                        {binder.isPublic ? 'Public' : 'Private'}
                      </Text>
                    </Layout>
                  </Layout>
                  <Text category="s1" appearance="hint" style={styles.binderDescription}>{binder.description}</Text>
                  <Layout style={styles.binderStats}>
                    <Text category="c1" appearance="hint" style={styles.statText}>{binder.pages.length} pages</Text>
                    <Text category="c1" appearance="hint" style={styles.statText}>
                      Updated {formatFirebaseTimestamp(binder.updatedAt)}
                    </Text>
                  </Layout>
                </Layout>
              </TouchableOpacity>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Create Binder Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <Layout style={styles.modalContainer}>
          <Layout style={styles.modalHeader} level="2">
            <Button
              appearance="ghost"
              status="basic"
              size="small"
              onPress={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Text category="h6" style={styles.modalTitle}>Create New Binder</Text>
            <Button
              status="success"
              size="small"
              onPress={createBinder}
              disabled={creating}
              accessoryLeft={creating ? () => <Spinner size="small" status="control" /> : undefined}
            >
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </Layout>

          <Layout style={styles.modalContent}>
            <Text category="s1" style={styles.inputLabel}>Binder Name</Text>
            <Input
              style={styles.textInput}
              value={newBinderName}
              onChangeText={setNewBinderName}
              placeholder="e.g., My Commander Deck"
              disabled={creating}
            />

            <Text category="s1" style={styles.inputLabel}>Description (Optional)</Text>
            <Input
              style={[styles.textInput, styles.textArea]}
              value={newBinderDescription}
              onChangeText={setNewBinderDescription}
              placeholder="Describe your binder..."
              multiline={true}
              disabled={creating}
              textStyle={styles.textAreaText}
            />

            <Card style={styles.infoBox}>
              <Text category="h6" style={styles.infoTitle}>📚 Digital Binder Features</Text>
              <Text category="s1" appearance="hint" style={styles.infoText}>• 9-pocket pages like real binders</Text>
              <Text category="s1" appearance="hint" style={styles.infoText}>• Upload cards via CSV import</Text>
              <Text category="s1" appearance="hint" style={styles.infoText}>• Share with friends for trading</Text>
              <Text category="s1" appearance="hint" style={styles.infoText}>• Real-time card pricing</Text>
            </Card>
          </Layout>
        </Layout>
      </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
    borderRadius: 8,
  },
  title: {
    marginBottom: 0,
  },
  bindersList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  binderCard: {
    marginBottom: 12,
  },
  binderContent: {
    padding: 16,
  },
  binderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  binderName: {
    flex: 1,
    marginBottom: 0,
  },
  binderStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    marginBottom: 0,
  },
  binderDescription: {
    marginBottom: 12,
    marginTop: 8,
  },
  binderStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    marginBottom: 0,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderRadius: 0,
  },
  modalTitle: {
    marginBottom: 0,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputLabel: {
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    marginTop: 8,
  },
  textArea: {
    minHeight: 80,
  },
  textAreaText: {
    minHeight: 80,
  },
  infoBox: {
    marginTop: 24,
    padding: 16,
  },
  infoTitle: {
    marginBottom: 12,
  },
  infoText: {
    marginBottom: 4,
  },
});
