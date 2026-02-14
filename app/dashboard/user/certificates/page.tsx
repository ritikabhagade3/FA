'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import { getUserData, UserData } from '@/lib/auth';
import toast from 'react-hot-toast';
import {
  getUserEnrolledCourses,
  getCourseProgress,
  Course,
  CourseProgress,
} from '@/lib/courses';
import {
  getUserQuizzes,
  Quiz,
} from '@/lib/quiz';
import { generateCertificatePDF } from '@/lib/certificates';
import Sidebar from '@/components/Sidebar';
import PageTransition from '@/components/PageTransition';
import AuthGuard from '@/components/AuthGuard';

export default function UserCertificatesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedCourses, setCompletedCourses] = useState<Array<Course & { progress: CourseProgress }>>([]);
  const [quizCertificates, setQuizCertificates] = useState<Quiz[]>([]);

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
        await loadCompletedCourses(currentUser.uid);
        await loadQuizCertificates(currentUser.uid);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadCompletedCourses = async (userId: string) => {
    try {
      const enrolledCourses = await getUserEnrolledCourses(userId);
      const completed: Array<Course & { progress: CourseProgress }> = [];

      for (const course of enrolledCourses) {
        if (course.id) {
          const progress = await getCourseProgress(course.id, userId);
          if (progress && progress.progress === 100) {
            completed.push({ ...course, progress });
          }
        }
      }

      setCompletedCourses(completed);
    } catch (error) {
      console.error('Error loading completed courses:', error);
    }
  };

  const loadQuizCertificates = async (userId: string) => {
    try {
      const quizzes = await getUserQuizzes(userId);
      setQuizCertificates(quizzes);
    } catch (error) {
      console.error('Error loading quiz certificates:', error);
    }
  };

  const generateCourseCertificate = async (course: Course & { progress: CourseProgress }) => {
    try {
      let completedDate = new Date();
      if (course.progress.completedAt) {
        if (course.progress.completedAt instanceof Date) {
          completedDate = course.progress.completedAt;
        } else {
          const timestamp = course.progress.completedAt as any;
          completedDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        }
      }
      await generateCertificatePDF({
        userName: userData?.name || 'Student',
        courseName: course.title,
        type: 'course',
        completionDate: completedDate,
        badge: '🎓 Course Completed',
      });
      toast.success('Certificate downloaded!');
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error('Error generating certificate');
    }
  };

  const generateQuizCertificate = async (quiz: Quiz) => {
    try {
      let completedDate = new Date();
      if (quiz.completedAt instanceof Date) {
        completedDate = quiz.completedAt;
      } else {
        const timestamp = quiz.completedAt as any;
        completedDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      }
      await generateCertificatePDF({
        userName: userData?.name || 'Student',
        quizTitle: quiz.title,
        type: 'quiz',
        completionDate: completedDate,
        score: quiz.score,
        totalQuestions: quiz.totalQuestions,
        badge: quiz.badge,
      });
      toast.success('Certificate downloaded!');
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error('Error generating certificate');
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
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8"
                >
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    My Certificates
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    View and download your certificates
                  </p>
                </motion.div>

                {(completedCourses.length > 0 || quizCertificates.length > 0) ? (
                  <div className="space-y-8">
                    {/* Course Certificates */}
                    {completedCourses.length > 0 && (
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Course Certificates</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {completedCourses.map((course) => (
                            <motion.div
                              key={course.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              whileHover={{ y: -5 }}
                              className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl shadow-lg p-8 border-2 border-yellow-400 dark:border-yellow-600"
                            >
                              <div className="text-center">
                                <div className="text-6xl mb-4">🎓</div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                  {course.title}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                  Completed on{' '}
                                  {course.progress.completedAt
                                    ? course.progress.completedAt instanceof Date
                                      ? course.progress.completedAt.toLocaleDateString()
                                      : (course.progress.completedAt as any).toDate?.().toLocaleDateString() || 'N/A'
                                    : 'N/A'}
                                </p>
                                <div className="mb-4">
                                  <div className="inline-block px-4 py-2 bg-yellow-400 dark:bg-yellow-600 text-yellow-900 dark:text-yellow-100 rounded-lg font-bold">
                                    CERTIFIED
                                  </div>
                                </div>
                                <button
                                  onClick={() => generateCourseCertificate(course)}
                                  className="w-full px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg font-semibold transition-colors"
                                >
                                  Download Certificate
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quiz Certificates */}
                    {quizCertificates.length > 0 && (
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quiz Certificates</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {quizCertificates.map((quiz) => {
                            const percentage = ((quiz.score / quiz.totalQuestions) * 100).toFixed(0);
                            let completedDate = new Date();
                            if (quiz.completedAt instanceof Date) {
                              completedDate = quiz.completedAt;
                            } else {
                              const timestamp = quiz.completedAt as any;
                              completedDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
                            }
                            
                            return (
                              <motion.div
                                key={quiz.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -5 }}
                                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl shadow-lg p-8 border-2 border-purple-400 dark:border-purple-600"
                              >
                                <div className="text-center">
                                  <div className="text-6xl mb-4">🧠</div>
                                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    {quiz.title}
                                  </h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    Score: {quiz.score}/{quiz.totalQuestions} ({percentage}%)
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Completed on {completedDate.toLocaleDateString()}
                                  </p>
                                  {quiz.badge && (
                                    <div className="mb-4">
                                      <div className="inline-block px-4 py-2 bg-purple-400 dark:bg-purple-600 text-purple-900 dark:text-purple-100 rounded-lg font-bold">
                                        {quiz.badge}
                                      </div>
                                    </div>
                                  )}
                                  <button
                                    onClick={() => generateQuizCertificate(quiz)}
                                    className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-colors"
                                  >
                                    Download Certificate
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-lg text-center">
                    <div className="text-6xl mb-4">🎓</div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      No Certificates Yet
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Complete courses to earn certificates!
                    </p>
                  </div>
                )}
              </div>
            </PageTransition>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

