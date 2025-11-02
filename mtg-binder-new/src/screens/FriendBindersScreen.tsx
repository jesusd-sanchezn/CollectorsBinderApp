import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  Alert, 
  TouchableOpacity,
  Image
} from 'react-native';
import { Layout, Text, Button, Card, Spinner } from '@ui-kitten/components';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Binder } from '../types';
import { FriendsService } from '../lib/friendsService';

type Props = NativeStackScreenProps<RootStackParamList, 'FriendBinders'>;

export default function FriendBindersScreen({ navigation, route }: Props) {
  const { friendId, friendName } = route.params;
  const [binders, setBinders] = useState<Binder[]>([]);
  const [loading, setLoading] = useState(true);

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
      Alert.alert('Error', 'Failed to load friend\'s binders');
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
      <Layout style={styles.loadingContainer}>
        <Spinner size="large" status="primary" />
        <Text category="s1" appearance="hint" style={styles.loadingText}>Loading {friendName}'s binders...</Text>
      </Layout>
    );
  }

  return (
    <Layout style={styles.container}>
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

      <ScrollView style={styles.content}>
        {binders.length === 0 ? (
          <Layout style={styles.emptyState}>
            <Text category="h1" style={styles.emptyIcon}>📚</Text>
            <Text category="h5" style={styles.emptyTitle}>No public binders</Text>
            <Text category="s1" appearance="hint" style={styles.emptyDescription} center>
              {friendName} hasn't made any binders public yet, or they don't have any binders.
            </Text>
          </Layout>
        ) : (
          binders.map((binder) => (
            <Card
              key={binder.id}
              style={styles.binderCard}
            >
              {binder.backgroundImageUrl && (
                <Image 
                  source={{ uri: binder.backgroundImageUrl }} 
                  style={styles.binderBackground}
                  resizeMode="cover"
                />
              )}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => openBinder(binder)}
              >
                <Layout style={styles.binderContent}>
                  <Layout style={styles.binderHeader}>
                    <Text category="h6" style={styles.binderName}>{binder.name}</Text>
                    <Layout style={styles.binderStatus}>
                      <Text category="c1" style={styles.statusText}>Public</Text>
                    </Layout>
                  </Layout>
                  <Text category="s1" appearance="hint" style={styles.binderDescription}>{binder.description}</Text>
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
            </Card>
          ))
        )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
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
    position: 'relative',
    overflow: 'hidden',
  },
  binderBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  binderContent: {
    padding: 16,
    position: 'relative',
    zIndex: 1,
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
});
