'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import { getUserData, UserData } from '@/lib/auth';
import {
  getUserEnrolledCourses,
  getCourseProgress,
  Course,
  CourseProgress,
} from '@/lib/courses';
import Sidebar from '@/components/Sidebar';
import PageTransition from '@/components/PageTransition';
import AuthGuard from '@/components/AuthGuard';

export default function UserDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [coursesProgress, setCoursesProgress] = useState<Record<string, CourseProgress>>({});

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
        await loadCourses(currentUser.uid);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadCourses = async (userId: string) => {
    try {
      const courses = await getUserEnrolledCourses(userId);
      setEnrolledCourses(courses);

      // Load progress for each course
      const progressMap: Record<string, CourseProgress> = {};
      for (const course of courses) {
        if (course.id) {
          const progress = await getCourseProgress(course.id, userId);
          if (progress) {
            progressMap[course.id] = progress;
          }
        }
      }
      setCoursesProgress(progressMap);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

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
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8"
                >
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    Welcome back, {userData.name}! 👋
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Continue your learning journey
                  </p>
                </motion.div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    whileHover={{ y: -5 }}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Enrolled Courses</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                          {enrolledCourses.length}
                        </p>
                      </div>
                      <div className="text-4xl">📚</div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ y: -5 }}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Completed Quizzes</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">0</p>
                      </div>
                      <div className="text-4xl">🧠</div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ y: -5 }}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Certificates</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                          {Object.values(coursesProgress).filter((p) => p.progress === 100).length}
                        </p>
                      </div>
                      <div className="text-4xl">🎓</div>
                    </div>
                  </motion.div>
                </div>

                {/* Quick Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg mb-8"
                >
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.button
                      onClick={() => router.push('/dashboard/user/courses')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-left"
                    >
                      <div className="text-3xl mb-2">📚</div>
                      <h3 className="text-xl font-semibold mb-1">Browse Courses</h3>
                      <p className="text-blue-100 text-sm">Explore available courses</p>
                    </motion.button>

                    <motion.button
                      onClick={() => router.push('/ai-quiz')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg text-left"
                    >
                      <div className="text-3xl mb-2">🧠</div>
                      <h3 className="text-xl font-semibold mb-1">Take AI Quiz</h3>
                      <p className="text-purple-100 text-sm">Test your knowledge</p>
                    </motion.button>
                  </div>
                </motion.div>

                {/* My Courses */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Courses</h2>
                    <button
                      onClick={() => router.push('/dashboard/user/courses')}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold"
                    >
                      Browse All →
                    </button>
                  </div>
                  
                  {enrolledCourses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {enrolledCourses.slice(0, 4).map((course) => {
                        const progress = coursesProgress[course.id || '']?.progress || 0;
                        const isCompleted = progress === 100;
                        
                        return (
                          <motion.div
                            key={course.id}
                            whileHover={{ y: -5 }}
                            onClick={() => router.push(`/dashboard/user/courses/${course.id}`)}
                            className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-700 rounded-xl p-6 shadow-lg cursor-pointer"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex-1">
                                {course.title}
                              </h3>
                              {isCompleted && (
                                <span className="text-2xl">🎓</span>
                              )}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                              {course.description}
                            </p>
                            <div className="mb-2">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-gray-600 dark:text-gray-400">Progress</span>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {progress}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progress}%` }}
                                  transition={{ duration: 0.5 }}
                                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                                />
                              </div>
                            </div>
                            <button className="w-full mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors">
                              {isCompleted ? 'View Certificate' : 'Continue Learning'}
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <p className="text-lg">No enrolled courses</p>
                      <p className="text-sm mt-2">Browse courses to start learning!</p>
                      <button
                        onClick={() => router.push('/dashboard/user/courses')}
                        className="mt-4 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold"
                      >
                        Browse Courses
                      </button>
                    </div>
                  )}
                </motion.div>
              </div>
            </PageTransition>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

