# GoAgents Backend

## Firebase Authentication Configuration

This application uses Firebase for authentication and database storage.

### Resolved Issues

#### 1. ACCESS_TOKEN_EXPIRED Error

The previous implementation faced issues with the Firebase Admin SDK token expiration:

```
Invalid JWT: Token must be a short-lived token (60 minutes) and in a reasonable timeframe. Check your iat and exp values in the JWT claim.
```

This was caused by:
- System time being incorrectly set (detected as April 12, 2025, which is in the future)
- Firebase Admin SDK's JWT tokens require system time to be accurate within 60 minutes

#### 2. Solution

We've implemented a hybrid approach:

1. **Firebase Client SDK** - Used for all Firestore operations (read/write data)
2. **Custom User Creation** - Implemented a client-side user creation function that mimics the Admin SDK's interface
3. **No JWT Tokens** - Eliminated dependency on system-time-sensitive tokens

### Firestore Security Rules

For this implementation to work, you must update your Firestore security rules in the Firebase Console to:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /Users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow create: if request.resource.data.email != null;
    }
  }
}
```

### Environment Variables

Required environment variables:
- `FIREBASE_PROJECT_ID`: Your Firebase project ID
- `FIREBASE_API_KEY`: Web API Key from Firebase console
- `FIREBASE_MESSAGING_SENDER_ID`: Firebase messaging sender ID
- `FIREBASE_APP_ID`: Firebase application ID 