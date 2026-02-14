'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import { getUserData, UserData } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import PageTransition from '@/components/PageTransition';
import AuthGuard from '@/components/AuthGuard';

export default function UserProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const data = await getUserData(currentUser.uid);
        setUserData(data);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !userData) {
    return null;
  }

  return (
    <AuthGuard requiredRole="user">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="flex">
          <Sidebar userRole={userData.role} userName={userData.name} userEmail={userData.email} />
          
          <main className="flex-1 md:ml-0 p-4 md:p-8">
            <PageTransition>
              <div className="max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8"
                >
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    Profile
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Manage your account information
                  </p>
                </motion.div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg">
                  <div className="flex items-center space-x-6 mb-8">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-4xl font-bold">
                      {userData.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {userData.name}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">{userData.email}</p>
                      <span className="inline-block mt-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-semibold">
                        {userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={userData.name}
                        disabled
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={userData.email}
                        disabled
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Role
                      </label>
                      <input
                        type="text"
                        value={userData.role}
                        disabled
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </PageTransition>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

