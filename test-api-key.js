// Load environment variables
require('dotenv').config();

// Import Firebase modules
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } = require('firebase/auth');

// Log API key (partially obscured for security)
const apiKey = process.env.FIREBASE_API_KEY || '';
console.log('Testing API key:', apiKey.substring(0, 4) + '...' + (apiKey.length > 8 ? apiKey.substring(apiKey.length - 4) : ''));

// Configure Firebase with the new configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

console.log('Firebase Project ID:', process.env.FIREBASE_PROJECT_ID);
console.log('Firebase Storage Bucket:', firebaseConfig.storageBucket);
console.log('Firebase Messaging Sender ID:', firebaseConfig.messagingSenderId);

// Test Firebase connection
async function testFirebaseConnection() {
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    console.log('Firebase app initialized successfully');
    
    // Try email/password auth since anonymous auth may not be enabled
    const auth = getAuth(app);
    console.log('Auth initialized, testing Email/Password authentication...');
    
    // Generate a test email with timestamp to avoid collisions
    const timestamp = new Date().getTime();
    const testEmail = `test${timestamp}@example.com`;
    const testPassword = 'Test123456!';
    
    try {
      console.log(`Attempting to create a test user (${testEmail})...`);
      // Create a test user
      const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
      console.log('✅ SUCCESS: Test user created successfully!');
      
      // Test can sign in with this user
      console.log('Testing sign in with the new user...');
      await signInWithEmailAndPassword(auth, testEmail, testPassword);
      console.log('✅ SUCCESS: Sign in successful!');
      
      // Clean up - delete the test user
      console.log('Cleaning up: Deleting test user...');
      try {
        await deleteUser(userCredential.user);
        console.log('✅ Test user deleted successfully');
      } catch (deleteError) {
        console.log('⚠️ Could not delete test user automatically. It\'s not critical, but you may want to delete it manually.');
      }
      
      // Print next steps if successful
      console.log('\n✅ SUCCESS: Firebase API key and Email/Password authentication are working properly!');
      console.log('\nNext steps:');
      console.log('1. Start your server with: node server.js');
      console.log('2. Test your signup process');
    } catch (authError) {
      console.error('❌ ERROR: Authentication test failed:', authError.code, authError.message);
      
      // Check for common API key issues
      if (authError.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
        console.log('\nPossible solutions:');
        console.log('1. Your API key is incorrect. Check if it has been copied correctly without any spaces.');
        console.log('2. The API key may have been revoked or restricted. Check the Firebase Console.');
        console.log('3. Your project may have billing issues. Check Firebase Console > Project settings.');
      }
      
      if (authError.code === 'auth/admin-restricted-operation') {
        console.log('\n⚠️ The "auth/admin-restricted-operation" error typically means:');
        console.log('1. Your Firebase project is correctly configured but some security features are restricting the operation');
        console.log('2. You need to enable Email/Password authentication in Firebase Console:');
        console.log('   - Go to Firebase Console > Authentication > Sign-in method');
        console.log('   - Enable the Email/Password provider');
        console.log('3. If that doesn\'t work, you might need to adjust your Firebase Security Rules');
        console.log('\nAlternative: Try using the server directly, as user creation might still work from there.');
      }
      
      if (authError.code === 'auth/operation-not-allowed') {
        console.log('\nEmail/Password authentication is not enabled in Firebase Console.');
        console.log('Go to Firebase Console > Authentication > Sign-in method and enable Email/Password authentication');
        console.log('After enabling it, run this test again.');
      }
      
      if (authError.code === 'auth/email-already-in-use') {
        console.log('\nTest email is already in use. This actually indicates that:');
        console.log('1. Your Firebase API key is valid');
        console.log('2. Email/Password authentication is working');
        console.log('3. Try running the server: node server.js');
      }
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

testFirebaseConnection(); 