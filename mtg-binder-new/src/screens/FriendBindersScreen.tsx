import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading {friendName}'s binders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{friendName}'s Binders</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {binders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyTitle}>No public binders</Text>
            <Text style={styles.emptyDescription}>
              {friendName} hasn't made any binders public yet, or they don't have any binders.
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
                  <Text style={styles.statusText}>Public</Text>
                </View>
              </View>
              <Text style={styles.binderDescription}>{binder.description}</Text>
              <View style={styles.binderStats}>
                <Text style={styles.statText}>{binder.pages.length} pages</Text>
                <Text style={styles.statText}>
                  Updated {binder.updatedAt ? 
                    (binder.updatedAt.toDate ? binder.updatedAt.toDate().toLocaleDateString() : 'Recently') 
                    : 'Recently'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
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
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 60, // Same width as back button to center the title
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
});
