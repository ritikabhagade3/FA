import {
  collection,
  getDocs,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Course } from './courses';
import { Quiz } from './quiz';
import { UserData } from './auth';

export interface AnalyticsData {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalQuizAttempts: number;
  usersByMonth: { month: string; count: number }[];
  enrollmentsByMonth: { month: string; count: number }[];
  quizAttemptsByMonth: { month: string; count: number }[];
  topCourses: { courseId: string; title: string; enrollments: number }[];
  averageQuizScore: number;
  totalCertificates: number;
}

// Get all analytics data
export const getAnalyticsData = async (): Promise<AnalyticsData> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  try {
    // Get all users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    const totalUsers = usersSnapshot.size;

    // Get all courses
    const coursesRef = collection(db, 'courses');
    const coursesSnapshot = await getDocs(coursesRef);
    const courses = coursesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Course[];

    const totalCourses = courses.length;

    // Calculate total enrollments
    let totalEnrollments = 0;
    courses.forEach(course => {
      totalEnrollments += course.enrolledStudents?.length || 0;
    });

    // Get all quizzes
    const quizzesRef = collection(db, 'quizzes');
    const quizzesSnapshot = await getDocs(quizzesRef);
    const quizzes = quizzesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      completedAt: doc.data().completedAt?.toDate() || new Date(),
    })) as Quiz[];

    const totalQuizAttempts = quizzes.length;

    // Calculate average quiz score
    let totalScore = 0;
    let totalPossible = 0;
    quizzes.forEach(quiz => {
      totalScore += quiz.score;
      totalPossible += quiz.totalQuestions;
    });
    const averageQuizScore = totalPossible > 0 
      ? Math.round((totalScore / totalPossible) * 100) 
      : 0;

    // Get certificates (users who completed courses)
    const progressRef = collection(db, 'courseProgress');
    const progressSnapshot = await getDocs(progressRef);
    const totalCertificates = progressSnapshot.docs.filter(
      doc => doc.data().progress === 100
    ).length;

    // Get users by month
    const usersByMonth = getDataByMonth(
      usersSnapshot.docs.map(doc => ({
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }))
    );

    // Get enrollments by month (approximate from course creation/enrollment)
    const enrollmentsByMonth = getEnrollmentsByMonth(courses);

    // Get quiz attempts by month
    const quizAttemptsByMonth = getDataByMonth(
      quizzes.map(quiz => ({
        createdAt: quiz.completedAt instanceof Date 
          ? quiz.completedAt 
          : new Date(quiz.completedAt),
      }))
    );

    // Get top courses by enrollment
    const topCourses = courses
      .map(course => ({
        courseId: course.id || '',
        title: course.title,
        enrollments: course.enrolledStudents?.length || 0,
      }))
      .sort((a, b) => b.enrollments - a.enrollments)
      .slice(0, 5);

    return {
      totalUsers,
      totalCourses,
      totalEnrollments,
      totalQuizAttempts,
      usersByMonth,
      enrollmentsByMonth,
      quizAttemptsByMonth,
      topCourses,
      averageQuizScore,
      totalCertificates,
    };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    throw error;
  }
};

// Helper function to group data by month
function getDataByMonth(
  items: { createdAt: Date }[]
): { month: string; count: number }[] {
  const monthMap = new Map<string, number>();
  
  items.forEach(item => {
    const date = item.createdAt;
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
  });

  // Get last 6 months
  const months: { month: string; count: number }[] = [];
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      count: monthMap.get(monthKey) || 0,
    });
  }

  return months;
}

// Helper function to get enrollments by month
function getEnrollmentsByMonth(courses: Course[]): { month: string; count: number }[] {
  const enrollmentMap = new Map<string, number>();
  
  courses.forEach(course => {
    const enrollmentCount = course.enrolledStudents?.length || 0;
    const date = course.createdAt instanceof Date 
      ? course.createdAt 
      : (course.createdAt as any)?.toDate() || new Date();
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    // Distribute enrollments across months (simplified)
    enrollmentMap.set(monthKey, (enrollmentMap.get(monthKey) || 0) + enrollmentCount);
  });

  const months: { month: string; count: number }[] = [];
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      count: Math.round((enrollmentMap.get(monthKey) || 0) / 6), // Approximate
    });
  }

  return months;
}

// Get leaderboard data
export interface LeaderboardEntry {
  userId: string;
  userName: string;
  userEmail: string;
  totalQuizzes: number;
  averageScore: number;
  bestScore: number;
  totalPoints: number;
}

export const getLeaderboardData = async (limit: number = 10): Promise<LeaderboardEntry[]> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  try {
    // Get all users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as (UserData & { id: string })[];

    // Get all quizzes
    const quizzesRef = collection(db, 'quizzes');
    const quizzesSnapshot = await getDocs(quizzesRef);
    const quizzes = quizzesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Quiz[];

    // Calculate stats per user
    const userStatsMap = new Map<string, {
      totalQuizzes: number;
      totalScore: number;
      totalQuestions: number;
      bestScore: number;
    }>();

    quizzes.forEach(quiz => {
      const userId = quiz.userId;
      const stats = userStatsMap.get(userId) || {
        totalQuizzes: 0,
        totalScore: 0,
        totalQuestions: 0,
        bestScore: 0,
      };

      stats.totalQuizzes += 1;
      stats.totalScore += quiz.score;
      stats.totalQuestions += quiz.totalQuestions;
      
      const quizPercentage = (quiz.score / quiz.totalQuestions) * 100;
      if (quizPercentage > stats.bestScore) {
        stats.bestScore = Math.round(quizPercentage);
      }

      userStatsMap.set(userId, stats);
    });

    // Build leaderboard entries
    const leaderboard: LeaderboardEntry[] = [];

    users.forEach(user => {
      const stats = userStatsMap.get(user.id);
      
      if (stats && stats.totalQuizzes > 0) {
        const averageScore = Math.round(
          (stats.totalScore / stats.totalQuestions) * 100
        );
        const totalPoints = stats.totalScore * 10; // Points = score * 10

        leaderboard.push({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          totalQuizzes: stats.totalQuizzes,
          averageScore,
          bestScore: stats.bestScore,
          totalPoints,
        });
      }
    });

    // Sort by total points (descending), then by average score
    leaderboard.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return b.averageScore - a.averageScore;
    });

    return leaderboard.slice(0, limit);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw error;
  }
};




