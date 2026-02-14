'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import { getUserData, UserData } from '@/lib/auth';
import {
  getAllCourses,
  enrollInCourse,
  getUserEnrolledCourses,
  getCourseProgress,
  Course,
  CourseProgress,
} from '@/lib/courses';
import Sidebar from '@/components/Sidebar';
import PageTransition from '@/components/PageTransition';
import AuthGuard from '@/components/AuthGuard';

export default function UserCoursesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [filters, setFilters] = useState({
    category: '',
    level: '',
    sortBy: 'popularity', // popularity, price, rating
  });

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

  useEffect(() => {
    applyFilters();
  }, [filters, allCourses]);

  const loadCourses = async (userId: string) => {
    try {
      const [all, enrolled] = await Promise.all([
        getAllCourses(),
        getUserEnrolledCourses(userId),
      ]);
      setAllCourses(all);
      setEnrolledCourses(enrolled);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...allCourses];

    // Filter by category
    if (filters.category) {
      filtered = filtered.filter((course) => course.category === filters.category);
    }

    // Filter by level
    if (filters.level) {
      filtered = filtered.filter((course) => course.level === filters.level);
    }

    // Sort
    switch (filters.sortBy) {
      case 'price':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'popularity':
      default:
        filtered.sort((a, b) => (b.enrolledStudents?.length || 0) - (a.enrolledStudents?.length || 0));
        break;
    }

    setFilteredCourses(filtered);
  };

  const handleEnroll = async (courseId: string) => {
    if (!user) return;

    try {
      await enrollInCourse(courseId, user.uid);
      await loadCourses(user.uid);
    } catch (error) {
      console.error('Error enrolling:', error);
    }
  };

  const isEnrolled = (courseId: string) => {
    return enrolledCourses.some((course) => course.id === courseId);
  };

  const getCategories = () => {
    const categories = new Set(allCourses.map((course) => course.category));
    return Array.from(categories);
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
                    Browse Courses
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Discover and enroll in courses
                  </p>
                </motion.div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category
                      </label>
                      <select
                        value={filters.category}
                        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Categories</option>
                        {getCategories().map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Level
                      </label>
                      <select
                        value={filters.level}
                        onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Levels</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Sort By
                      </label>
                      <select
                        value={filters.sortBy}
                        onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="popularity">Popularity</option>
                        <option value="price">Price</option>
                        <option value="rating">Rating</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={() => setFilters({ category: '', level: '', sortBy: 'popularity' })}
                        className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                </div>

                {/* Courses Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCourses.map((course, index) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -5 }}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
                    >
                      {course.imageURL ? (
                        <img
                          src={course.imageURL}
                          alt={course.title}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center">
                          <span className="text-6xl">📚</span>
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-2">
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-semibold">
                            {course.category}
                          </span>
                          <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-xs font-semibold capitalize">
                            {course.level}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                          {course.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                          {course.description}
                        </p>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500">⭐</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {course.rating.toFixed(1)}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              ({course.totalRatings})
                            </span>
                          </div>
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            ${course.price}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                          <span>👤 {course.instructor}</span>
                          <span>⏱️ {course.duration} min</span>
                        </div>
                        {isEnrolled(course.id!) ? (
                          <button
                            onClick={() => router.push(`/dashboard/user/courses/${course.id}`)}
                            className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors"
                          >
                            Continue Learning
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEnroll(course.id!)}
                            className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-semibold transition-colors"
                          >
                            Enroll Now
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {filteredCourses.length === 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-lg text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      No Courses Found
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Try adjusting your filters
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
