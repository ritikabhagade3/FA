'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseConfig';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { getUserData, UserData } from '@/lib/auth';
import {
  Announcement,
  AnnouncementReadStatus,
  markAnnouncementRead,
} from '@/lib/announcements';
import Sidebar from '@/components/Sidebar';
import PageTransition from '@/components/PageTransition';
import AuthGuard from '@/components/AuthGuard';
import BackButton from '@/components/BackButton';

interface AnnouncementWithRead extends Announcement {
  read?: boolean;
  readAt?: Date;
}

export default function UserNotificationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AnnouncementWithRead[]>([]);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    let unsubAnnouncements: (() => void) | null = null;
    let unsubReads: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const data = await getUserData(currentUser.uid);
        setUserData(data);

        if (db) {
          const annRef = collection(db, 'announcements');
          const annQuery = query(annRef, orderBy('createdAt', 'desc'));
          const readRef = collection(db, 'announcementReads');
          const readQuery = query(readRef, where('userId', '==', currentUser.uid));

          let announcements: Announcement[] = [];
          let reads: Record<string, AnnouncementReadStatus> = {};

          const recompute = () => {
            const merged: AnnouncementWithRead[] = announcements.map((a) => {
              const read = reads[a.id || ''];
              return {
                ...a,
                read: read?.read,
                readAt:
                  read?.readAt instanceof Date
                    ? read.readAt
                    : (read?.readAt as any)?.toDate?.(),
              };
            });
            setItems(merged);
          };

          unsubAnnouncements = onSnapshot(annQuery, (snap) => {
            const arr: Announcement[] = [];
            snap.forEach((d) => {
              const data = d.data() as Announcement;
              arr.push({
                id: d.id,
                ...data,
                createdAt: (data.createdAt as any)?.toDate?.() || new Date(),
                updatedAt: (data.updatedAt as any)?.toDate?.() || new Date(),
              });
            });
            announcements = arr;
            recompute();
          });

          unsubReads = onSnapshot(readQuery, (snap) => {
            const map: Record<string, AnnouncementReadStatus> = {};
            snap.forEach((d) => {
              const data = d.data() as AnnouncementReadStatus;
              map[data.announcementId] = {
                id: d.id,
                ...data,
                readAt: (data.readAt as any)?.toDate?.(),
              };
            });
            reads = map;
            recompute();
          });
        }
      }
      setLoading(false);
    });

    return () => {
      if (unsubAnnouncements) unsubAnnouncements();
      if (unsubReads) unsubReads();
      unsubscribeAuth();
    };
  }, []);

  const handleOpen = async (item: AnnouncementWithRead) => {
    if (!user || !item.id) return;
    if (!item.read) {
      await markAnnouncementRead(user.uid, item.id);
    }
    // Optionally expand / collapse could be handled here
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user || !userData) return null;

  const unreadCount = items.filter((i) => !i.read).length;

  return (
    <AuthGuard requiredRole="user">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="flex">
          <Sidebar userRole={userData.role} userName={userData.name} userEmail={userData.email} />

          <main className="flex-1 md:ml-0 p-4 md:p-8">
            <PageTransition>
              <div className="max-w-5xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <BackButton />
                    <div>
                      <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Notifications
                      </h1>
                      <p className="text-gray-600 dark:text-gray-400">
                        Stay up to date with the latest announcements
                      </p>
                    </div>
                  </div>
                  {unreadCount > 0 && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-500 text-white">
                      {unreadCount} unread
                    </span>
                  )}
                </motion.div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 md:p-6">
                  {items.length === 0 ? (
                    <div className="py-16 text-center text-gray-500 dark:text-gray-400">
                      <div className="text-5xl mb-4">🔔</div>
                      <p className="text-lg">No notifications yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {items.map((item) => {
                        const created =
                          item.createdAt instanceof Date
                            ? item.createdAt
                            : (item.createdAt as any)?.toDate?.() || new Date();
                        const isUnread = !item.read;
                        return (
                          <motion.button
                            key={item.id}
                            type="button"
                            onClick={() => handleOpen(item)}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`w-full text-left border rounded-lg px-4 py-3 transition-colors ${
                              isUnread
                                ? 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/30'
                                : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h2 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white mb-1">
                                  {item.title}
                                </h2>
                                <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300">
                                  {item.message}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                  {created.toLocaleDateString()}{' '}
                                  {created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    isUnread
                                      ? 'bg-red-500 text-white'
                                      : 'bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                  }`}
                                >
                                  {isUnread ? 'Unread' : 'Read'}
                                </span>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </PageTransition>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

