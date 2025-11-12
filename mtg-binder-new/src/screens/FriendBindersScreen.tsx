import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Image,
  ImageBackground,
  View
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Layout, Text, Button, Card, Spinner } from '@ui-kitten/components';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Binder } from '../types';
import { FriendsService } from '../lib/friendsService';
import AlertModal from '../components/AlertModal';
import { ScreenContainer } from '../components/ScreenContainer';

type Props = NativeStackScreenProps<RootStackParamList, 'FriendBinders'>;

export default function FriendBindersScreen({ navigation, route }: Props) {
  const { friendId, friendName } = route.params;
  const [binders, setBinders] = useState<Binder[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Alert modal state
  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'danger'>('danger');
  
  const showAlertModal = (title: string, message: string, type: 'success' | 'danger' = 'danger') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
  };

  useEffect(() => {
    loadFriendBinders();
  }, [friendId]);

  const loadFriendBinders = async () => {
    try {
      setLoading(true);
      const friendBinders = await FriendsService.getFriendBinders(friendId);
      setBinders(friendBinders);
    } catch (error) {
      console.error('Error loading friend binders:', error);
      showAlertModal('Error', 'Failed to load friend\'s binders');
    } finally {
      setLoading(false);
    }
  };

  const openBinder = (binder: Binder) => {
    navigation.navigate('BinderView', {
      binderId: binder.id,
      ownerId: binder.ownerId,
      ownerName: friendName
    });
  };

  if (loading) {
    return (
      <ScreenContainer>
        <Layout style={styles.loadingContainer}>
          <Spinner size="large" status="primary" />
          <Text category="s1" appearance="hint" style={styles.loadingText}>Loading {friendName}'s binders...</Text>
        </Layout>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Layout style={styles.header} level="2">
        <Button
          appearance="ghost"
          status="basic"
          size="small"
          onPress={() => navigation.goBack()}
        >
          ← Back
        </Button>
        <Text category="h6" style={styles.title}>{friendName}'s Binders</Text>
        <Layout style={styles.placeholder} />
      </Layout>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {binders.length === 0 ? (
          <Layout style={styles.emptyState}>
            <Feather name="book" size={64} color="#FF8610" />
            <Text category="h5" style={styles.emptyTitle}>No public binders</Text>
            <Text category="s1" appearance="hint" style={styles.emptyDescription} center>
              {friendName} hasn't made any binders public yet, or they don't have any binders.
            </Text>
          </Layout>
        ) : (
          binders.map((binder) => (
            binder.backgroundImageUrl ? (
              <View key={binder.id} style={styles.binderCardContainer}>
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
                          <Layout style={styles.binderStatus}>
                            <Text category="c1" style={styles.statusText}>Public</Text>
                          </Layout>
                        </Layout>
                        <Text category="s1" appearance="hint" style={styles.binderDescription}>{binder.description}</Text>
                        <View style={styles.binderSpacer} />
                        <Layout style={styles.binderStats}>
                          <Text category="c1" appearance="hint" style={styles.statText}>{binder.pages.length} pages</Text>
                          <Text category="c1" appearance="hint" style={styles.statText}>
                            Updated {binder.updatedAt ? 
                              (binder.updatedAt.toDate ? binder.updatedAt.toDate().toLocaleDateString() : 'Recently') 
                              : 'Recently'}
                          </Text>
                        </Layout>
                      </Layout>
                    </TouchableOpacity>
                  </View>
                </ImageBackground>
              </View>
            ) : (
              <Card
                key={binder.id}
                style={styles.binderCard}
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
                        <Layout style={styles.binderStatus}>
                          <Text category="c1" style={styles.statusText}>Public</Text>
                        </Layout>
                      </Layout>
                      <Text category="s1" appearance="hint" style={styles.binderDescription}>{binder.description}</Text>
                      <View style={styles.binderSpacer} />
                      <Layout style={styles.binderStats}>
                        <Text category="c1" appearance="hint" style={styles.statText}>{binder.pages.length} pages</Text>
                        <Text category="c1" appearance="hint" style={styles.statText}>
                          Updated {binder.updatedAt ? 
                            (binder.updatedAt.toDate ? binder.updatedAt.toDate().toLocaleDateString() : 'Recently') 
                            : 'Recently'}
                        </Text>
                      </Layout>
                    </Layout>
                  </TouchableOpacity>
                </View>
              </Card>
            )
          ))
        )}
      </ScrollView>

      <AlertModal
        visible={showAlert}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => setShowAlert(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    paddingTop: 6,
    borderRadius: 8,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    marginBottom: 0,
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  contentContainer: {
    paddingBottom: 32,
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
  binderCard: {
    marginBottom: 12,
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
  binderStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'transparent',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 6,
  },
  statText: {
    marginBottom: 0,
  },
});
