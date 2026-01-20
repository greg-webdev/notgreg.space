# Firebase Firestore Security Rules for aiai0

## Rules

Copy these rules to your Firebase Console > Firestore Database > Rules tab:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own chats
    match /users/{userId}/chats/{chatId} {
      allow read, write: if request.auth.uid == userId;
      
      // Allow authenticated users to read/write messages in their chats
      match /messages/{messageId} {
        allow read, write: if request.auth.uid == userId;
      }
    }
  }
}
```

## Explanation

- **Authentication Required**: Only authenticated users (with valid Firebase UID) can access data
- **User-Based Access**: Each user can only access chats and messages under `/users/{userId}/` where `userId` matches their Firebase UID
- **Chat Structure**:
  - `/users/{userId}/chats/{chatId}` - Chat metadata (title, createdAt, etc.)
  - `/users/{userId}/chats/{chatId}/messages/{messageId}` - Individual chat messages

## Setup Instructions

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project **aiai0-f06f1**
3. Navigate to **Firestore Database** > **Rules** tab
4. Replace all content with the rules above
5. Click **Publish**

## Notes

- Anonymous users are **not** allowed (handled by app code - non-auth users use localStorage)
- Only one Firebase project is now used: **aiai0**
- Custom tokens are supported if `initialAuthToken` is provided
