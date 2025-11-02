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
import { RootStackParamList } from '../types';
import { FriendsService, Friend, FriendRequest } from '../lib/friendsService';

type Props = NativeStackScreenProps<RootStackParamList, 'Friends'>;

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

export default function FriendsScreen({ navigation }: Props) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [friendsData, requestsData] = await Promise.all([
        FriendsService.getFriends(),
        FriendsService.getPendingFriendRequests()
      ]);
      setFriends(friendsData);
      setFriendRequests(requestsData);
    } catch (error) {
      console.error('Error loading friends data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!friendEmail.trim()) {
      Alert.alert('Error', 'Please enter a friend\'s email address');
      return;
    }

    try {
      setAddingFriend(true);
      await FriendsService.sendFriendRequest(friendEmail.trim());
      Alert.alert('Success', 'Friend request sent successfully!');
      setFriendEmail('');
      setShowAddFriendModal(false);
      await loadData(); // Reload to show any new requests
    } catch (error) {
      console.error('Error adding friend:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send friend request';
      Alert.alert('Error', errorMessage);
    } finally {
      setAddingFriend(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await FriendsService.acceptFriendRequest(requestId);
      Alert.alert('Success', 'Friend request accepted!');
      await loadData();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await FriendsService.declineFriendRequest(requestId);
      Alert.alert('Success', 'Friend request declined');
      await loadData();
    } catch (error) {
      console.error('Error declining friend request:', error);
      Alert.alert('Error', 'Failed to decline friend request');
    }
  };

  const handleRemoveFriend = async (friend: Friend) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.friendName} from your friends list?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await FriendsService.removeFriend(friend.friendId);
              Alert.alert('Success', 'Friend removed successfully');
              await loadData();
            } catch (error) {
              console.error('Error removing friend:', error);
              Alert.alert('Error', 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  const handleViewFriendBinders = (friend: Friend) => {
    navigation.navigate('FriendBinders', {
      friendId: friend.friendId,
      friendName: friend.friendName
    });
  };

  if (loading) {
    return (
      <Layout style={styles.loadingContainer}>
        <Spinner size="large" status="primary" />
        <Text category="s1" appearance="hint" style={styles.loadingText}>Loading friends...</Text>
      </Layout>
    );
  }

  return (
    <Layout style={styles.container}>
      <Layout style={styles.header} level="2">
        <Text category="h4" style={styles.title}>Friends</Text>
        <Button 
          status="success"
          size="small"
          onPress={() => setShowAddFriendModal(true)}
        >
          + Add Friend
        </Button>
      </Layout>

      {/* Tab Navigation */}
      <Layout style={styles.tabContainer} level="2">
        <Button
          appearance={activeTab === 'friends' ? 'filled' : 'ghost'}
          status={activeTab === 'friends' ? 'primary' : 'basic'}
          size="small"
          style={styles.tab}
          onPress={() => setActiveTab('friends')}
        >
          Friends ({friends.length})
        </Button>
        <Button
          appearance={activeTab === 'requests' ? 'filled' : 'ghost'}
          status={activeTab === 'requests' ? 'primary' : 'basic'}
          size="small"
          style={styles.tab}
          onPress={() => setActiveTab('requests')}
        >
          Requests ({friendRequests.length})
        </Button>
      </Layout>

      <ScrollView style={styles.content}>
        {activeTab === 'friends' ? (
          friends.length === 0 ? (
            <Layout style={styles.emptyState}>
              <Text category="h1" style={styles.emptyIcon}>👥</Text>
              <Text category="h5" style={styles.emptyTitle}>No friends yet</Text>
              <Text category="s1" appearance="hint" style={styles.emptyDescription} center>
                Add friends to see their MTG collections and trade cards
              </Text>
            </Layout>
          ) : (
            friends.map((friend) => (
              <Card key={friend.id} style={styles.friendCard}>
                <Layout style={styles.friendInfo}>
                  <Text category="h6" style={styles.friendName}>{friend.friendName}</Text>
                  <Text category="s1" appearance="hint" style={styles.friendEmail}>{friend.friendEmail}</Text>
                </Layout>
                <Layout style={styles.friendActions}>
                  <Button 
                    status="primary"
                    size="small"
                    style={styles.viewButton}
                    onPress={() => handleViewFriendBinders(friend)}
                  >
                    📚 View Binders
                  </Button>
                  <Button 
                    status="danger"
                    size="small"
                    style={styles.removeButton}
                    onPress={() => handleRemoveFriend(friend)}
                  >
                    🗑️
                  </Button>
                </Layout>
              </Card>
            ))
          )
        ) : (
          friendRequests.length === 0 ? (
            <Layout style={styles.emptyState}>
              <Text category="h1" style={styles.emptyIcon}>📬</Text>
              <Text category="h5" style={styles.emptyTitle}>No pending requests</Text>
              <Text category="s1" appearance="hint" style={styles.emptyDescription} center>
                Friend requests will appear here when someone wants to add you
              </Text>
            </Layout>
          ) : (
            friendRequests.map((request) => (
              <Card key={request.id} style={styles.requestCard}>
                <Layout style={styles.requestInfo}>
                  <Text category="h6" style={styles.requestName}>{request.fromUserName}</Text>
                  <Text category="s1" appearance="hint" style={styles.requestEmail}>{request.fromUserEmail}</Text>
                  <Text category="c1" appearance="hint" style={styles.requestDate}>
                    {formatFirebaseTimestamp(request.createdAt)}
                  </Text>
                </Layout>
                <Layout style={styles.requestActions}>
                  <Button 
                    status="success"
                    size="small"
                    style={styles.acceptButton}
                    onPress={() => handleAcceptRequest(request.id)}
                  >
                    ✓ Accept
                  </Button>
                  <Button 
                    status="danger"
                    size="small"
                    style={styles.declineButton}
                    onPress={() => handleDeclineRequest(request.id)}
                  >
                    ✗ Decline
                  </Button>
                </Layout>
              </Card>
            ))
          )
        )}
      </ScrollView>

      {/* Add Friend Modal */}
      <Modal
        visible={showAddFriendModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <Layout style={styles.modalContainer}>
          <Layout style={styles.modalHeader} level="2">
            <Button
              appearance="ghost"
              status="basic"
              size="small"
              onPress={() => setShowAddFriendModal(false)}
            >
              Cancel
            </Button>
            <Text category="h6" style={styles.modalTitle}>Add Friend</Text>
            <Button
              status="success"
              size="small"
              onPress={handleAddFriend}
              disabled={addingFriend}
              accessoryLeft={addingFriend ? () => <Spinner size="small" status="control" /> : undefined}
            >
              {addingFriend ? 'Sending...' : 'Send'}
            </Button>
          </Layout>

          <Layout style={styles.modalContent}>
            <Text category="s1" style={styles.inputLabel}>Friend's Email Address</Text>
            <Input
              style={styles.textInput}
              value={friendEmail}
              onChangeText={setFriendEmail}
              placeholder="friend@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              disabled={addingFriend}
            />

            <Card style={styles.infoBox}>
              <Text category="h6" style={styles.infoTitle}>📧 How to Add Friends</Text>
              <Text category="s1" appearance="hint" style={styles.infoText}>
                • Enter your friend's email address{'\n'}
                • They must have an account on this app{'\n'}
                • They'll receive a friend request{'\n'}
                • Once accepted, you can view each other's public binders
              </Text>
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
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 8,
    padding: 4,
    gap: 8,
  },
  tab: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
  friendCard: {
    marginBottom: 12,
  },
  friendInfo: {
    flex: 1,
    marginBottom: 12,
  },
  friendName: {
    marginBottom: 4,
  },
  friendEmail: {
    marginTop: 4,
  },
  friendActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewButton: {
    marginRight: 0,
  },
  removeButton: {
    minWidth: 40,
  },
  requestCard: {
    marginBottom: 12,
    padding: 16,
  },
  requestInfo: {
    marginBottom: 12,
  },
  requestName: {
    marginBottom: 4,
  },
  requestEmail: {
    marginBottom: 4,
    marginTop: 4,
  },
  requestDate: {
    marginTop: 4,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    marginRight: 4,
  },
  declineButton: {
    flex: 1,
    marginLeft: 4,
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
  infoBox: {
    marginTop: 24,
    padding: 16,
  },
  infoTitle: {
    marginBottom: 12,
  },
  infoText: {
    lineHeight: 20,
  },
});