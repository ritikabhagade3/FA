'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import { getUserData, UserData } from '@/lib/auth';
import { getAllCourses, updateCourse, deleteCourse, Course } from '@/lib/courses';
import { generateAndCreateCourse } from '@/lib/coursesAI';
import Sidebar from '@/components/Sidebar';
import PageTransition from '@/components/PageTransition';
import AuthGuard from '@/components/AuthGuard';

export default function AdminCoursesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    instructor: '',
    price: 0,
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    duration: 0,
  });
  const [imagePreview, setImagePreview] = useState<string>('');

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
        loadCourses();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadCourses = async () => {
    try {
      const allCourses = await getAllCourses();
      setCourses(allCourses);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const handleOpenModal = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setFormData({
        title: course.title,
        description: course.description,
        category: course.category,
        instructor: course.instructor,
        price: course.price,
        level: course.level,
        duration: course.duration,
      });
      setImagePreview(course.imageURL || '');
    } else {
      setEditingCourse(null);
      setFormData({
        title: '',
        description: '',
        category: '',
        instructor: '',
        price: 0,
        level: 'beginner',
        duration: 0,
      });
      setImagePreview('');
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCourse(null);
    setImagePreview('');
  };

  const handleGenerateAI = async () => {
    if (!user || !userData) return;
    try {
      const { courseId } = await generateAndCreateCourse({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        price: formData.price,
        duration: formData.duration,
        level: formData.level,
        instructor: formData.instructor,
        instructorId: user.uid,
      });
      await loadCourses();
      handleCloseModal();
    } catch (e) {
      console.error('AI generation failed:', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userData) return;

    try {
      const courseData = {
        ...formData,
        instructorId: user.uid,
        imageURL: imagePreview || editingCourse?.imageURL,
        rating: editingCourse?.rating || 0,
        totalRatings: editingCourse?.totalRatings || 0,
        lessons: editingCourse?.lessons || [],
        enrolledStudents: editingCourse?.enrolledStudents || [],
      };

      if (editingCourse) {
        await updateCourse(editingCourse.id!, courseData);
      }

      await loadCourses();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving course:', error);
    }
  };

  const handleDelete = async (course: Course) => {
    if (!confirm(`Are you sure you want to delete "${course.title}"?`)) return;

    try {
      await deleteCourse(course.id!, course.imageURL);
      await loadCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
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
    <AuthGuard requiredRole="admin">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="flex">
          <Sidebar userRole={userData.role} userName={userData.name} userEmail={userData.email} />
          
          <main className="flex-1 md:ml-0 p-4 md:p-8">
            <PageTransition>
              <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                      Manage Courses
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                      Create, edit, and manage all courses
                    </p>
                  </motion.div>
                  <motion.button
                    onClick={() => handleOpenModal()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold shadow-lg"
                  >
                    + Create Course
                  </motion.button>
                </div>

                {/* Courses Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -5 }}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
                    >
                      {course.imageURL && (
                        <img
                          src={course.imageURL}
                          alt={course.title}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                          {course.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                          {course.description}
                        </p>
                        <div className="flex items-center justify-between mb-4">
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-semibold">
                            {course.category}
                          </span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            ${course.price}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <a
                            href={`/dashboard/admin/courses/${course.id}/lessons`}
                            className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors text-center"
                          >
                            Manage Lessons
                          </a>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenModal(course)}
                              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(course)}
                              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {courses.length === 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-lg text-center">
                    <div className="text-6xl mb-4">📚</div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      No Courses Yet
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Create your first course to get started!
                    </p>
                  </div>
                )}

                {/* Modal */}
                {showModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                    >
                      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {editingCourse ? 'Edit Course' : 'Create New Course'}
                        </h2>
                      </div>
                      <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Course Title
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Description
                          </label>
                          <textarea
                            required
                            rows={4}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Category
                            </label>
                            <input
                              type="text"
                              required
                              value={formData.category}
                              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Price ($)
                            </label>
                            <input
                              type="number"
                              required
                              min="0"
                              step="0.01"
                              value={formData.price}
                              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Level
                            </label>
                            <select
                              value={formData.level}
                              onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="beginner">Beginner</option>
                              <option value="intermediate">Intermediate</option>
                              <option value="advanced">Advanced</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Duration (minutes)
                            </label>
                            <input
                              type="number"
                              required
                              min="0"
                              value={formData.duration}
                              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Instructor Name
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.instructor}
                            onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Image upload removed: thumbnails are generated automatically */}
                        {imagePreview && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Generated Thumbnail
                            </label>
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="mt-1 w-full h-48 object-cover rounded-lg"
                            />
                          </div>
                        )}

                        <div className="flex gap-4 pt-4">
                          {editingCourse ? (
                            <button
                              type="submit"
                              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition-colors"
                            >
                              Update Course
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleGenerateAI}
                              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-colors"
                            >
                              Generate Course
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleCloseModal}
                            className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </motion.div>
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
