import { useEffect, useRef } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { NotificationService } from '../lib/notificationService';
import { Trade } from '../types';

const toTrade = (doc: QueryDocumentSnapshot<DocumentData>): Trade => ({
  id: doc.id,
  ...(doc.data() as Trade),
});

export const useTradeNotifications = (userId?: string | null) => {
  const incomingInitialisedRef = useRef(false);
  const notifiedIncomingRef = useRef<Set<string>>(new Set());
  const notifiedAcceptedRef = useRef<Set<string>>(new Set());
  const notifiedDeclinedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) {
      return;
    }

    incomingInitialisedRef.current = false;
    notifiedIncomingRef.current.clear();
    notifiedAcceptedRef.current.clear();
    notifiedDeclinedRef.current.clear();

    // Listen for incoming trade requests (where user is recipient)
    const incomingTradesQuery = query(
      collection(db, 'trades'),
      where('recipientId', '==', userId),
      where('status', '==', 'pending')
    );

    const unsubscribeIncoming = onSnapshot(incomingTradesQuery, snapshot => {
      snapshot.docChanges().forEach(change => {
        const trade = toTrade(change.doc);
        if (!incomingInitialisedRef.current) {
          return;
        }

        if (change.type === 'added' && !notifiedIncomingRef.current.has(trade.id)) {
          notifiedIncomingRef.current.add(trade.id);
          const traderName = trade.initiatorName || 'Someone';
          const cardCount = trade.wants?.length || 0;
          NotificationService.notifyTradeRequest(traderName, trade.id, cardCount);
        }
      });

      incomingInitialisedRef.current = true;
    });

    // Listen for trades where user is initiator (to get accept/decline notifications)
    const outgoingTradesQuery = query(
      collection(db, 'trades'),
      where('initiatorId', '==', userId)
    );

    const unsubscribeOutgoing = onSnapshot(outgoingTradesQuery, snapshot => {
      snapshot.docChanges().forEach(change => {
        const trade = toTrade(change.doc);

        if (change.type === 'added') {
          // Skip initial load
          return;
        }

        if (!incomingInitialisedRef.current) {
          return;
        }

        // Check if status changed to accepted
        if (
          change.type === 'modified' &&
          trade.status === 'accepted' &&
          !notifiedAcceptedRef.current.has(trade.id)
        ) {
          notifiedAcceptedRef.current.add(trade.id);
          const acceptorName = trade.recipientName || 'Someone';
          NotificationService.notifyTradeAccepted(acceptorName, trade.id);
        }

        // Check if status changed to declined
        if (
          change.type === 'modified' &&
          trade.status === 'declined' &&
          !notifiedDeclinedRef.current.has(trade.id)
        ) {
          notifiedDeclinedRef.current.add(trade.id);
          const declinerName = trade.recipientName || 'Someone';
          NotificationService.notifyTradeDeclined(declinerName, trade.id);
        }
      });
    });

    return () => {
      unsubscribeIncoming();
      unsubscribeOutgoing();
    };
  }, [userId]);
};




