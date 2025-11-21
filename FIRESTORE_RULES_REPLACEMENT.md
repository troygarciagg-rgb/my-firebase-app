# Firestore Rules Replacement Guide

## ⚠️ You MUST Replace Your Current Rules

Your current rules have **security vulnerabilities** and won't work with our system.

---

## 🔴 Problems with Your Current Rules:

1. **Properties collection is too open:**
   - `allow write: if request.auth != null` means ANY authenticated user can create/edit properties
   - Should only allow hosts to create their own properties

2. **No email verification:**
   - Our system requires email verification before users can perform actions
   - Your rules don't check this

3. **No role checking:**
   - Doesn't verify if user is a "host"
   - Doesn't check user roles from Firestore

4. **Admin check won't work:**
   - `request.auth.token.admin == true` won't work
   - Our admin is hardcoded (admin@gmail.com) and doesn't use Firebase Auth
   - Admin won't have a Firebase Auth token

---

## ✅ Replace With These Rules:

Copy and paste this into your Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isEmailVerified() {
      return isAuthenticated() && request.auth.token.email_verified == true;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && isEmailVerified() && request.auth.uid == userId;
    }
    
    function getUserRole() {
      // Safely get user role from Firestore
      let userDoc = get(/databases/$(database)/documents/users/$(request.auth.uid));
      return userDoc != null && userDoc.data != null ? userDoc.data.role : null;
    }
    
    function isAdmin() {
      // Note: Hardcoded admin (admin@gmail.com) won't pass this check
      // Admin operations may need backend SDK or special handling
      return isAuthenticated() && isEmailVerified() && getUserRole() == 'admin';
    }
    
    function isHost() {
      return isAuthenticated() && isEmailVerified() && getUserRole() == 'host';
    }
    
    function isGuest() {
      return isAuthenticated() && isEmailVerified() && getUserRole() == 'guest';
    }
    
    // Users collection
    match /users/{userId} {
      // Users can read their own data, admins can read all
      allow read: if isOwner(userId) || isAdmin();
      // Users can create their own document (during signup, before email verification)
      allow create: if isAuthenticated() && request.auth.uid == userId;
      // Users can update their own data (only if email verified)
      allow update: if isOwner(userId);
      // Only admins can delete users
      allow delete: if isAdmin();
    }
    
    // Properties collection (main collection for property listings)
    match /properties/{propertyId} {
      // Anyone can read approved properties (no auth required for browsing)
      // Hosts can read their own properties, admins can read all
      allow read: if resource == null || 
                     (resource != null && resource.data.status == 'approved') || 
                     (isAuthenticated() && isEmailVerified() && resource != null && resource.data.hostId == request.auth.uid) ||
                     isAdmin();
      
      // Only verified hosts can create properties
      allow create: if isHost() && request.resource.data.hostId == request.auth.uid;
      
      // Hosts can update their own properties, admins can update any
      allow update: if (isHost() && resource.data.hostId == request.auth.uid) || isAdmin();
      
      // Hosts can delete their own properties, admins can delete any
      allow delete: if (isHost() && resource.data.hostId == request.auth.uid) || isAdmin();
    }
    
    // Listings collection (kept for backward compatibility)
    match /listings/{listingId} {
      allow read: if resource == null || 
                     (resource != null && resource.data.status == 'approved') || 
                     (isAuthenticated() && isEmailVerified() && resource != null && resource.data.hostId == request.auth.uid) ||
                     isAdmin();
      allow create: if isHost() && request.resource.data.hostId == request.auth.uid;
      allow update: if (isHost() && resource.data.hostId == request.auth.uid) || isAdmin();
      allow delete: if (isHost() && resource.data.hostId == request.auth.uid) || isAdmin();
    }
    
    // Bookings collection
    match /bookings/{bookingId} {
      allow read: if (isAuthenticated() && isEmailVerified() && resource != null && resource.data.guestId == request.auth.uid) || 
                     (isHost() && resource != null && resource.data.hostId == request.auth.uid) ||
                     isAdmin();
      allow create: if isGuest() && request.resource.data.guestId == request.auth.uid;
      allow update: if (isHost() && resource.data.hostId == request.auth.uid) ||
                     (isGuest() && resource.data.guestId == request.auth.uid) ||
                     isAdmin();
      allow delete: if isAdmin();
    }
    
    // Reviews collection
    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if isGuest() && request.resource.data.guestId == request.auth.uid;
      allow update: if (isGuest() && resource.data.guestId == request.auth.uid) || isAdmin();
      allow delete: if (isGuest() && resource.data.guestId == request.auth.uid) || isAdmin();
    }
    
    // Admin reports collection
    match /adminReports/{reportId} {
      allow read, write: if isAdmin();
    }
    
    // Payments collection
    match /payments/{paymentId} {
      allow read: if isOwner(resource.data.userId) || isAdmin();
      allow write: if isAdmin();
    }
  }
}
```

---

## 📋 How to Replace:

1. Go to **Firebase Console** → **Firestore Database** → **Rules** tab
2. **Delete** all your current rules
3. **Paste** the rules above
4. Click **"Publish"** button
5. Wait for confirmation

---

## 🔐 Key Security Improvements:

### ✅ Properties Collection:
- **Read**: Anyone can read approved properties (for browsing)
- **Create**: Only verified hosts can create (and only their own)
- **Update**: Only hosts can update their own properties
- **Delete**: Only hosts can delete their own properties

### ✅ Email Verification:
- All write operations require verified email
- Users must verify email before creating properties/bookings

### ✅ Role-Based Access:
- Hosts can only manage their own properties
- Guests can only create their own bookings
- Admins have full access (if using Firebase Auth)

---

## ⚠️ Important Note About Admin:

**Your hardcoded admin (admin@gmail.com) won't work with these rules** because:
- Admin doesn't use Firebase Auth (no auth token)
- Firestore rules require Firebase Auth
- Admin operations will be blocked

### Solutions:

**Option 1: Create Real Admin User (Recommended)**
1. Create admin user in Firebase Auth manually
2. Add admin document to Firestore `users` collection with `role: 'admin'`
3. Update login to use Firebase Auth for admin
4. Then admin will work with Firestore rules

**Option 2: Use Backend SDK**
- Use Firebase Admin SDK on backend
- Bypass Firestore rules for admin operations
- More secure but requires backend setup

**Option 3: Temporary Workaround**
- For now, admin can't directly access Firestore
- Admin operations may need to be handled differently
- Consider creating real admin user for production

---

## ✅ After Replacing Rules:

1. **Test host property creation:**
   - Login as host (verified email)
   - Try creating a property
   - Should work ✅

2. **Test guest trying to create property:**
   - Login as guest
   - Try creating a property
   - Should be blocked ❌

3. **Test unverified user:**
   - Try creating property without verifying email
   - Should be blocked ❌

---

## 🎯 Summary:

**YES, you MUST replace your current rules** because:
- ❌ Current rules allow ANY user to create properties
- ❌ No email verification requirement
- ❌ No role checking
- ❌ Security vulnerability

**New rules provide:**
- ✅ Only hosts can create properties
- ✅ Email verification required
- ✅ Role-based access control
- ✅ Proper security

**Replace immediately!** 🔒

