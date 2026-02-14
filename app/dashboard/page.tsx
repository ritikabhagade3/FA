'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import { getUserData } from '@/lib/auth';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    if (!auth) {
      router.push('/login');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !user.emailVerified) {
        router.push('/login');
        return;
      }

      try {
        // Get user role and redirect accordingly
        const userData = await getUserData(user.uid);
        if (userData) {
          router.push(userData.role === 'admin' ? '/dashboard/admin' : '/dashboard/user');
        } else {
          router.push('/dashboard/user');
        }
      } catch (e) {
        // If Firestore is offline or fails, still send the user to the user dashboard
        router.push('/dashboard/user');
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}
