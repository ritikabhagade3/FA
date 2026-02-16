'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseConfig';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { getUserData, UserData } from '@/lib/auth';
import {
  Announcement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '@/lib/announcements';
import Sidebar from '@/components/Sidebar';
import PageTransition from '@/components/PageTransition';
import AuthGuard from '@/components/AuthGuard';
import BackButton from '@/components/BackButton';
import toast from 'react-hot-toast';

export default function AdminAnnouncementsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const data = await getUserData(currentUser.uid);
        setUserData(data);

        if (db) {
          const ref = collection(db, 'announcements');
          const q = query(ref, orderBy('createdAt', 'desc'));
          const unsubscribeAnnouncements = onSnapshot(q, (snap) => {
            const items: Announcement[] = [];
            snap.forEach((d) => {
              const data = d.data() as Announcement;
              items.push({
                id: d.id,
                ...data,
                createdAt: (data.createdAt as any)?.toDate?.() || new Date(),
                updatedAt: (data.updatedAt as any)?.toDate?.() || new Date(),
              });
            });
            setAnnouncements(items);
          });

          return () => unsubscribeAnnouncements();
        }
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  const openModal = (item?: Announcement) => {
    if (item) {
      setEditing(item);
      setTitle(item.title);
      setMessage(item.message);
    } else {
      setEditing(null);
      setTitle('');
      setMessage('');
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userData) return;
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    try {
      if (editing && editing.id) {
        await updateAnnouncement(editing.id, {
          title: title.trim(),
          message: message.trim(),
        });
      } else {
        await createAnnouncement({
          title: title.trim(),
          message: message.trim(),
          createdBy: user.uid,
          createdByName: userData.name,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'active',
        } as Announcement);
      }
      closeModal();
    } catch {
      // errors already toasted
    }
  };

  const handleDelete = async (item: Announcement) => {
    if (!item.id) return;
    if (!confirm(`Delete announcement "${item.title}"?`)) return;
    try {
      await deleteAnnouncement(item.id);
    } catch {
      // toasted in lib
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user || !userData) return null;

  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="flex">
          <Sidebar userRole={userData.role} userName={userData.name} userEmail={userData.email} />

          <main className="flex-1 md:ml-0 p-4 md:p-8">
            <PageTransition>
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <BackButton />
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Announcements
                      </h1>
                      <p className="text-gray-600 dark:text-gray-400">
                        Create and manage announcements for your students
                      </p>
                    </motion.div>
                  </div>
                  <motion.button
                    onClick={() => openModal()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg"
                  >
                    + New Announcement
                  </motion.button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 md:p-6">
                  {announcements.length === 0 ? (
                    <div className="py-16 text-center text-gray-500 dark:text-gray-400">
                      <div className="text-5xl mb-4">📢</div>
                      <p className="text-lg">No announcements yet.</p>
                      <p className="text-sm mt-1">Create your first announcement to notify students.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {announcements.map((a) => {
                        const created =
                          a.createdAt instanceof Date
                            ? a.createdAt
                            : (a.createdAt as any)?.toDate?.() || new Date();
                        return (
                          <motion.div
                            key={a.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:p-5 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900"
                          >
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                              <div>
                                <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-1">
                                  {a.title}
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                  {a.message}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Posted by {a.createdByName} •{' '}
                                  {created.toLocaleDateString()}{' '}
                                  {created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openModal(a)}
                                  className="px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(a)}
                                  className="px-3 py-1.5 rounded-md text-xs font-semibold bg-red-500 text-white hover:bg-red-600"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
                  >
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {editing ? 'Edit Announcement' : 'Create Announcement'}
                      </h2>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        ✕
                      </button>
                    </div>
                    <form onSubmit={handleSave} className="px-6 py-4 space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          required
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                          Message
                        </label>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          rows={4}
                          required
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={closeModal}
                          className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-600 text-white hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
                        >
                          {editing ? 'Update Announcement' : 'Create Announcement'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </PageTransition>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

