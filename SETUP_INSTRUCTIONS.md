# Firebase Authentication Setup Instructions

## ✅ What Has Been Implemented

### 1. Email Verification System
- ✅ Users cannot log in unless their email is verified
- ✅ Verification email is sent automatically on signup
- ✅ Auto-login is prevented after signup
- ✅ Success message shown: "Check your email to verify your account"
- ✅ Email verification page created at `/verify-email`
- ✅ Unverified users are redirected to verification page

### 2. Firestore Security Rules
- ✅ Rules updated to require email verification for authenticated operations
- ✅ Users can only read/write their own data
- ✅ Role-based access control (host, guest, admin)
- ✅ Approved listings can be read by anyone (for browsing)
- ✅ All write operations require email verification

### 3. Route Protection
- ✅ Host pages accessible only to role: 'host'
- ✅ Guest pages accessible only to role: 'guest'
- ✅ Admin pages accessible only to role: 'admin'
- ✅ All protected routes check email verification

### 4. Error Handling
- ✅ Friendly error messages in login
- ✅ Friendly error messages in signup
- ✅ Specific error messages for different scenarios

## 🔧 Firebase Console Setup

### Step 1: Enable Email/Password Authentication
1. Go to Firebase Console → Authentication
2. Click "Get started" if not already enabled
3. Go to "Sign-in method" tab
4. Enable "Email/Password"
5. Click "Save"

### Step 2: Configure Email Templates (Optional)
1. Go to Authentication → Templates
2. Customize the email verification template if desired
3. Make sure the action URL points to your app

### Step 3: Update Firestore Security Rules
1. Go to Firebase Console → Firestore Database
2. Click on "Rules" tab
3. Copy the contents from `firestore.rules` file
4. Paste into the rules editor
5. Click "Publish"

### Step 4: Test the Setup
1. Register a new account
2. Check your email for verification link
3. Click the verification link
4. Try to log in
5. You should be redirected to your dashboard based on role

## 📝 Important Notes

### Email Verification
- Users must verify their email before they can log in
- Verification email is sent automatically on signup
- Users are signed out immediately after signup
- Users can resend verification email from `/verify-email` page

### Security Rules
- All authenticated operations require email verification
- Users can only access their own data
- Role-based access is enforced at the database level
- Approved listings are publicly readable (for browsing)

### Roles
- Three roles: `host`, `guest`, `admin`
- Role is stored in Firestore under `users/{uid}/role`
- Role is checked on every protected route
- Role is checked in Firestore security rules

## 🐛 Troubleshooting

### "Missing or insufficient permissions" Error
1. Make sure Firestore rules are published
2. Make sure user's email is verified
3. Check that user has the correct role in Firestore
4. Verify the user document exists in `users/{uid}`

### Email Not Received
1. Check spam folder
2. Use "Resend Verification Email" button
3. Make sure email address is correct
4. Check Firebase Console → Authentication → Users to see if user exists

### Cannot Login After Verification
1. Make sure you clicked the verification link
2. Try refreshing the page
3. Clear browser cache
4. Check browser console for errors

## 📋 Testing Checklist

- [ ] Register a new account (should show success message)
- [ ] Check email for verification link
- [ ] Click verification link
- [ ] Try to log in (should work)
- [ ] Try to access protected route (should work)
- [ ] Try to access wrong role route (should redirect)
- [ ] Try to log in without verification (should fail)
- [ ] Test resend verification email button

