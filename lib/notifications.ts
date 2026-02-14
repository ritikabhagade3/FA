import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { auth, db } from './firebaseConfig';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

// VAPID key - should be in environment variables
// You'll need to get this from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Initialize Firebase Cloud Messaging
export const initializeFCM = async (userId: string): Promise<string | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const permission = await requestNotificationPermission();
    if (!permission) {
      console.warn('Notification permission denied');
      return null;
    }

    // Check if messaging is supported
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return null;
    }

    // Get messaging instance (only on client-side)
    const { getMessaging } = await import('firebase/messaging');
    
    if (!auth) {
      console.warn('Firebase auth not initialized');
      return null;
    }

    // Note: getMessaging() requires a Firebase app, and messaging only works on client-side
    // For production, you'll need to set up service worker registration
    // This is a simplified client-side implementation
    
    console.log('FCM initialized (notification setup ready)');
    
    // Store notification preference in Firestore
    if (db && userId) {
      try {
        const userPrefsRef = doc(db, 'userPreferences', userId);
        await setDoc(userPrefsRef, {
          notificationsEnabled: true,
          updatedAt: new Date(),
        }, { merge: true });
      } catch (error) {
        console.error('Error saving notification preference:', error);
      }
    }

    return 'notification-token'; // Placeholder - actual token would come from getToken()
  } catch (error) {
    console.error('Error initializing FCM:', error);
    return null;
  }
};

// Show local notification (for browser notifications)
export const showNotification = (title: string, options: NotificationOptions = {}) => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};

// Daily learning reminder notification
export const scheduleDailyReminder = () => {
  if (typeof window === 'undefined') {
    return;
  }

  // Check if user has studied today
  const lastStudyDate = localStorage.getItem('lastStudyDate');
  const today = new Date().toDateString();
  
  if (lastStudyDate !== today) {
    // Show reminder if user hasn't studied today
    setTimeout(() => {
      showNotification('📚 Daily Learning Reminder', {
        body: 'Don\'t forget to learn something new today! Complete a course or take a quiz.',
        tag: 'daily-reminder',
        requireInteraction: false,
      });
    }, 5000); // Show after 5 seconds (for demo - in production, use proper scheduling)
  }
};

// Achievement notification
export const showAchievementNotification = (achievement: string, message: string) => {
  showNotification(`🏆 ${achievement}`, {
    body: message,
    tag: `achievement-${achievement}`,
    requireInteraction: true,
  });
  toast.success(`${achievement}: ${message}`);
};

// Check for new achievements (call this after quiz completion or course completion)
export const checkAchievements = async (userId: string, type: 'quiz' | 'course', data: any) => {
  if (!db || !userId) return;

  try {
    const userPrefsRef = doc(db, 'userPreferences', userId);
    const userPrefsSnap = await getDoc(userPrefsRef);
    const userPrefs = userPrefsSnap.data() || {};

    if (type === 'quiz') {
      // Check for quiz achievements
      if (data.score === data.totalQuestions) {
        showAchievementNotification('Perfect Score!', 'You got all questions correct!');
      } else if ((data.score / data.totalQuestions) * 100 >= 90) {
        showAchievementNotification('Excellent Work!', `You scored ${Math.round((data.score / data.totalQuestions) * 100)}%`);
      }

      // Check for streak achievements
      const streak = userPrefs.quizStreak || 0;
      const newStreak = streak + 1;
      
      if (newStreak === 5) {
        showAchievementNotification('Quiz Streak!', 'You\'ve completed 5 quizzes in a row!');
      } else if (newStreak === 10) {
        showAchievementNotification('Quiz Master!', 'You\'ve completed 10 quizzes in a row!');
      }

      await setDoc(userPrefsRef, {
        quizStreak: newStreak,
        lastQuizDate: new Date().toDateString(),
      }, { merge: true });
    }

    if (type === 'course') {
      // Check for course completion achievements
      if (data.progress === 100) {
        showAchievementNotification('Course Completed!', `Congratulations on completing ${data.courseTitle}!`);
      }
    }

    // Update last study date
    localStorage.setItem('lastStudyDate', new Date().toDateString());
  } catch (error) {
    console.error('Error checking achievements:', error);
  }
};

// Initialize notification system on app load
export const initializeNotifications = async (userId?: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  // Request permission and initialize
  const permission = await requestNotificationPermission();
  
  if (permission && userId) {
    await initializeFCM(userId);
    
    // Schedule daily reminder
    scheduleDailyReminder();
    
    // Set up periodic check for reminders
    setInterval(() => {
      scheduleDailyReminder();
    }, 24 * 60 * 60 * 1000); // Check every 24 hours
  }
};




