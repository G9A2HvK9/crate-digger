# Admin Setup Instructions

## Setting Up Your First Admin Account

Since all new accounts require admin approval, you need to manually set your first admin account.

### Option 1: Using Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/project/crate-digger-app/firestore)
2. Navigate to **Firestore Database**
3. Find the `users` collection
4. Locate your user document (by your email or UID)
5. Edit the document and set:
   - `isAdmin`: `true`
   - `approved`: `true`
6. Save the document

### Option 2: Using Firebase CLI

1. Install Firebase Admin SDK (if not already installed):
   ```bash
   npm install firebase-admin
   ```

2. Download your service account key:
   - Go to [Firebase Console > Project Settings > Service Accounts](https://console.firebase.google.com/project/crate-digger-app/settings/serviceaccounts/adminsdk)
   - Click "Generate new private key"
   - Save it as `serviceAccountKey.json` in the project root

3. Get your user UID:
   - Go to [Firebase Console > Authentication](https://console.firebase.google.com/project/crate-digger-app/authentication/users)
   - Find your user and copy the UID

4. Run the script:
   ```bash
   node scripts/set-admin.js YOUR_USER_UID
   ```

### Option 3: Using Firebase Console Directly

1. Sign up for an account in the app
2. Go to Firebase Console > Firestore
3. Find your user document in the `users` collection
4. Manually set `isAdmin: true` and `approved: true`

## How It Works

- **New users**: All new signups are created with `approved: false` and `isAdmin: false`
- **Pending users**: See a "Account Pending Approval" message until approved
- **Admin panel**: Only users with `isAdmin: true` can access the admin panel
- **Approval**: Admins can approve/reject users from the Admin Panel in the app

## Admin Panel Access

Once you're set as admin:
1. Log in to the app
2. Click on your email in the header
3. Select "Admin Panel" from the dropdown
4. You'll see all pending and approved users
5. Click "Approve" to approve a user, or "Reject" to reject them

