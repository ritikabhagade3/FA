'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import { getUserData, UserData } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import PageTransition from '@/components/PageTransition';
import AuthGuard from '@/components/AuthGuard';

export default function UserQuizPage() {
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
              <div className="max-w-7xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8"
                >
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    AI Quiz
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Test your knowledge with AI-powered quizzes
                  </p>
                </motion.div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-lg text-center">
                  <div className="text-6xl mb-4">🧠</div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    AI Quiz Coming Soon
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Get ready to challenge yourself with intelligent, adaptive quizzes!
                  </p>
                  <motion.a
                    href="/ai-quiz"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold"
                  >
                    Start AI Quiz
                  </motion.a>
                </div>
              </div>
            </PageTransition>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

