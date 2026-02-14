import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import toast from 'react-hot-toast';

if (!auth || !db) {
  console.warn('Firebase not initialized. Please set up your Firebase config in .env.local');
}

export interface UserData {
  name: string;
  email: string;
  role: 'user' | 'admin';
  enrolledCourses?: string[]; // Array of course IDs
}

export const signUp = async (email: string, password: string, name: string, role: 'user' | 'admin' = 'user') => {
  if (!auth || !db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Send email verification
    await sendEmailVerification(user);
    
    // Store user details in Firestore
    const userData: UserData = {
      name,
      email,
      role,
    };
    
    await setDoc(doc(db, 'users', user.uid), userData);
    
    toast.success('Account created! Please check your email for verification.');
    return user;
  } catch (error: any) {
    toast.error(error.message || 'Error creating account');
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  if (!auth || !db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check if email is verified
   // if (!user.emailVerified) {
     // toast.error('Please verify your email before signing in');
      //await signOut(auth);
      //return null;
    //}

    // Check if user document exists, create if not
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      const userData: UserData = {
        name: user.displayName || email.split('@')[0],
        email: user.email || email,
        role: 'user',
      };
      await setDoc(doc(db, 'users', user.uid), userData);
    }

    toast.success('Welcome back!');
    return user;
  } catch (error: any) {
    console.error('Login error details:',error);
    if (error?.code === 'auth/user-disabled') {
      toast.error('This account has been disabled. Please contact support.');
    } else if (error?.code === 'auth/invalid-credential') {
      toast.error('Invalid email or password');
    }else if (error?.code === 'auth/user-not-found') {
      toast.error('No account found with this email. Please sign up first.');
    } else if (error?.code === 'auth/wrong-password') {
      toast.error('Incorrect password. Please try again.');
    } else if (error?.code === 'auth/too-many-requests') {
      toast.error('Too many failed attempts. Please try again later.');
    } else {
      toast.error(error.message || 'Error signing in');
    }
    throw error;
  }
};

// ✅ FIXED - Now accepts role parameter
export const signInWithGoogle = async (role: 'user' | 'admin' = 'user') => {
  if (!auth || !db) {
    throw new Error('Firebase not initialized');
  }
  try {
    console.log('🔵 signInWithGoogle called with role:', role); // DEBUG
    
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    console.log('🔵 Google auth successful for user:', user.email); // DEBUG

    // Check if user document exists, create if not
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      console.log('🟢 New user - creating document with role:', role); // DEBUG
      
      const userData: UserData = {
        name: user.displayName || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        role: role,  // ← KEY FIX: Use the role parameter instead of hardcoded 'user'
      };
      
      console.log('🟢 Creating Firestore document with data:', userData); // DEBUG
      await setDoc(doc(db, 'users', user.uid), userData);
      
      console.log('✅ Document created successfully'); // DEBUG
      
      // Verify it was saved correctly
      const verifyDoc = await getDoc(doc(db, 'users', user.uid));
      if (verifyDoc.exists()) {
        console.log('✅ Verified saved data:', verifyDoc.data()); // DEBUG
      }
    } else {
      console.log('🟡 Existing user logged in with role:', userDoc.data().role); // DEBUG
    }

    toast.success('Signed in with Google!');
    return user;
  } catch (error: any) {
    console.error('❌ Error signing in with Google:', error); // DEBUG
    if (error?.code === 'auth/popup-closed-by-user') {
      // User closed the popup; treat as a silent cancel instead of an error
      toast('Sign-in cancelled');
      return null;
    } else if (error?.code === 'auth/user-disabled') {
      toast.error('This Google account is disabled. Please contact support.');
    } else {
      toast.error(error.message || 'Error signing in with Google');
    }
    throw error;
  }
};

export const logout = async () => {
  if (!auth) {
    throw new Error('Firebase not initialized');
  }
  try {
    await signOut(auth);
    toast.success('Signed out successfully');
  } catch (error: any) {
    toast.error(error.message || 'Error signing out');
    throw error;
  }
};

export const getUserData = async (uid: string): Promise<UserData | null> => {
  if (!db) {
    return null;
  }
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserData;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
};