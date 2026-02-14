'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import { getUserData, UserData } from '@/lib/auth';
import { getAnalyticsData, AnalyticsData } from '@/lib/analytics';
import Sidebar from '@/components/Sidebar';
import PageTransition from '@/components/PageTransition';
import AuthGuard from '@/components/AuthGuard';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export default function AdminAnalyticsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

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
        
        // Load analytics data
        try {
          const analyticsData = await getAnalyticsData();
          setAnalytics(analyticsData);
        } catch (error) {
          console.error('Error loading analytics:', error);
        } finally {
          setLoadingAnalytics(false);
        }
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
    <AuthGuard requiredRole="admin">
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
                    Analytics
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    View platform analytics and insights
                  </p>
                </motion.div>

                {loadingAnalytics ? (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-lg text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics...</p>
                  </div>
                ) : analytics ? (
                  <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
                      >
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Total Users</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.totalUsers}</p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
                      >
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Total Courses</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.totalCourses}</p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
                      >
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Total Enrollments</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.totalEnrollments}</p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
                      >
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Quiz Attempts</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.totalQuizAttempts}</p>
                      </motion.div>
                    </div>

                    {/* Charts Row 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                      {/* Users Growth Chart */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
                      >
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                          Users Growth (Last 6 Months)
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={analytics.usersByMonth}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="month" className="text-xs" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="count"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              name="New Users"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </motion.div>

                      {/* Enrollments Chart */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
                      >
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                          Enrollments (Last 6 Months)
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={analytics.enrollmentsByMonth}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="month" className="text-xs" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#8b5cf6" name="Enrollments" />
                          </BarChart>
                        </ResponsiveContainer>
                      </motion.div>
                    </div>

                    {/* Charts Row 2 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                      {/* Quiz Attempts Chart */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
                      >
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                          Quiz Attempts (Last 6 Months)
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={analytics.quizAttemptsByMonth}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="month" className="text-xs" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="count"
                              stroke="#ec4899"
                              strokeWidth={2}
                              name="Quiz Attempts"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </motion.div>

                      {/* Top Courses Chart */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
                      >
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                          Top 5 Courses by Enrollments
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={analytics.topCourses}
                            layout="vertical"
                          >
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis type="number" />
                            <YAxis dataKey="title" type="category" width={150} className="text-xs" />
                            <Tooltip />
                            <Bar dataKey="enrollments" fill="#10b981" name="Enrollments" />
                          </BarChart>
                        </ResponsiveContainer>
                      </motion.div>
                    </div>

                    {/* Additional Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9 }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
                      >
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Average Quiz Score</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                          {analytics.averageQuizScore}%
                        </p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.0 }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
                      >
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Certificates Issued</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                          {analytics.totalCertificates}
                        </p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.1 }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
                      >
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Enrollment Rate</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                          {analytics.totalCourses > 0
                            ? Math.round((analytics.totalEnrollments / analytics.totalCourses) * 10) / 10
                            : 0}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">avg per course</p>
                      </motion.div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-lg text-center">
                    <p className="text-gray-600 dark:text-gray-400">No analytics data available</p>
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

