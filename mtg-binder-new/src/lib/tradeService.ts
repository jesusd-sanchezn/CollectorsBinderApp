import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Trade, TradeItem } from '../types';
import { NotificationService } from './notificationService';

export class TradeService {
  // Helper method to get current user ID
  private static getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to perform this action');
    }
    return user.uid;
  }

  // Create a new trade request
  static async createTrade(
    recipientId: string,
    recipientName: string,
    wants: TradeItem[],
    offers: TradeItem[] = []
  ): Promise<string> {
    try {
      const currentUserId = this.getCurrentUserId();
      
      if (wants.length === 0) {
        throw new Error('You must select at least one card to request');
      }

      const tradeData = {
        initiatorId: currentUserId,
        recipientId,
        recipientName,
        status: 'pending' as const,
        wants,
        offers,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'trades'), tradeData);
      console.log('Trade created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating trade:', error);
      throw error;
    }
  }

  // Get all trades for the current user (both initiated and received)
  static async getUserTrades(): Promise<Trade[]> {
    try {
      const currentUserId = this.getCurrentUserId();
      
      const q = query(
        collection(db, 'trades'),
        where('initiatorId', '==', currentUserId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const trades = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Trade));

      // Also get trades where user is recipient
      const q2 = query(
        collection(db, 'trades'),
        where('recipientId', '==', currentUserId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot2 = await getDocs(q2);
      const trades2 = querySnapshot2.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Trade));

      return [...trades, ...trades2];
    } catch (error) {
      console.error('Error fetching trades:', error);
      return [];
    }
  }

  // Get pending trades (trades waiting for user's response)
  static async getPendingTrades(): Promise<Trade[]> {
    try {
      const currentUserId = this.getCurrentUserId();
      
      const q = query(
        collection(db, 'trades'),
        where('recipientId', '==', currentUserId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Trade));
    } catch (error) {
      console.error('Error fetching pending trades:', error);
      return [];
    }
  }

  // Get a specific trade
  static async getTrade(tradeId: string): Promise<Trade | null> {
    try {
      const docRef = doc(db, 'trades', tradeId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as Trade;
      }
      return null;
    } catch (error) {
      console.error('Error fetching trade:', error);
      throw error;
    }
  }

  // Accept a trade
  static async acceptTrade(tradeId: string): Promise<void> {
    try {
      const trade = await this.getTrade(tradeId);
      if (!trade) throw new Error('Trade not found');

      const currentUserId = this.getCurrentUserId();
      if (trade.recipientId !== currentUserId) {
        throw new Error('Only the recipient can accept a trade');
      }

      await updateDoc(doc(db, 'trades', tradeId), {
        status: 'accepted',
        updatedAt: serverTimestamp()
      });

      // Send notification to initiator
      try {
        const currentUser = auth.currentUser;
        const recipientName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Someone';
        await NotificationService.notifyTradeAccepted(recipientName, tradeId);
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // Don't fail the entire operation if notification fails
      }
    } catch (error) {
      console.error('Error accepting trade:', error);
      throw error;
    }
  }

  // Decline a trade
  static async declineTrade(tradeId: string): Promise<void> {
    try {
      const trade = await this.getTrade(tradeId);
      if (!trade) throw new Error('Trade not found');

      const currentUserId = this.getCurrentUserId();
      if (trade.recipientId !== currentUserId) {
        throw new Error('Only the recipient can decline a trade');
      }

      await updateDoc(doc(db, 'trades', tradeId), {
        status: 'declined',
        updatedAt: serverTimestamp()
      });

      // Send notification to initiator
      try {
        const currentUser = auth.currentUser;
        const recipientName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Someone';
        await NotificationService.notifyTradeDeclined(recipientName, tradeId);
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // Don't fail the entire operation if notification fails
      }
    } catch (error) {
      console.error('Error declining trade:', error);
      throw error;
    }
  }

  // Cancel a trade (initiator can cancel)
  static async cancelTrade(tradeId: string): Promise<void> {
    try {
      const trade = await this.getTrade(tradeId);
      if (!trade) throw new Error('Trade not found');

      const currentUserId = this.getCurrentUserId();
      if (trade.initiatorId !== currentUserId) {
        throw new Error('Only the initiator can cancel a trade');
      }

      await deleteDoc(doc(db, 'trades', tradeId));
    } catch (error) {
      console.error('Error canceling trade:', error);
      throw error;
    }
  }
}

