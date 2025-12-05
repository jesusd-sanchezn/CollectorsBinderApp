import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  Modal,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Layout, Text, Button, Input, Card, Spinner } from '@ui-kitten/components';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { FriendsService, Friend, FriendRequest } from '../lib/friendsService';
import { getCountryFlag } from '../lib/countryFlags';
import AlertModal from '../components/AlertModal';
import ConfirmModal from '../components/ConfirmModal';
import { ScreenContainer } from '../components/ScreenContainer';

type Props = NativeStackScreenProps<RootStackParamList, 'Friends'>;

import { formatDate } from '../lib/dateUtils';

export default function FriendsScreen({ navigation }: Props) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  
  // Alert modal state
  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'danger'>('danger');
  
  // Confirm modal state
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  
  const showAlertModal = (title: string, message: string, type: 'success' | 'danger' = 'danger') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
  };
  
  const showConfirmModal = (title: string, message: string, onConfirm: () => void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmAction(() => onConfirm);
    setShowConfirm(true);
  };

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
      showAlertModal('Error', 'Please enter a friend\'s email address');
      return;
    }

    try {
      setAddingFriend(true);
      await FriendsService.sendFriendRequest(friendEmail.trim());
      showAlertModal('Success', 'Friend request sent successfully!', 'success');
      setFriendEmail('');
      setShowAddFriendModal(false);
      await loadData(); // Reload to show any new requests
    } catch (error) {
      console.error('Error adding friend:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send friend request';
      showAlertModal('Error', errorMessage);
    } finally {
      setAddingFriend(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await FriendsService.acceptFriendRequest(requestId);
      showAlertModal('Success', 'Friend request accepted!', 'success');
      await loadData();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      showAlertModal('Error', 'Failed to accept friend request');
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await FriendsService.declineFriendRequest(requestId);
      showAlertModal('Success', 'Friend request declined', 'success');
      await loadData();
    } catch (error) {
      console.error('Error declining friend request:', error);
      showAlertModal('Error', 'Failed to decline friend request');
    }
  };

  const handleRemoveFriend = async (friend: Friend) => {
    showConfirmModal(
      'Remove Friend',
      `Are you sure you want to remove ${friend.friendName} from your friends list?`,
      async () => {
        try {
          await FriendsService.removeFriend(friend.friendId);
          showAlertModal('Success', 'Friend removed successfully', 'success');
          await loadData();
        } catch (error) {
          console.error('Error removing friend:', error);
          showAlertModal('Error', 'Failed to remove friend');
        }
      }
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
      <ScreenContainer>
        <Layout style={styles.loadingContainer}>
          <Spinner size="large" status="primary" />
          <Text category="s1" appearance="hint" style={styles.loadingText}>Loading friends...</Text>
        </Layout>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Layout style={styles.header} level="2">
        <Text category="h4" style={styles.title}>Friends</Text>
        <Button 
          status="primary"
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

      <ScrollView
        style={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'friends' ? (
          friends.length === 0 ? (
            <Layout style={styles.emptyState}>
              <Feather name="users" size={64} color="#FF8610" />
              <Text category="h5" style={styles.emptyTitle}>No friends yet</Text>
              <Text category="s1" appearance="hint" style={styles.emptyDescription} center>
                Add friends to see their MTG collections and trade cards
              </Text>
            </Layout>
          ) : (
            friends.map((friend) => (
              <Card key={friend.id} style={styles.friendCard}>
                <Layout style={styles.friendInfo}>
                  <Layout style={styles.friendNameContainer}>
                    <Text category="h6" style={styles.friendName}>{friend.friendName}</Text>
                    {friend.friendCountry && getCountryFlag(friend.friendCountry) ? (
                      <Text style={styles.countryFlag}>{getCountryFlag(friend.friendCountry)}</Text>
                    ) : null}
                  </Layout>
                  <Text category="s1" appearance="hint" style={styles.friendEmail}>{friend.friendEmail}</Text>
                </Layout>
                <Layout style={styles.friendActions}>
                  <Button 
                    status="primary"
                    size="small"
                    style={styles.viewButton}
                    onPress={() => handleViewFriendBinders(friend)}
                    accessoryLeft={() => <Feather name="book" size={16} color="#FFFFFF" />}
                  >
                    View Binders
                  </Button>
                  <Button 
                    status="danger"
                    size="small"
                    style={styles.removeButton}
                    onPress={() => handleRemoveFriend(friend)}
                    accessoryLeft={() => <Feather name="trash-2" size={16} color="#FFFFFF" />}
                  >
                    
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
                    {formatDate(request.createdAt)}
                  </Text>
                </Layout>
                <Layout style={styles.requestActions}>
                  <Button 
                    status="primary"
                    size="small"
                    style={styles.acceptButton}
                    onPress={() => handleAcceptRequest(request.id)}
                    accessoryLeft={() => <Feather name="check" size={16} color="#FFFFFF" />}
                  >
                    Accept
                  </Button>
                  <Button 
                    status="danger"
                    size="small"
                    style={styles.declineButton}
                    onPress={() => handleDeclineRequest(request.id)}
                    accessoryLeft={() => <Feather name="x" size={16} color="#FFFFFF" />}
                  >
                    Decline
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
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
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
                status="primary"
                size="small"
                onPress={handleAddFriend}
                disabled={addingFriend}
                accessoryLeft={addingFriend ? () => <Spinner size="small" status="control" /> : undefined}
              >
                {addingFriend ? 'Sending...' : 'Send'}
              </Button>
            </Layout>

            <ScrollView 
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer}
              showsVerticalScrollIndicator={false}
            >
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
            </ScrollView>
          </Layout>
        </SafeAreaView>
      </Modal>

      <AlertModal
        visible={showAlert}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => setShowAlert(false)}
      />

      <ConfirmModal
        visible={showConfirm}
        title={confirmTitle}
        message={confirmMessage}
        confirmText="Confirm"
        cancelText="Cancel"
        confirmStatus="danger"
        onConfirm={() => {
          if (confirmAction) {
            confirmAction();
          }
          setShowConfirm(false);
        }}
        onCancel={() => setShowConfirm(false)}
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
    paddingTop: 8,
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
  friendNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  friendName: {
    marginRight: 8,
  },
  countryFlag: {
    fontSize: 20,
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
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#222B45',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderRadius: 0,
  },
  modalTitle: {
    marginBottom: 0,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 20,
    paddingBottom: 40,
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