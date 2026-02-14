'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import { getUserData, UserData } from '@/lib/auth';
import {
  getCourseById,
  getLessonsByCourseId,
  createLesson,
  updateLesson,
  deleteLesson,
  Course,
  Lesson,
} from '@/lib/courses';
import Sidebar from '@/components/Sidebar';
import PageTransition from '@/components/PageTransition';
import AuthGuard from '@/components/AuthGuard';

export default function AdminLessonsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    notes: '',
    videoURL: '',
    duration: 0,
    order: 0,
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
        loadData();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [courseId]);

  const loadData = async () => {
    try {
      const courseData = await getCourseById(courseId);
      if (!courseData) {
        router.push('/dashboard/admin/courses');
        return;
      }
      setCourse(courseData);
      const lessonsData = await getLessonsByCourseId(courseId);
      setLessons(lessonsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleOpenModal = (lesson?: Lesson) => {
    if (lesson) {
      setEditingLesson(lesson);
      setFormData({
        title: lesson.title,
        description: lesson.description,
        videoURL: lesson.videoURL,
        duration: lesson.duration,
        order: lesson.order,
      });
    } else {
      setEditingLesson(null);
      setFormData({
        title: '',
        description: '',
        videoURL: '',
        duration: 0,
        order: lessons.length + 1,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingLesson(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;

    try {
      const lessonData = {
        ...formData,
        courseId: course.id!,
      };

      if (editingLesson) {
        await updateLesson(editingLesson.id!, lessonData);
      } else {
        await createLesson(lessonData);
      }

      await loadData();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving lesson:', error);
    }
  };

  const handleDelete = async (lesson: Lesson) => {
    if (!confirm(`Are you sure you want to delete "${lesson.title}"?`)) return;

    try {
      await deleteLesson(lesson.id!);
      await loadData();
    } catch (error) {
      console.error('Error deleting lesson:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !userData || !course) {
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
                  <button
                    onClick={() => router.push('/dashboard/admin/courses')}
                    className="mb-4 text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold"
                  >
                    ← Back to Courses
                  </button>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    {course.title} - Lessons
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Manage lessons for this course
                  </p>
                </motion.div>

                <div className="flex justify-between items-center mb-6">
                  <p className="text-gray-600 dark:text-gray-400">
                    {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
                  </p>
                  <motion.button
                    onClick={() => handleOpenModal()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold shadow-lg"
                  >
                    + Add Lesson
                  </motion.button>
                </div>

                {/* Lessons List */}
                <div className="space-y-4">
                  {lessons.map((lesson, index) => (
                    <motion.div
                      key={lesson.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold">
                              {lesson.order}
                            </span>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                              {lesson.title}
                            </h3>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 mb-2 ml-11">
                            {lesson.description}
                          </p>
                          {lesson.notes && (
                            <p className="text-gray-500 dark:text-gray-400 mb-2 ml-11 whitespace-pre-wrap line-clamp-3">
                              {lesson.notes}
                            </p>
                          )}
                          <div className="flex items-center gap-4 ml-11 text-sm text-gray-500 dark:text-gray-400">
                            <span>⏱️ {lesson.duration} min</span>
                            {lesson.videoURL && (
                              <a
                                href={lesson.videoURL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                              >
                                Watch Video →
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleOpenModal(lesson)}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(lesson)}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {lessons.length === 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-lg text-center">
                    <div className="text-6xl mb-4">📹</div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      No Lessons Yet
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Add your first lesson to this course!
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
                          {editingLesson ? 'Edit Lesson' : 'Create New Lesson'}
                        </h2>
                      </div>
                      <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Lesson Title
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
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Notes (AI-generated)
                          </label>
                          <textarea
                            rows={6}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Video URL
                            </label>
                            <input
                              type="url"
                              required
                              value={formData.videoURL}
                              onChange={(e) => setFormData({ ...formData, videoURL: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                              placeholder="https://..."
                            />
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
                            Order
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={formData.order}
                            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="flex gap-4 pt-4">
                          <button
                            type="submit"
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition-colors"
                          >
                            {editingLesson ? 'Update Lesson' : 'Create Lesson'}
                          </button>
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

