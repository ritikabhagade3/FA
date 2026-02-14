import { db } from './firebaseConfig';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export interface UserActivity {
  uid: string;
  lastLogin: Date | null;
  completedCourses: string[];
  recentQuizAttempts: any[];
}

export const getUserActivity = async (uid: string): Promise<UserActivity> => {
  // Mock data for now
  return {
    uid,
    lastLogin: new Date(),
    completedCourses: ['course1', 'course2'],
    recentQuizAttempts: [
      { quizId: 'quiz1', score: 85, date: new Date() },
      { quizId: 'quiz2', score: 90, date: new Date() },
    ],
  };
};