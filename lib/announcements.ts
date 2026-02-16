import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import toast from 'react-hot-toast';

const removeUndefined = <T extends Record<string, any>>(obj: T): T => {
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    const value = (obj as any)[key];
    if (value !== undefined) {
      cleaned[key] = value;
    }
  });
  return cleaned as T;
};

export interface Announcement {
  id?: string;
  title: string;
  message: string;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  status?: 'active' | 'archived';
}

export interface AnnouncementReadStatus {
  id?: string;
  announcementId: string;
  userId: string;
  read: boolean;
  readAt?: Timestamp | Date;
}

// ---------- Teacher / Admin ----------

export const createAnnouncement = async (data: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>) => {
  if (!db) throw new Error('Firebase not initialized');

  try {
    const ref = doc(collection(db, 'announcements'));
    const now = Timestamp.now();
    await setDoc(
      ref,
      removeUndefined({
        ...data,
        status: data.status || 'active',
        createdAt: now,
        updatedAt: now,
      })
    );
    toast.success('Announcement created');
    return ref.id;
  } catch (err) {
    console.error('Error creating announcement:', err);
    toast.error('Error creating announcement');
    throw err;
  }
};

export const updateAnnouncement = async (id: string, data: Partial<Announcement>) => {
  if (!db) throw new Error('Firebase not initialized');
  try {
    const ref = doc(db, 'announcements', id);
    await updateDoc(
      ref,
      removeUndefined({
        ...data,
        updatedAt: Timestamp.now(),
      })
    );
    toast.success('Announcement updated');
  } catch (err) {
    console.error('Error updating announcement:', err);
    toast.error('Error updating announcement');
    throw err;
  }
};

export const deleteAnnouncement = async (id: string) => {
  if (!db) throw new Error('Firebase not initialized');
  try {
    await deleteDoc(doc(db, 'announcements', id));
    toast.success('Announcement deleted');
  } catch (err) {
    console.error('Error deleting announcement:', err);
    toast.error('Error deleting announcement');
    throw err;
  }
};

export const getAllAnnouncements = async (): Promise<Announcement[]> => {
  if (!db) throw new Error('Firebase not initialized');
  const ref = collection(db, 'announcements');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Announcement;
    return {
      id: d.id,
      ...data,
      createdAt: (data.createdAt as any)?.toDate?.() || new Date(),
      updatedAt: (data.updatedAt as any)?.toDate?.() || new Date(),
    };
  });
};

// ---------- Student read/unread ----------

export const getReadStatusForUser = async (userId: string): Promise<Record<string, AnnouncementReadStatus>> => {
  if (!db) throw new Error('Firebase not initialized');
  const ref = collection(db, 'announcementReads');
  const q = query(ref, where('userId', '==', userId));
  const snap = await getDocs(q);
  const map: Record<string, AnnouncementReadStatus> = {};
  snap.docs.forEach((d) => {
    const data = d.data() as AnnouncementReadStatus;
    map[data.announcementId] = {
      id: d.id,
      ...data,
      readAt: (data.readAt as any)?.toDate?.(),
    };
  });
  return map;
};

export const markAnnouncementRead = async (userId: string, announcementId: string) => {
  if (!db) throw new Error('Firebase not initialized');
  const ref = doc(db, 'announcementReads', `${userId}_${announcementId}`);
  await setDoc(
    ref,
    removeUndefined({
      userId,
      announcementId,
      read: true,
      readAt: Timestamp.now(),
    }),
    { merge: true }
  );
};

export const markAnnouncementUnread = async (userId: string, announcementId: string) => {
  if (!db) throw new Error('Firebase not initialized');
  const ref = doc(db, 'announcementReads', `${userId}_${announcementId}`);
  await setDoc(
    ref,
    removeUndefined({
      userId,
      announcementId,
      read: false,
      readAt: undefined,
    }),
    { merge: true }
  );
};

