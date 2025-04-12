// Firebase client SDK configuration
const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  connectAuthEmulator 
} = require('firebase/auth');
const { getFirestore, initializeFirestore } = require('firebase/firestore');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

/**
 * Initialize Firebase client using environment variables
 */
const initializeFirebaseClient = () => {
  // Load required environment variables
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  };

  // Check for missing or placeholder API key
  if (!firebaseConfig.apiKey) {
    console.error('ERROR: FIREBASE_API_KEY environment variable is missing!');
    console.error('Please set a valid Firebase Web API key in your .env file');
    throw new Error('FIREBASE_API_KEY environment variable is required');
  }

  console.log('Initializing Firebase client with config:', {
    ...firebaseConfig,
    // Don't log the API key for security reasons
    apiKey: firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0, 5) + '...' : undefined
  });

  // Check if Firebase project ID is provided
  if (!firebaseConfig.projectId) {
    throw new Error('FIREBASE_PROJECT_ID environment variable is required');
  }

  try {
    // Initialize Firebase app
    const app = initializeApp(firebaseConfig);
    console.log('Firebase client app initialized successfully');

    // Initialize Firebase Auth
    const auth = getAuth(app);
    console.log('Firebase Auth initialized');

    // Initialize Firestore with settings
    const firestore = initializeFirestore(app, {
      experimentalForceLongPolling: true, // This may help with connectivity issues
      ignoreUndefinedProperties: true,
    });
    console.log('Firebase Firestore initialized');

    // Helper function to create user - with enhanced error handling
    const createUser = async (email, password, displayName) => {
      try {
        console.log(`Creating user ${email} using Firebase client SDK`);
        
        // Check for developer emulator environment (useful for local testing)
        if (process.env.NODE_ENV === 'development' && process.env.FIREBASE_AUTH_EMULATOR_HOST) {
          connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
          console.log(`Connected to Firebase Auth emulator at ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
        }
        
        // Create the user with Firebase client SDK
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log(`User created successfully with UID: ${userCredential.user.uid}`);
        
        // Return a format compatible with admin.auth().createUser() result
        return {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          emailVerified: userCredential.user.emailVerified,
          displayName: displayName,
          providerData: userCredential.user.providerData,
          metadata: {
            creationTime: userCredential.user.metadata.creationTime,
            lastSignInTime: userCredential.user.metadata.lastSignInTime
          }
        };
      } catch (error) {
        console.error('Error creating user with Firebase client SDK:', error.code, error.message);
        
        // Provide detailed error messages based on error code
        if (error.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
          console.error('\n====== FIREBASE API KEY ERROR ======');
          console.error('Your Firebase API key is invalid or has been revoked.');
          console.error('Please get a new API key from the Firebase Console:');
          console.error('1. Go to Firebase Console > Project Settings');
          console.error('2. Under "Your apps", find your web app');
          console.error('3. Copy the apiKey value and update it in your .env file');
          console.error('====================================\n');
        }
        
        // Handle and map specific error codes
        if (error.code === 'auth/email-already-in-use') {
          console.log('Email already in use - checking if we can authenticate with these credentials');
          
          try {
            // Try to sign in with the provided credentials
            const signInResult = await signInWithEmailAndPassword(auth, email, password);
            console.log(`User already exists, signed in successfully with UID: ${signInResult.user.uid}`);
            
            // Return the existing user info
            return {
              uid: signInResult.user.uid,
              email: signInResult.user.email,
              emailVerified: signInResult.user.emailVerified,
              displayName: displayName || signInResult.user.displayName,
              providerData: signInResult.user.providerData,
              metadata: {
                creationTime: signInResult.user.metadata.creationTime,
                lastSignInTime: signInResult.user.metadata.lastSignInTime
              },
              alreadyExists: true
            };
          } catch (signInError) {
            console.error('Failed to sign in with existing user credentials:', signInError.code, signInError.message);
          }
        }
        
        if (error.code === 'auth/operation-not-allowed') {
          console.error('\n====== FIREBASE AUTHENTICATION ERROR ======');
          console.error('Email/password accounts are not enabled in the Firebase console!');
          console.error('You need to enable Email/Password authentication in the Firebase Console:');
          console.error('1. Go to Firebase Console > Authentication > Sign-in method');
          console.error('2. Enable the Email/Password provider');
          console.error('==========================================\n');
        }
        
        if (error.code === 'auth/invalid-credential') {
          console.error('\n====== FIREBASE CREDENTIAL ERROR ======');
          console.error('The Firebase credential is invalid. Check your API key and project configuration.');
          console.error('This may happen if:');
          console.error('1. Your Firebase project has been deleted');
          console.error('2. Your API key has restrictions that prevent it from being used on your server');
          console.error('3. Your Firebase billing account has issues');
          console.error('======================================\n');
        }
        
        // Rethrow the error to be handled by the calling function
        throw error;
      }
    };

    return {
      app,
      auth,
      firestore,
      createUser // Export the createUser function
    };
  } catch (error) {
    console.error('Firebase client initialization error:', error);
    throw error;
  }
};

// Initialize Firebase client
const firebaseClient = initializeFirebaseClient();

// Export the client SDK
module.exports = {
  ...firebaseClient,
  // Provide a dummy admin object with createUser method that uses the client SDK instead
  admin: {
    auth: () => ({
      createUser: (userParams) => firebaseClient.createUser(
        userParams.email, 
        userParams.password, 
        userParams.displayName
      )
    })
  }
}; 