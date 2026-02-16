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
  getLessonById,
  getCourseProgress,
  markLessonComplete,
  Course,
  Lesson,
  CourseProgress,
} from '@/lib/courses';
import Sidebar from '@/components/Sidebar';
import PageTransition from '@/components/PageTransition';
import AuthGuard from '@/components/AuthGuard';
import BackButton from '@/components/BackButton';

export default function CoursePlayerPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const toEmbed = (url: string) => {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com') || u.hostname === 'youtu.be') {
        let id = '';
        if (u.hostname === 'youtu.be') id = u.pathname.replace('/', '');
        else if (u.searchParams.get('v')) id = u.searchParams.get('v') as string;
        else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/').pop() || '';
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      return url;
    } catch {
      return url;
    }
  };

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
        await loadData(currentUser.uid);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [courseId]);

  useEffect(() => {
    if (selectedLessonId && lessons.length > 0) {
      const lesson = lessons.find((l) => l.id === selectedLessonId);
      if (lesson) {
        setCurrentLesson(lesson);
      }
    } else if (lessons.length > 0 && !selectedLessonId) {
      // Load first incomplete lesson or first lesson
      if (progress && progress.completedLessons.length < lessons.length) {
        const incompleteLessons = lessons.filter(
          (l) => !progress.completedLessons.includes(l.id!)
        );
        if (incompleteLessons.length > 0) {
          setCurrentLesson(incompleteLessons[0]);
          setSelectedLessonId(incompleteLessons[0].id!);
        } else {
          setCurrentLesson(lessons[0]);
          setSelectedLessonId(lessons[0].id!);
        }
      } else {
        setCurrentLesson(lessons[0]);
        setSelectedLessonId(lessons[0].id!);
      }
    }
  }, [lessons, progress, selectedLessonId]);

  const loadData = async (userId: string) => {
    try {
      const [courseData, lessonsData, progressData] = await Promise.all([
        getCourseById(courseId),
        getLessonsByCourseId(courseId),
        getCourseProgress(courseId, userId),
      ]);

      if (!courseData) {
        router.push('/dashboard/user/courses');
        return;
      }

      setCourse(courseData);
      setLessons(lessonsData);
      setProgress(progressData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleLessonSelect = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    const lesson = lessons.find((l) => l.id === lessonId);
    if (lesson) {
      setCurrentLesson(lesson);
    }
  };

  const handleMarkComplete = async () => {
    if (!user || !currentLesson) return;

    try {
      await markLessonComplete(courseId, currentLesson.id!, user.uid);
      await loadData(user.uid);
    } catch (error) {
      console.error('Error marking lesson complete:', error);
    }
  };

  const isLessonComplete = (lessonId: string) => {
    return progress?.completedLessons.includes(lessonId) || false;
  };

  const getProgressPercentage = () => {
    if (!progress || lessons.length === 0) return 0;
    return progress.progress;
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
                  className="mb-6 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <BackButton className="mt-1" />
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {course.title}
                      </h1>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                        <span>👤 {course.instructor}</span>
                        <span>📚 {lessons.length} lessons</span>
                        <span>⏱️ {course.duration} min</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Course Progress
                      </span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {getProgressPercentage()}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${getProgressPercentage()}%` }}
                        transition={{ duration: 0.5 }}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Lesson List */}
                  <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                        Lessons
                      </h2>
                      <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {lessons.map((lesson, index) => (
                          <button
                            key={lesson.id}
                            onClick={() => handleLessonSelect(lesson.id!)}
                            className={`w-full text-left p-4 rounded-lg transition-colors ${
                              selectedLessonId === lesson.id
                                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                                : isLessonComplete(lesson.id!)
                                ? 'bg-green-50 dark:bg-green-900/20 text-gray-700 dark:text-gray-300'
                                : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold">
                                    {lesson.order}.
                                  </span>
                                  {isLessonComplete(lesson.id!) && (
                                    <span className="text-green-500">✓</span>
                                  )}
                                  <span className="font-semibold">{lesson.title}</span>
                                </div>
                                <p className="text-xs opacity-75 line-clamp-1">
                                  {lesson.description}
                                </p>
                                <span className="text-xs opacity-75 mt-1 block">
                                  ⏱️ {lesson.duration} min
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Video Player */}
                  <div className="lg:col-span-2">
                    {currentLesson ? (
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                        <div className="aspect-video bg-black">
                          {currentLesson.videoURL ? (
                            <iframe
                              src={toEmbed(currentLesson.videoURL)}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white">
                              <div className="text-center">
                                <div className="text-6xl mb-4">📹</div>
                                <p className="text-xl">Video URL not available</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-6">
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            {currentLesson.title}
                          </h2>
                          <p className="text-gray-600 dark:text-gray-400 mb-6">
                            {currentLesson.description}
                          </p>
                          {currentLesson.notes && (
                            <div className="prose dark:prose-invert max-w-none mb-6">
                              <h3 className="text-lg font-semibold mb-2">Notes</h3>
                              <p className="whitespace-pre-wrap">{currentLesson.notes}</p>
                            </div>
                          )}
                          
                          {!isLessonComplete(currentLesson.id!) && (
                            <motion.button
                              onClick={handleMarkComplete}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold shadow-lg"
                            >
                              ✓ Mark as Complete
                            </motion.button>
                          )}
                          
                          {isLessonComplete(currentLesson.id!) && (
                            <div className="px-6 py-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg font-semibold">
                              ✓ Lesson Completed
                            </div>
                          )}

                          {getProgressPercentage() === 100 && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-6 p-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg text-center"
                            >
                              <div className="text-4xl mb-2">🎓</div>
                              <h3 className="text-xl font-bold text-white mb-2">
                                Congratulations!
                              </h3>
                              <p className="text-white mb-4">
                                You've completed this course!
                              </p>
                              <button
                                onClick={() => router.push('/dashboard/user/certificates')}
                                className="px-6 py-2 bg-white text-orange-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                              >
                                View Certificate
                              </button>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
                        <div className="text-6xl mb-4">📚</div>
                        <p className="text-gray-600 dark:text-gray-400">
                          Select a lesson to begin
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </PageTransition>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

