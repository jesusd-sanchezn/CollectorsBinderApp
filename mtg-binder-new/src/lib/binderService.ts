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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, functions, auth, storage } from './firebase';
import { Binder, BinderPage, BinderSlot, Card } from '../types';

// Initialize functions (we'll need to add this to firebase.ts)
// import { getFunctions } from 'firebase/functions';

export class BinderService {
  // Helper method to get current user ID
  private static getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to perform this action');
    }
    return user.uid;
  }

  private static normalizeBinderData(binderId: string, data: any): Binder {
    const pagesFromDb: any[] = Array.isArray(data.pages) ? data.pages : [];

    const pages: BinderPage[] = pagesFromDb.map((page, pageIndex) => {
      const slotsFromDb: any[] = Array.isArray(page?.slots) ? page.slots : [];
      const pageNumber = page?.pageNumber ?? pageIndex + 1;

      const slots: BinderSlot[] = Array.from({ length: 9 }).map((_, slotIndex) => {
        const slot = slotsFromDb[slotIndex];
        const hasCard = slot && slot.isEmpty === false && slot.card;

        const slotData: BinderSlot = {
          id: slot?.id || `${binderId}-${pageNumber}-${slotIndex}`,
          position: slot?.position ?? slotIndex,
          isEmpty: !hasCard,
        };

        if (hasCard) {
          slotData.card = this.sanitizeCard(slot.card as Card);
        }

        return slotData;
      });

      return {
        id: page?.id || `page-${pageNumber}`,
        pageNumber,
        slots,
      };
    });

    const sanitizedPages = this.sanitizePages(pages);

    if (sanitizedPages.length === 0) {
      sanitizedPages.push({
        id: 'page-1',
        pageNumber: 1,
        slots: Array.from({ length: 9 }).map((_, index) => ({
          id: `slot-1-${index}`,
          position: index,
          isEmpty: true,
        })),
      });
    }

    return {
      id: binderId,
      ownerId: data.ownerId,
      name: data.name || 'Binder',
      description: data.description || '',
      isPublic: !!data.isPublic,
      backgroundImageUrl: data.backgroundImageUrl || undefined,
      pages: sanitizedPages,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as Binder;
  }

  private static sanitizeCard(card: Card): Card {
    const sanitized: any = { ...card };
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === undefined) {
        delete sanitized[key];
      }
    });
    return sanitized as Card;
  }

  private static sanitizePages(pages: BinderPage[]): BinderPage[] {
    return pages.map(page => ({
      ...page,
      slots: page.slots.map(slot => {
        const sanitizedSlot: BinderSlot = {
          id: slot.id,
          position: slot.position,
          isEmpty: slot.isEmpty,
        };

        if (!slot.isEmpty && slot.card) {
          sanitizedSlot.card = this.sanitizeCard(slot.card);
        }

        return sanitizedSlot;
      }),
    }));
  }

  // Create a new binder
  static async createBinder(name: string, description?: string, isPublic: boolean = true): Promise<string> {
    try {
      const userId = this.getCurrentUserId();
      
      const binderData = {
        name,
        description: description || '',
        isPublic,
        pages: [this.createEmptyPage(1)],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ownerId: userId,
      };

      const docRef = await addDoc(collection(db, 'binders'), binderData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating binder:', error);
      throw error;
    }
  }

  // Save a binder to Firebase (useful for creating binders with specific IDs)
  static async saveBinder(binder: Binder): Promise<void> {
    try {
      const binderData = {
        ...binder,
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'binders', binder.id), binderData);
    } catch (error) {
      console.error('Error saving binder:', error);
      throw error;
    }
  }

  // Get all binders for the current user
  static async getUserBinders(): Promise<Binder[]> {
    try {
      const userId = this.getCurrentUserId();
      
      const q = query(
        collection(db, 'binders'),
        where('ownerId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      const binders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Binder));
      
      return binders;
    } catch (error) {
      console.error('Error fetching binders:', error);
      // Return empty array instead of throwing error for better UX
      return [];
    }
  }

  // Get a specific binder
  static async getBinder(binderId: string): Promise<Binder | null> {
    try {
      const docRef = doc(db, 'binders', binderId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return this.normalizeBinderData(docSnap.id, docSnap.data());
      }
      return null;
    } catch (error) {
      console.error('Error fetching binder:', error);
      throw error;
    }
  }

  // Delete a binder
  static async deleteBinder(binderId: string): Promise<void> {
    try {
      const binder = await this.getBinder(binderId);
      if (!binder) throw new Error('Binder not found');

      const userId = this.getCurrentUserId();
      if (binder.ownerId !== userId) {
        throw new Error('Only the owner can delete the binder');
      }

      await deleteDoc(doc(db, 'binders', binderId));
    } catch (error) {
      console.error('Error deleting binder:', error);
      throw error;
    }
  }

  // Add a page to a binder
  static async addPageToBinder(binderId: string): Promise<void> {
    try {
      const binder = await this.getBinder(binderId);
      if (!binder) throw new Error('Binder not found');

      const newPageNumber = binder.pages.length + 1;
      const newPage = this.createEmptyPage(newPageNumber);

      const updatedPages = [...binder.pages, newPage];
      
      const sanitizedPages = this.sanitizePages(updatedPages);
      await updateDoc(doc(db, 'binders', binderId), {
        pages: sanitizedPages,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding page:', error);
      throw error;
    }
  }

  // Add a card to a specific slot
  static async addCardToSlot(
    binderId: string, 
    pageNumber: number, 
    slotPosition: number, 
    card: Card
  ): Promise<void> {
    try {
      const binder = await this.getBinder(binderId);
      if (!binder) throw new Error('Binder not found');

      const pageIndex = pageNumber - 1;
      if (pageIndex < 0 || pageIndex >= binder.pages.length) {
        throw new Error('Invalid page number');
      }

      const updatedPages = [...binder.pages];
      const slotIndex = slotPosition;
      
      if (slotIndex < 0 || slotIndex >= 9) {
        throw new Error('Invalid slot position');
      }

      updatedPages[pageIndex].slots[slotIndex] = {
        id: `${binderId}-${pageNumber}-${slotPosition}`,
        position: slotPosition,
        card: this.sanitizeCard(card),
        isEmpty: false
      } as BinderSlot;

      const sanitizedPages = this.sanitizePages(updatedPages);

      await updateDoc(doc(db, 'binders', binderId), {
        pages: sanitizedPages,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding card to slot:', error);
      throw error;
    }
  }

  // Remove a card from a specific slot
  static async removeCardFromSlot(
    binderId: string, 
    pageNumber: number, 
    slotPosition: number
  ): Promise<void> {
    try {
      const binder = await this.getBinder(binderId);
      if (!binder) throw new Error('Binder not found');

      const pageIndex = pageNumber - 1;
      if (pageIndex < 0 || pageIndex >= binder.pages.length) {
        throw new Error('Invalid page number');
      }

      const updatedPages = [...binder.pages];
      const slotIndex = slotPosition;
      
      if (slotIndex < 0 || slotIndex >= 9) {
        throw new Error('Invalid slot position');
      }

      // Set the slot back to empty
      updatedPages[pageIndex].slots[slotIndex] = {
        id: `slot-${pageNumber}-${slotPosition}`,
        position: slotPosition,
        isEmpty: true
      };

      const sanitizedPages = this.sanitizePages(updatedPages);

      await updateDoc(doc(db, 'binders', binderId), {
        pages: sanitizedPages,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error removing card from slot:', error);
      throw error;
    }
  }

  // Rearrange cards to fill empty slots and remove empty pages
  static async rearrangeCards(binderId: string): Promise<void> {
    try {
      const binder = await this.getBinder(binderId);
      if (!binder) throw new Error('Binder not found');

      // Collect all non-empty cards
      const allCards: Array<{card: Card, originalPage: number, originalSlot: number}> = [];
      
      binder.pages.forEach((page, pageIndex) => {
        page.slots.forEach((slot, slotIndex) => {
          if (!slot.isEmpty && slot.card) {
            allCards.push({
              card: slot.card,
              originalPage: pageIndex + 1,
              originalSlot: slotIndex
            });
          }
        });
      });

      // Calculate how many pages we need
      const totalCards = allCards.length;
      const pagesNeeded = Math.ceil(totalCards / 9);

      // Create new pages structure
      const newPages: BinderPage[] = [];
      
      for (let pageNum = 1; pageNum <= pagesNeeded; pageNum++) {
        const slots: BinderSlot[] = [];
        
        for (let slotNum = 0; slotNum < 9; slotNum++) {
          const cardIndex = (pageNum - 1) * 9 + slotNum;
          
          if (cardIndex < allCards.length) {
            // Fill with a card
            slots.push({
              id: `${binderId}-${pageNum}-${slotNum}`,
              position: slotNum,
              card: this.sanitizeCard(allCards[cardIndex].card),
              isEmpty: false
            });
          } else {
            // Empty slot
            slots.push({
              id: `slot-${pageNum}-${slotNum}`,
              position: slotNum,
              isEmpty: true
            });
          }
        }
        
        newPages.push({
          id: `page-${pageNum}`,
          pageNumber: pageNum,
          slots
        });
      }

      const sanitizedPages = this.sanitizePages(newPages);

      // Update the binder with rearranged pages
      await updateDoc(doc(db, 'binders', binderId), {
        pages: sanitizedPages,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error rearranging cards:', error);
      throw error;
    }
  }

  // Import cards from CSV using our existing Firebase function
  static async importCardsFromCSV(csvData: string, binderId: string): Promise<any> {
    try {
      // We'll need to add the functions import to firebase.ts
      const importDelverCsv = httpsCallable(functions, 'importDelverCsv');
      
      const result = await importDelverCsv({
        csvData,
        binderId
      });
      
      return result.data;
    } catch (error) {
      console.error('Error importing CSV:', error);
      throw error;
    }
  }

  // Helper method to convert URI to Blob using XMLHttpRequest
  private static uriToBlob(uri: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        resolve(xhr.response);
      };
      xhr.onerror = function () {
        reject(new Error('Failed to convert URI to Blob'));
      };
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
  }

  // Upload image to Firebase Storage and get URL
  static async uploadImage(uri: string, binderId: string): Promise<string> {
    try {
      const userId = this.getCurrentUserId();
      
      // Convert URI to Blob
      const blob = await this.uriToBlob(uri);
      
      // Create a reference to the storage location
      const imageRef = ref(storage, `binder-backgrounds/${userId}/${binderId}-${Date.now()}.jpg`);
      
      // Upload the blob
      await uploadBytes(imageRef, blob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(imageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  }

  // Update binder background image
  static async updateBinderBackground(binderId: string, backgroundImageUrl: string): Promise<void> {
    try {
      const binder = await this.getBinder(binderId);
      if (!binder) throw new Error('Binder not found');
      
      const userId = this.getCurrentUserId();
      if (binder.ownerId !== userId) {
        throw new Error('Only the owner can update the binder');
      }

      await updateDoc(doc(db, 'binders', binderId), {
        backgroundImageUrl: backgroundImageUrl || '',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating binder background:', error);
      throw error;
    }
  }

  // Helper method to create an empty page with 3x3 grid (9 slots)
  private static createEmptyPage(pageNumber: number): BinderPage {
    const slots: BinderSlot[] = [];
    for (let i = 0; i < 9; i++) {
      slots.push({
        id: `slot-${pageNumber}-${i}`,
        position: i,
        isEmpty: true
      });
    }

    return {
      id: `page-${pageNumber}`,
      pageNumber,
      slots
    };
  }
}
