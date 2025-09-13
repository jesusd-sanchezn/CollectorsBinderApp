import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

// Test utility to verify the friends system is working
export const testFriendsSystem = async () => {
  try {
    console.log('🧪 Testing Friends System...');
    
    // Test 1: Check if users collection exists and has documents
    console.log('1. Checking users collection...');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`   Found ${usersSnapshot.docs.length} users in database`);
    
    usersSnapshot.docs.forEach((doc) => {
      const userData = doc.data();
      console.log(`   - User: ${userData.email} (${userData.displayName})`);
    });
    
    // Test 2: Check if binders are public
    console.log('2. Checking binders visibility...');
    const bindersSnapshot = await getDocs(collection(db, 'binders'));
    console.log(`   Found ${bindersSnapshot.docs.length} binders in database`);
    
    let publicBinders = 0;
    bindersSnapshot.docs.forEach((doc) => {
      const binderData = doc.data();
      if (binderData.isPublic) {
        publicBinders++;
      }
    });
    console.log(`   - ${publicBinders} binders are public`);
    
    // Test 3: Check friend requests collection
    console.log('3. Checking friend requests...');
    const requestsSnapshot = await getDocs(collection(db, 'friendRequests'));
    console.log(`   Found ${requestsSnapshot.docs.length} friend requests`);
    
    // Test 4: Check friendships collection
    console.log('4. Checking friendships...');
    const friendshipsSnapshot = await getDocs(collection(db, 'friendships'));
    console.log(`   Found ${friendshipsSnapshot.docs.length} friendships`);
    
    console.log('✅ Friends system test completed!');
    
  } catch (error) {
    console.error('❌ Error testing friends system:', error);
  }
};
