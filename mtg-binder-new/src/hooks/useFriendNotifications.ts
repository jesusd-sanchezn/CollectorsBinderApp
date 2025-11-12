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
import { FriendRequest } from '../lib/friendsService';

const toFriendRequest = (doc: QueryDocumentSnapshot<DocumentData>): FriendRequest => ({
  id: doc.id,
  ...(doc.data() as FriendRequest),
});

export const useFriendNotifications = (userId?: string | null) => {
  const incomingInitialisedRef = useRef(false);
  const outgoingInitialisedRef = useRef(false);
  const notifiedIncomingRef = useRef<Set<string>>(new Set());
  const notifiedAcceptedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) {
      return;
    }

    incomingInitialisedRef.current = false;
    outgoingInitialisedRef.current = false;
    notifiedIncomingRef.current.clear();
    notifiedAcceptedRef.current.clear();

    const incomingQuery = query(
      collection(db, 'friendRequests'),
      where('toUserId', '==', userId),
      where('status', '==', 'pending')
    );

    const unsubscribeIncoming = onSnapshot(incomingQuery, snapshot => {
      snapshot.docChanges().forEach(change => {
        const data = toFriendRequest(change.doc);
        if (!incomingInitialisedRef.current) {
          return;
        }

        if (change.type === 'added' && !notifiedIncomingRef.current.has(data.id)) {
          notifiedIncomingRef.current.add(data.id);
          NotificationService.notifyFriendRequest(
            data.fromUserName || data.fromUserEmail,
            data.fromUserId
          );
        }
      });

      incomingInitialisedRef.current = true;
    });

    const outgoingQuery = query(
      collection(db, 'friendRequests'),
      where('fromUserId', '==', userId)
    );

    const unsubscribeOutgoing = onSnapshot(outgoingQuery, snapshot => {
      snapshot.docChanges().forEach(change => {
        const data = toFriendRequest(change.doc);

        if (change.type === 'added') {
          // Skip initial load
          return;
        }

        if (!outgoingInitialisedRef.current) {
          return;
        }

        if (
          data.status === 'accepted' &&
          !notifiedAcceptedRef.current.has(data.id)
        ) {
          notifiedAcceptedRef.current.add(data.id);
          NotificationService.notifyFriendAccepted(
            data.toUserName || data.toUserEmail,
            data.toUserId
          );
        }
      });

      outgoingInitialisedRef.current = true;
    });

    return () => {
      unsubscribeIncoming();
      unsubscribeOutgoing();
    };
  }, [userId]);
};

