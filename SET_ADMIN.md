# How to Set Yourself as Admin

## Quick Method: Firebase Console (Easiest)

1. **Find your User UID:**
   - Go to [Firebase Console > Authentication](https://console.firebase.google.com/project/crate-digger-app/authentication/users)
   - Find your email: `g9a2hvk9@gmail.com`
   - Copy your **User UID** (it's in the first column)

2. **Update your user document:**
   - Go to [Firestore Database](https://console.firebase.google.com/project/crate-digger-app/firestore)
   - Click on the `users` collection
   - Find your user document (by UID or email)
   - Click on the document to edit it
   - Add/update these fields:
     - `isAdmin`: `true` (boolean)
     - `approved`: `true` (boolean)
   - Click "Update"

3. **Done!** Log out and log back in, and you'll see "Admin Panel" in the header menu.

## Alternative: Using Script (If you have Firebase CLI set up)

1. Make sure you're logged in:
   ```bash
   firebase login
   ```

2. Install dependencies (if needed):
   ```bash
   npm install firebase-admin
   ```

3. Run the script:
   ```bash
   node scripts/set-admin-by-email.js g9a2hvk9@gmail.com
   ```

## What Happens Next

Once you're set as admin:
- You'll see "Admin Panel" in the header dropdown menu
- You can approve/reject new user signups
- Your account is automatically approved (admins don't need approval)

