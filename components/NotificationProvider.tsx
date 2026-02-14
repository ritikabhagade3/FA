'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { initializeNotifications, scheduleDailyReminder, checkAchievements } from '@/lib/notifications';

export default function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined' || initialized) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.emailVerified) {
        // Initialize notifications for authenticated users
        try {
          await initializeNotifications(user.uid);
          setInitialized(true);
          
          // Schedule daily reminder
          scheduleDailyReminder();
        } catch (error) {
          console.error('Error initializing notifications:', error);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [initialized]);

  return <>{children}</>;
}



