import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  TextInput,
  Modal,
  ActivityIndicator 
} from 'react-native';
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

  useEffect(() => {
    loadBinders();
  }, []);

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
    navigation.navigate('BinderView', {
      binderId: binder.id,
      ownerId: binder.ownerId,
      ownerName: 'You'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading binders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Binders</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.createButtonText}>+ New Binder</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.bindersList}>
        {binders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyTitle}>No binders yet</Text>
            <Text style={styles.emptyDescription}>
              Create your first binder to start organizing your MTG collection
            </Text>
          </View>
        ) : (
          binders.map((binder) => (
            <TouchableOpacity
              key={binder.id}
              style={styles.binderCard}
              onPress={() => openBinder(binder)}
            >
              <View style={styles.binderHeader}>
                <Text style={styles.binderName}>{binder.name}</Text>
                <View style={styles.binderStatus}>
                  <Text style={styles.statusText}>
                    {binder.isPublic ? 'Public' : 'Private'}
                  </Text>
                </View>
              </View>
              <Text style={styles.binderDescription}>{binder.description}</Text>
              <View style={styles.binderStats}>
                <Text style={styles.statText}>{binder.pages.length} pages</Text>
                <Text style={styles.statText}>
                  Updated {formatFirebaseTimestamp(binder.updatedAt)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Create Binder Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create New Binder</Text>
            <TouchableOpacity onPress={createBinder} disabled={creating}>
              <Text style={[styles.createButtonText, creating && styles.disabledButton]}>
                {creating ? 'Creating...' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Binder Name</Text>
            <TextInput
              style={styles.textInput}
              value={newBinderName}
              onChangeText={setNewBinderName}
              placeholder="e.g., My Commander Deck"
              placeholderTextColor="#666"
            />

            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={newBinderDescription}
              onChangeText={setNewBinderDescription}
              placeholder="Describe your binder..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={3}
            />

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>📚 Digital Binder Features</Text>
              <Text style={styles.infoText}>• 9-pocket pages like real binders</Text>
              <Text style={styles.infoText}>• Upload cards via CSV import</Text>
              <Text style={styles.infoText}>• Share with friends for trading</Text>
              <Text style={styles.infoText}>• Real-time card pricing</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    color: '#ccc',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  createButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
  },
  binderCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  binderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  binderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  binderStatus: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  binderDescription: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 12,
  },
  binderStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    fontSize: 12,
    color: '#888',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  cancelButton: {
    color: '#4CAF50',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  infoBox: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
