import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

// Helper script to make all existing binders public
export const updateAllBindersToPublic = async () => {
  try {
    console.log('Updating all binders to be public...');
    
    const bindersSnapshot = await getDocs(collection(db, 'binders'));
    const updatePromises = [];
    
    bindersSnapshot.docs.forEach((binderDoc) => {
      const binderData = binderDoc.data();
      if (!binderData.isPublic) {
        console.log(`Updating binder ${binderDoc.id} to be public`);
        updatePromises.push(
          updateDoc(doc(db, 'binders', binderDoc.id), {
            isPublic: true
          })
        );
      }
    });
    
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      console.log(`Updated ${updatePromises.length} binders to be public`);
    } else {
      console.log('All binders are already public');
    }
  } catch (error) {
    console.error('Error updating binders to public:', error);
  }
};
