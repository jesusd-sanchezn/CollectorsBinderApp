import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { NotificationService } from './notificationService';

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  friendEmail: string;
  friendName: string;
  friendCountry?: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: any; // Firebase Timestamp
  updatedAt: any; // Firebase Timestamp
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserEmail: string;
  fromUserName: string;
  toUserId: string;
  toUserEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any; // Firebase Timestamp
  updatedAt: any; // Firebase Timestamp
}

export class FriendsService {
  // Helper method to get current user ID
  private static getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to perform this action');
    }
    return user.uid;
  }

  // Send a friend request
  static async sendFriendRequest(friendEmail: string): Promise<void> {
    try {
      const currentUserId = this.getCurrentUserId();
      const currentUser = auth.currentUser;
      
      if (!currentUser || !currentUser.email) {
        throw new Error('User email not available');
      }

      // Check if user is trying to add themselves
      if (friendEmail.toLowerCase() === currentUser.email.toLowerCase()) {
        throw new Error('You cannot add yourself as a friend');
      }

      // Find the friend's user ID by email
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', friendEmail.toLowerCase())
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      
      if (usersSnapshot.empty) {
        throw new Error('User with this email not found');
      }

      const friendDoc = usersSnapshot.docs[0];
      const friendUserId = friendDoc.id;
      const friendData = friendDoc.data();

      // Check if friendship already exists
      const existingFriendshipQuery = query(
        collection(db, 'friendships'),
        where('userId', '==', currentUserId),
        where('friendId', '==', friendUserId)
      );
      
      const existingFriendship = await getDocs(existingFriendshipQuery);
      
      if (!existingFriendship.empty) {
        throw new Error('Friendship already exists or request already sent');
      }

      // Create friend request
      const friendRequestData = {
        fromUserId: currentUserId,
        fromUserEmail: currentUser.email,
        fromUserName: currentUser.displayName || currentUser.email.split('@')[0],
        toUserId: friendUserId,
        toUserEmail: friendEmail,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'friendRequests'), friendRequestData);
      
      console.log(`Friend request sent to ${friendEmail}`);
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  }

  // Get pending friend requests for current user
  static async getPendingFriendRequests(): Promise<FriendRequest[]> {
    try {
      const currentUserId = this.getCurrentUserId();
      
      const q = query(
        collection(db, 'friendRequests'),
        where('toUserId', '==', currentUserId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FriendRequest));
      
      return requests;
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      return [];
    }
  }

  // Accept a friend request
  static async acceptFriendRequest(requestId: string): Promise<void> {
    try {
      const currentUserId = this.getCurrentUserId();
      
      // Get the friend request
      const requestDoc = await getDoc(doc(db, 'friendRequests', requestId));
      
      if (!requestDoc.exists()) {
        throw new Error('Friend request not found');
      }
      
      const requestData = requestDoc.data() as FriendRequest;
      
      if (requestData.toUserId !== currentUserId) {
        throw new Error('Unauthorized to accept this request');
      }
      
      if (requestData.status !== 'pending') {
        throw new Error('Request is no longer pending');
      }

      // Update the friend request status
      await updateDoc(doc(db, 'friendRequests', requestId), {
        status: 'accepted',
        updatedAt: serverTimestamp()
      });

      // Fetch current user's display name
      const currentUser = auth.currentUser;
      const currentUserDisplayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Unknown';

      // Fetch friend's display name from users collection
      const friendUserDoc = await getDoc(doc(db, 'users', requestData.fromUserId));
      const friendUserData = friendUserDoc.data();
      const friendDisplayName = friendUserData?.displayName || friendUserData?.email?.split('@')[0] || requestData.fromUserName || 'Unknown';

      // Create friendship for both users
      const friendshipData1 = {
        userId: requestData.fromUserId,
        friendId: requestData.toUserId,
        friendEmail: requestData.toUserEmail,
        friendName: currentUserDisplayName, // Current user's name (the accepter)
        status: 'accepted',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const friendshipData2 = {
        userId: requestData.toUserId,
        friendId: requestData.fromUserId,
        friendEmail: requestData.fromUserEmail,
        friendName: friendDisplayName, // Friend's display name from users collection
        status: 'accepted',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'friendships'), friendshipData1);
      await addDoc(collection(db, 'friendships'), friendshipData2);
      
      console.log(`Friend request accepted from ${requestData.fromUserEmail}`);
      
      // Send notification to the person who sent the request
      try {
        const currentUser = auth.currentUser;
        const senderName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Someone';
        await NotificationService.notifyFriendAccepted(senderName, requestData.fromUserId);
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // Don't fail the entire operation if notification fails
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      throw error;
    }
  }

  // Decline a friend request
  static async declineFriendRequest(requestId: string): Promise<void> {
    try {
      const currentUserId = this.getCurrentUserId();
      
      // Get the friend request
      const requestDoc = await getDoc(doc(db, 'friendRequests', requestId));
      
      if (!requestDoc.exists()) {
        throw new Error('Friend request not found');
      }
      
      const requestData = requestDoc.data() as FriendRequest;
      
      if (requestData.toUserId !== currentUserId) {
        throw new Error('Unauthorized to decline this request');
      }

      // Update the friend request status
      await updateDoc(doc(db, 'friendRequests', requestId), {
        status: 'declined',
        updatedAt: serverTimestamp()
      });
      
      console.log(`Friend request declined from ${requestData.fromUserEmail}`);
    } catch (error) {
      console.error('Error declining friend request:', error);
      throw error;
    }
  }

  // Get current user's friends
  static async getFriends(): Promise<Friend[]> {
    try {
      const currentUserId = this.getCurrentUserId();
      
      const q = query(
        collection(db, 'friendships'),
        where('userId', '==', currentUserId),
        where('status', '==', 'accepted')
      );
      
      const querySnapshot = await getDocs(q);
      
      // Fetch current display names from users collection for each friend
      const friendsPromises = querySnapshot.docs.map(async (friendshipDoc) => {
        const friendData = friendshipDoc.data() as Friend;
        
        // Ensure friendId is not the current user (shouldn't happen, but safety check)
        if (friendData.friendId === currentUserId) {
          console.error(`Invalid friendship: friendId matches currentUserId: ${currentUserId}`);
          return null;
        }
        
        let friendDisplayName = 'Unknown';
        
        try {
          // Fetch friend's current display name from users collection using friendId
          const friendUserDoc = await getDoc(doc(db, 'users', friendData.friendId));
          
          if (!friendUserDoc.exists()) {
            console.warn(`User document not found for friendId: ${friendData.friendId}`);
            friendDisplayName = friendData.friendName || 'Unknown';
          } else {
            const friendUserData = friendUserDoc.data();
            // Always use the display name from users collection, never the stored friendName
            friendDisplayName = friendUserData?.displayName || 
                                friendUserData?.email?.split('@')[0] || 
                                'Unknown';
            
            // Get country from user data
            friendData.friendCountry = friendUserData?.country || undefined;
            
            // Debug log to verify we're getting the right user and country
            console.log(`Friend ${friendData.friendId}: Display name "${friendDisplayName}", Country: "${friendUserData?.country || 'none'}"`);
          }
        } catch (error) {
          console.error(`Error fetching friend ${friendData.friendId} display name:`, error);
          // Fallback to stored friendName only if fetch fails
          friendDisplayName = friendData.friendName || 'Unknown';
        }
        
        // Return new object with updated friendName and country from users collection
        return {
          id: friendshipDoc.id,
          ...friendData,
          friendName: friendDisplayName,
          friendCountry: friendData.friendCountry || undefined
        } as Friend;
      });
      
      // Filter out any null results from invalid friendships
      const friendsResults = await Promise.all(friendsPromises);
      const friends = friendsResults.filter((friend): friend is Friend => friend !== null);
      
      // Sort by display name after fetching
      friends.sort((a, b) => (a.friendName || '').localeCompare(b.friendName || ''));
      
      return friends;
    } catch (error) {
      console.error('Error fetching friends:', error);
      return [];
    }
  }

  // Remove a friend
  static async removeFriend(friendId: string): Promise<void> {
    try {
      const currentUserId = this.getCurrentUserId();
      
      // Find and delete both friendship records
      const friendshipQuery1 = query(
        collection(db, 'friendships'),
        where('userId', '==', currentUserId),
        where('friendId', '==', friendId)
      );
      
      const friendshipQuery2 = query(
        collection(db, 'friendships'),
        where('userId', '==', friendId),
        where('friendId', '==', currentUserId)
      );
      
      const [friendship1, friendship2] = await Promise.all([
        getDocs(friendshipQuery1),
        getDocs(friendshipQuery2)
      ]);
      
      // Delete both friendship records
      const deletePromises = [];
      
      friendship1.docs.forEach(doc => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      friendship2.docs.forEach(doc => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      await Promise.all(deletePromises);
      
      console.log(`Friend removed: ${friendId}`);
    } catch (error) {
      console.error('Error removing friend:', error);
      throw error;
    }
  }

  // Get friend's binders
  static async getFriendBinders(friendId: string): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'binders'),
        where('ownerId', '==', friendId),
        where('isPublic', '==', true),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const binders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return binders;
    } catch (error) {
      console.error('Error fetching friend binders:', error);
      return [];
    }
  }
}
