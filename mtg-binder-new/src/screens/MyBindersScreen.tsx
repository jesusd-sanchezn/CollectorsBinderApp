import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  Modal,
  TouchableOpacity,
  Image,
  ImageBackground,
  View
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { Layout, Text, Button, Input, Card, Spinner } from '@ui-kitten/components';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Binder } from '../types';
import { BinderService } from '../lib/binderService';
import { updateAllBindersToPublic } from '../lib/updateBindersToPublic';
import AlertModal from '../components/AlertModal';

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

// Helper function to calculate binder statistics
const calculateBinderStats = (binder: Binder): { cardCount: number; totalValue: number } => {
  let cardCount = 0;
  let totalValue = 0;

  binder.pages.forEach((page) => {
    page.slots.forEach((slot) => {
      if (!slot.isEmpty && slot.card) {
        cardCount += slot.card.quantity || 1;
        if (slot.card.price) {
          totalValue += slot.card.price * (slot.card.quantity || 1);
        }
      }
    });
  });

  return { cardCount, totalValue };
};

type Props = NativeStackScreenProps<RootStackParamList, 'MyBinders'>;

export default function MyBindersScreen({ navigation }: Props) {
  const [binders, setBinders] = useState<Binder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBinderName, setNewBinderName] = useState('');
  const [newBinderDescription, setNewBinderDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'danger'>('danger');
  
  // Image editor modal state
  const [showImageModal, setShowImageModal] = useState(false);
  const [editingBinderId, setEditingBinderId] = useState<string | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [updatingImage, setUpdatingImage] = useState(false);
  
  // Create modal image state
  const [createModalImageUri, setCreateModalImageUri] = useState<string | null>(null);

  const showAlertModal = (title: string, message: string, type: 'success' | 'danger' = 'danger') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
  };
  
  const handleEditBackground = (binder: Binder) => {
    setEditingBinderId(binder.id);
    setSelectedImageUri(null);
    setShowImageModal(true);
  };

  const handlePickImage = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        showAlertModal('Permission Required', 'Camera roll permission is required to select images');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showAlertModal('Error', 'Failed to pick image');
    }
  };

  const handlePickImageForCreate = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        showAlertModal('Permission Required', 'Camera roll permission is required to select images');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCreateModalImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showAlertModal('Error', 'Failed to pick image');
    }
  };

  const handleSaveBackground = async () => {
    if (!editingBinderId) return;
    
    if (!selectedImageUri) {
      showAlertModal('Error', 'Please select an image');
      return;
    }
    
    try {
      setUpdatingImage(true);
      
      // Upload image to Firebase Storage
      const downloadURL = await BinderService.uploadImage(selectedImageUri, editingBinderId);
      
      // Update binder with the download URL
      await BinderService.updateBinderBackground(editingBinderId, downloadURL);
      
      showAlertModal('Success', 'Background image updated successfully!', 'success');
      setShowImageModal(false);
      setSelectedImageUri(null);
      await loadBinders();
    } catch (error) {
      console.error('Error updating background:', error);
      showAlertModal('Error', 'Failed to upload and update background image');
    } finally {
      setUpdatingImage(false);
    }
  };

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
      showAlertModal('Error', 'Please enter a binder name');
      return;
    }

    try {
      setCreating(true);
      const binderId = await BinderService.createBinder(
        newBinderName.trim(),
        newBinderDescription.trim(),
        true
      );
      
      // If an image was selected, upload it
      if (createModalImageUri) {
        try {
          const downloadURL = await BinderService.uploadImage(createModalImageUri, binderId);
          await BinderService.updateBinderBackground(binderId, downloadURL);
        } catch (imageError) {
          console.error('Error uploading background image:', imageError);
          // Continue even if image upload fails
        }
      }
      
      showAlertModal('Success', 'Binder created successfully!', 'success');
      setNewBinderName('');
      setNewBinderDescription('');
      setCreateModalImageUri(null);
      setShowCreateModal(false);
      await loadBinders(); // Reload binders to show the new one
    } catch (error) {
      console.error('Error creating binder:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showAlertModal('Error', `Failed to create binder: ${errorMessage}`);
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
          status="primary"
          size="small"
          onPress={() => setShowCreateModal(true)}
        >
          + New Binder
        </Button>
      </Layout>

      <ScrollView style={styles.bindersList}>
        {binders.length === 0 ? (
          <Layout style={styles.emptyState}>
            <Feather name="book" size={64} color="#FF8610" />
            <Text category="h5" style={styles.emptyTitle}>No binders yet</Text>
            <Text category="s1" appearance="hint" style={styles.emptyDescription} center>
              Create your first binder to start organizing your MTG collection
            </Text>
          </Layout>
        ) : (
          binders.map((binder, index) => {
            const { cardCount, totalValue } = calculateBinderStats(binder);
            
            return binder.backgroundImageUrl ? (
              <View key={binder.id} style={[styles.binderCardContainer, index === 0 && styles.firstBinder]}>
                <ImageBackground
                  source={{ uri: binder.backgroundImageUrl }}
                  style={styles.binderWrapper}
                  imageStyle={styles.binderBackgroundImage}
                  resizeMode="cover"
                >
                  <View style={styles.binderOverlay}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => openBinder(binder)}
                      style={styles.binderTouchable}
                    >
                      <Layout style={styles.binderContent}>
                        <Layout style={styles.binderHeader}>
                          <Text category="h6" style={styles.binderName}>{binder.name}</Text>
                        </Layout>
                        <Text category="s1" appearance="hint" style={styles.binderDescription}>{binder.description}</Text>
                        <View style={styles.binderSpacer} />
                        <Layout style={styles.binderStats}>
                          <Text category="c1" appearance="hint" style={styles.statText}>{binder.pages.length} pages</Text>
                          <Text category="c1" appearance="hint" style={styles.statText}>{cardCount} cards</Text>
                          <Text category="c1" appearance="hint" style={styles.statText}>
                            ${totalValue.toFixed(2)}
                          </Text>
                          <Text category="c1" appearance="hint" style={styles.statText}>
                            Updated {formatFirebaseTimestamp(binder.updatedAt)}
                          </Text>
                        </Layout>
                      </Layout>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.editIcon}
                      onPress={() => handleEditBackground(binder)}
                      activeOpacity={0.7}
                    >
                      <Feather name="edit-2" size={18} color="#FF8610" />
                    </TouchableOpacity>
                  </View>
                </ImageBackground>
              </View>
            ) : (
              <Card
                key={binder.id}
                style={[styles.binderCard, index === 0 && styles.firstBinder]}
              >
                <View style={styles.binderWrapper}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => openBinder(binder)}
                    style={styles.binderTouchable}
                  >
                    <Layout style={styles.binderContent}>
                      <Layout style={styles.binderHeader}>
                        <Text category="h6" style={styles.binderName}>{binder.name}</Text>
                      </Layout>
                      <Text category="s1" appearance="hint" style={styles.binderDescription}>{binder.description}</Text>
                      <View style={styles.binderSpacer} />
                      <Layout style={styles.binderStats}>
                        <Text category="c1" appearance="hint" style={styles.statText}>{binder.pages.length} pages</Text>
                        <Text category="c1" appearance="hint" style={styles.statText}>{cardCount} cards</Text>
                        <Text category="c1" appearance="hint" style={styles.statText}>
                          ${totalValue.toFixed(2)}
                        </Text>
                        <Text category="c1" appearance="hint" style={styles.statText}>
                          Updated {formatFirebaseTimestamp(binder.updatedAt)}
                        </Text>
                      </Layout>
                    </Layout>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editIcon}
                    onPress={() => handleEditBackground(binder)}
                    activeOpacity={0.7}
                  >
                    <Feather name="edit-2" size={18} color="#FF8610" />
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
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
              status="primary"
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

            <Text category="s1" style={styles.inputLabel}>Background Image (Optional)</Text>
            <View style={styles.imagePickerContainer}>
              {createModalImageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: createModalImageUri }} style={styles.imagePreview} />
                  <Button
                    status="danger"
                    size="small"
                    onPress={() => setCreateModalImageUri(null)}
                    style={styles.removeImageButton}
                  >
                    Remove
                  </Button>
                </View>
              ) : (
                <Button
                  status="info"
                  appearance="outline"
                  onPress={handlePickImageForCreate}
                  disabled={creating}
                >
                  Select Image
                </Button>
              )}
            </View>

            <Card style={styles.infoBox}>
              <Text category="h6" style={styles.infoTitle}>Digital Binder Features</Text>
              <Text category="s1" appearance="hint" style={styles.infoText}>• 9-pocket pages like real binders</Text>
              <Text category="s1" appearance="hint" style={styles.infoText}>• Upload cards via CSV import</Text>
              <Text category="s1" appearance="hint" style={styles.infoText}>• Share with friends for trading</Text>
              <Text category="s1" appearance="hint" style={styles.infoText}>• Real-time card pricing</Text>
            </Card>
          </Layout>
        </Layout>
      </Modal>
      
      {/* Edit Background Image Modal */}
      <Modal
        visible={showImageModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <Layout style={styles.modalContainer}>
          <Layout style={styles.modalHeader} level="2">
            <Button
              appearance="ghost"
              status="basic"
              size="small"
              onPress={() => setShowImageModal(false)}
            >
              Cancel
            </Button>
            <Text category="h6" style={styles.modalTitle}>Edit Background</Text>
            <Button
              status="primary"
              size="small"
              onPress={handleSaveBackground}
              disabled={updatingImage}
              accessoryLeft={updatingImage ? () => <Spinner size="small" status="control" /> : undefined}
            >
              {updatingImage ? 'Saving...' : 'Save'}
            </Button>
          </Layout>

          <Layout style={styles.modalContent}>
            <Text category="s1" style={styles.inputLabel}>Background Image</Text>
            
            <Button
              status="primary"
              onPress={handlePickImage}
              disabled={updatingImage}
              style={{ marginBottom: 16 }}
            >
              {selectedImageUri ? 'Change Image' : 'Select Image'}
            </Button>
            
            {selectedImageUri && (
              <Layout style={styles.imagePreview}>
                <Image
                  source={{ uri: selectedImageUri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              </Layout>
            )}
            
            <Card style={styles.infoBox}>
              <Text category="h6" style={styles.infoTitle}>🎨 Playmat Background</Text>
              <Text category="s1" appearance="hint" style={styles.infoText}>
                Add a playmat image to visually identify your binder. Select an image from your photo library.
              </Text>
            </Card>
          </Layout>
        </Layout>
      </Modal>
      
      <AlertModal
        visible={showAlert}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => setShowAlert(false)}
      />
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
  binderCardContainer: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  firstBinder: {
    marginTop: 8,
  },
  binderCard: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  binderWrapper: {
    width: '100%',
    minHeight: 160,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  binderBackgroundImage: {
    opacity: 0.5,
    resizeMode: 'cover',
  },
  binderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  binderTouchable: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  binderContent: {
    flex: 1,
    padding: 16,
    paddingTop: 10,
    paddingBottom: 5,
    backgroundColor: 'transparent',
    flexDirection: 'column',
  },
  binderSpacer: {
    flex: 1,
    minHeight: 10,
  },
  editIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    padding: 8,
    borderRadius: 20,
  },
  binderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 6,
  },
  binderName: {
    flex: 1,
    marginBottom: 0,
  },
  binderDescription: {
    marginBottom: 12,
    marginTop: 8,
  },
  binderStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 6,
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
  imagePickerContainer: {
    marginTop: 8,
  },
  imagePreviewContainer: {
    marginTop: 8,
  },
  imagePreview: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 150,
    width: '100%',
  },
  removeImageButton: {
    marginTop: 8,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
});
