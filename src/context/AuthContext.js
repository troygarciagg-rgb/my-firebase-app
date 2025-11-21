import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

const ADMIN_EMAIL = 'tllethality@gmail.com';
const ADMIN_PASSWORD = 'qwerty123';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  
  const ensureUserDocument = async (user, { roleOverride, emailVerifiedOverride } = {}) => {
    if (!user) return null;
    
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    const desiredRole = roleOverride || (userDocSnap.exists() ? userDocSnap.data().role : null) || 'guest';
    const desiredEmailVerified = emailVerifiedOverride !== undefined
      ? emailVerifiedOverride
      : !!user.emailVerified;
    
    if (!userDocSnap.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName || (desiredRole === 'admin' ? 'Admin' : 'User'),
        role: desiredRole,
        photoURL: user.photoURL || '',
        emailVerified: desiredEmailVerified,
        createdAt: user.metadata?.creationTime || new Date().toISOString()
      });
      return desiredRole;
    }
    
    const updates = {};
    let shouldUpdate = false;
    
    if (roleOverride && userDocSnap.data().role !== roleOverride) {
      updates.role = roleOverride;
      shouldUpdate = true;
    }
    
    if (userDocSnap.data().emailVerified !== desiredEmailVerified) {
      updates.emailVerified = desiredEmailVerified;
      shouldUpdate = true;
    }
    
    if (shouldUpdate) {
      await updateDoc(userDocRef, updates);
    }
    
    return roleOverride || userDocSnap.data().role;
  };

  async function registerUser(email, password, name, role = 'guest') {
    // Prevent admin registration
    if (email.toLowerCase() === ADMIN_EMAIL) {
      throw new Error('You cannot register using this email.');
    }

    // Only allow guest or host roles
    if (role !== 'guest' && role !== 'host') {
      throw new Error('Invalid role. Only guests and hosts can register.');
    }

    // Create Firebase Auth account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      uid: userCredential.user.uid,
      email,
      name,
      role,
      photoURL: userCredential.user.photoURL || '',
      emailVerified: false, // Will be updated when user verifies email
      createdAt: new Date().toISOString()
    });

    // Send verification email
    await sendEmailVerification(userCredential.user);

    // Sign out the user immediately after signup
    await signOut(auth);

    return { user: userCredential.user, email, name };
  }

  async function loginUser(email, password) {
    const trimmedEmail = email.trim();
    const normalizedEmail = trimmedEmail.toLowerCase();
    const isAdminAccount = normalizedEmail === ADMIN_EMAIL;
    let userCredential;
    
    try {
      userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
    } catch (error) {
      const canBootstrapAdmin =
        isAdminAccount &&
        password === ADMIN_PASSWORD &&
        (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential');
      
      if (canBootstrapAdmin) {
        try {
          userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
          await updateProfile(userCredential.user, { displayName: 'Admin' });
        } catch (createError) {
          if (createError.code === 'auth/email-already-in-use') {
            throw new Error('Admin password is incorrect.');
          }
          throw createError;
        }
      } else {
        throw error;
      }
    }
    
    await reload(userCredential.user);
    
    if (!isAdminAccount && !userCredential.user.emailVerified) {
      await signOut(auth);
      throw new Error('Your email is not verified yet. Please check your inbox.');
    }
    
    await ensureUserDocument(userCredential.user, {
      roleOverride: isAdminAccount ? 'admin' : undefined,
      emailVerifiedOverride: isAdminAccount ? true : undefined
    });
    
    return userCredential;
  }

  async function sendVerificationEmail() {
    if (!currentUser) {
      throw new Error('User not found. Please log in first.');
    }
    
    try {
      await sendEmailVerification(currentUser);
      return { success: true, message: 'Verification email sent successfully!' };
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email. Please try again.');
    }
  }

  async function forgotPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  async function verifyResetCode(actionCode) {
    return verifyPasswordResetCode(auth, actionCode);
  }

  async function resetPassword(actionCode, newPassword) {
    return confirmPasswordReset(auth, actionCode, newPassword);
  }

  async function logoutUser() {
    localStorage.removeItem('authState');
    setCurrentUser(null);
    setUserRole(null);
    setEmailVerified(false);
    
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error during logout:', error);
      // Revert state if sign-out fails
      const user = auth.currentUser;
      if (user) {
        setCurrentUser(user);
      }
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await reload(user);
        setCurrentUser(user);
        
        const normalizedEmail = user.email?.toLowerCase() || '';
        const isAdminAccount = normalizedEmail === ADMIN_EMAIL;
        const isVerified = isAdminAccount ? true : user.emailVerified;
        setEmailVerified(isVerified);
        
        try {
          const role = await ensureUserDocument(user, {
            roleOverride: isAdminAccount ? 'admin' : undefined,
            emailVerifiedOverride: isAdminAccount ? true : undefined
          });
          if (role) {
            setUserRole(role);
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setEmailVerified(false);
        localStorage.removeItem('authState');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    emailVerified,
    registerUser,
    loginUser,
    logoutUser,
    sendVerificationEmail,
    forgotPassword,
    verifyResetCode,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
