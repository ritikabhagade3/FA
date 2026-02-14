import { db } from './firebaseConfig';
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  enrolledCourses?: string[];
  lastLogin?: Date;
  isDeactivated?: boolean;
}

export const getAllUsers = async (): Promise<User[]> => {
  const usersCollection = collection(db, 'users');
  const userSnapshot = await getDocs(usersCollection);
  const userList = userSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  return userList;
};

export const getUserDetails = async (uid: string): Promise<User | null> => {
  const userDoc = doc(db, 'users', uid);
  const userSnapshot = await getDoc(userDoc);
  if (userSnapshot.exists()) {
    return { uid: userSnapshot.id, ...userSnapshot.data() } as User;
  }
  return null;
};

export const updateUserDetails = async (uid:string, data: Partial<User>): Promise<void> => {
  const userDoc = doc(db, 'users', uid);
  await updateDoc(userDoc, data);
};

export const toggleUserActivation = async (uid: string, isDeactivated: boolean): Promise<void> => {
  const userDoc = doc(db, 'users', uid);
  await updateDoc(userDoc, { isDeactivated });
};

export const changeUserUid = async (oldUid: string, newUid: string): Promise<void> => {
  // Read existing user data
  const oldDocRef = doc(db, 'users', oldUid);
  const snap = await getDoc(oldDocRef);
  if (!snap.exists()) return;
  const data = snap.data() as Omit<User, 'uid'>;

  // Create new doc with new UID
  const newDocRef = doc(db, 'users', newUid);
  await setDoc(newDocRef, { ...data });

  // Delete old doc
  await deleteDoc(oldDocRef);
};