import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebaseConfig';
import toast from 'react-hot-toast';

// Remove undefined fields to satisfy Firestore constraints
const removeUndefined = <T extends Record<string, any>>(obj: T): T => {
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    const value = (obj as any)[key];
    if (value !== undefined) {
      cleaned[key] = value;
    }
  });
  return cleaned as T;
};

// Course Data Model
export interface Course {
  id?: string;
  title: string;
  description: string;
  category: string;
  instructor: string;
  instructorId: string;
  imageURL?: string;
  price: number;
  rating: number;
  totalRatings: number;
  lessons: string[]; // Array of lesson IDs
  enrolledStudents: string[]; // Array of user IDs
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // in minutes
}

// Lesson Data Model
export interface Lesson {
  id?: string;
  courseId: string;
  title: string;
  description: string;
  notes?: string;
  videoURL: string;
  duration: number; // in minutes
  order: number; // Order in the course
  createdAt: Timestamp | Date;
}

// Course Progress Model
export interface CourseProgress {
  courseId: string;
  userId: string;
  completedLessons: string[]; // Array of completed lesson IDs
  progress: number; // 0-100
  lastAccessed: Timestamp | Date;
  completedAt?: Timestamp | Date;
}

// Course Quiz Model (admin-generated quiz for a course)
export interface CourseQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface CourseQuiz {
  id?: string;
  courseId: string;
  questions: CourseQuizQuestion[];
  createdAt: Timestamp | Date;
}

// Get all courses
export const getAllCourses = async (): Promise<Course[]> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const coursesRef = collection(db, 'courses');
    const q = query(coursesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Course[];
  } catch (error: any) {
    console.error('Error fetching courses:', error);
    toast.error('Error fetching courses');
    throw error;
  }
};

// Get course by ID
export const getCourseById = async (courseId: string): Promise<Course | null> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const courseRef = doc(db, 'courses', courseId);
    const courseSnap = await getDoc(courseRef);
    if (courseSnap.exists()) {
      return {
        id: courseSnap.id,
        ...courseSnap.data(),
        createdAt: courseSnap.data().createdAt?.toDate() || new Date(),
        updatedAt: courseSnap.data().updatedAt?.toDate() || new Date(),
      } as Course;
    }
    return null;
  } catch (error: any) {
    console.error('Error fetching course:', error);
    toast.error('Error fetching course');
    throw error;
  }
};

// Create course
export const createCourse = async (courseData: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const coursesRef = collection(db, 'courses');
    const newCourseRef = doc(coursesRef);
    const course = removeUndefined({
      ...courseData,
      lessons: courseData.lessons || [],
      enrolledStudents: courseData.enrolledStudents || [],
      rating: courseData.rating || 0,
      totalRatings: courseData.totalRatings || 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(newCourseRef, course);
    toast.success('Course created successfully!');
    return newCourseRef.id;
  } catch (error: any) {
    console.error('Error creating course:', error);
    toast.error('Error creating course');
    throw error;
  }
};

// Update course
export const updateCourse = async (courseId: string, courseData: Partial<Course>): Promise<void> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const courseRef = doc(db, 'courses', courseId);
    await updateDoc(courseRef, removeUndefined({
      ...courseData,
      updatedAt: Timestamp.now(),
    }));
    toast.success('Course updated successfully!');
  } catch (error: any) {
    console.error('Error updating course:', error);
    toast.error('Error updating course');
    throw error;
  }
};

// Delete course
export const deleteCourse = async (courseId: string, imageURL?: string): Promise<void> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    // Delete image from storage if exists
    if (imageURL && storage) {
      try {
        const imageRef = ref(storage, imageURL);
        await deleteObject(imageRef);
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }

    // Delete all lessons
    const lessons = await getLessonsByCourseId(courseId);
    for (const lesson of lessons) {
      await deleteLesson(lesson.id!);
    }

    // Delete course
    const courseRef = doc(db, 'courses', courseId);
    await deleteDoc(courseRef);
    toast.success('Course deleted successfully!');
  } catch (error: any) {
    console.error('Error deleting course:', error);
    toast.error('Error deleting course');
    throw error;
  }
};

// Upload course image
export const uploadCourseImage = async (file: File, courseId: string): Promise<string> => {
  if (!storage) {
    throw new Error('Firebase Storage not initialized');
  }
  try {
    const imageRef = ref(storage, `courses/${courseId}/${file.name}`);
    await uploadBytes(imageRef, file);
    const downloadURL = await getDownloadURL(imageRef);
    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading image:', error);
    toast.error('Error uploading image');
    throw error;
  }
};

// Get lessons by course ID
export const getLessonsByCourseId = async (courseId: string): Promise<Lesson[]> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const lessonsRef = collection(db, 'lessons');
    // Avoid composite index requirement by sorting on the client
    const q = query(lessonsRef, where('courseId', '==', courseId));
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Lesson[];
    return items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (error: any) {
    console.error('Error fetching lessons:', error);
    throw error;
  }
};

// Create course quiz
export const createCourseQuiz = async (courseId: string, questions: CourseQuizQuestion[]): Promise<string> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const quizRef = doc(collection(db, 'courseQuizzes'));
    const payload: CourseQuiz = removeUndefined({
      courseId,
      questions: (questions || []).map(q => removeUndefined(q)),
      createdAt: Timestamp.now(),
    });
    await setDoc(quizRef, payload as any);
    return quizRef.id;
  } catch (error: any) {
    console.error('Error creating course quiz:', error);
    toast.error('Error creating course quiz');
    throw error;
  }
};

// Get course quiz by courseId
export const getCourseQuizByCourseId = async (courseId: string): Promise<CourseQuiz | null> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const quizzesRef = collection(db, 'courseQuizzes');
    const qy = query(quizzesRef, where('courseId', '==', courseId));
    const snap = await getDocs(qy);
    const first = snap.docs[0];
    if (first) {
      const data = first.data() as CourseQuiz;
      return { id: first.id, ...data, createdAt: (data.createdAt as any)?.toDate?.() || new Date() };
    }
    return null;
  } catch (error: any) {
    console.error('Error fetching course quiz:', error);
    throw error;
  }
};

// Get lesson by ID
export const getLessonById = async (lessonId: string): Promise<Lesson | null> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const lessonRef = doc(db, 'lessons', lessonId);
    const lessonSnap = await getDoc(lessonRef);
    if (lessonSnap.exists()) {
      return {
        id: lessonSnap.id,
        ...lessonSnap.data(),
        createdAt: lessonSnap.data().createdAt?.toDate() || new Date(),
      } as Lesson;
    }
    return null;
  } catch (error: any) {
    console.error('Error fetching lesson:', error);
    throw error;
  }
};

// Create lesson
export const createLesson = async (lessonData: Omit<Lesson, 'id' | 'createdAt'>): Promise<string> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const lessonsRef = collection(db, 'lessons');
    const newLessonRef = doc(lessonsRef);
    const lesson = removeUndefined({
      ...lessonData,
      createdAt: Timestamp.now(),
    });
    await setDoc(newLessonRef, lesson);

    // Update course lessons array
    const courseRef = doc(db, 'courses', lessonData.courseId);
    const courseSnap = await getDoc(courseRef);
    if (courseSnap.exists()) {
      const courseData = courseSnap.data() as Course;
      const lessons = courseData.lessons || [];
      if (!lessons.includes(newLessonRef.id)) {
        await updateDoc(courseRef, {
          lessons: [...lessons, newLessonRef.id],
        });
      }
    }

    toast.success('Lesson created successfully!');
    return newLessonRef.id;
  } catch (error: any) {
    console.error('Error creating lesson:', error);
    toast.error('Error creating lesson');
    throw error;
  }
};

// Update lesson
export const updateLesson = async (lessonId: string, lessonData: Partial<Lesson>): Promise<void> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const lessonRef = doc(db, 'lessons', lessonId);
    await updateDoc(lessonRef, lessonData);
    toast.success('Lesson updated successfully!');
  } catch (error: any) {
    console.error('Error updating lesson:', error);
    toast.error('Error updating lesson');
    throw error;
  }
};

// Delete lesson
export const deleteLesson = async (lessonId: string): Promise<void> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    // Get lesson to find course ID
    const lesson = await getLessonById(lessonId);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

    // Delete lesson
    const lessonRef = doc(db, 'lessons', lessonId);
    await deleteDoc(lessonRef);

    // Remove from course lessons array
    const courseRef = doc(db, 'courses', lesson.courseId);
    const courseSnap = await getDoc(courseRef);
    if (courseSnap.exists()) {
      const courseData = courseSnap.data() as Course;
      const lessons = courseData.lessons || [];
      await updateDoc(courseRef, {
        lessons: lessons.filter((id) => id !== lessonId),
      });
    }

    toast.success('Lesson deleted successfully!');
  } catch (error: any) {
    console.error('Error deleting lesson:', error);
    toast.error('Error deleting lesson');
    throw error;
  }
};

// Enroll user in course
export const enrollInCourse = async (courseId: string, userId: string): Promise<void> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    // Add course to user's enrolled courses
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const enrolledCourses = userData.enrolledCourses || [];
      if (!enrolledCourses.includes(courseId)) {
        await updateDoc(userRef, {
          enrolledCourses: [...enrolledCourses, courseId],
        });
      }
    }

    // Add user to course's enrolled students
    const courseRef = doc(db, 'courses', courseId);
    const courseSnap = await getDoc(courseRef);
    if (courseSnap.exists()) {
      const courseData = courseSnap.data() as Course;
      const enrolledStudents = courseData.enrolledStudents || [];
      if (!enrolledStudents.includes(userId)) {
        await updateDoc(courseRef, {
          enrolledStudents: [...enrolledStudents, userId],
        });
      }
    }

    // Initialize course progress
    const progressRef = doc(db, 'courseProgress', `${userId}_${courseId}`);
    await setDoc(progressRef, {
      courseId,
      userId,
      completedLessons: [],
      progress: 0,
      lastAccessed: Timestamp.now(),
    });

    toast.success('Successfully enrolled in course!');
  } catch (error: any) {
    console.error('Error enrolling in course:', error);
    toast.error('Error enrolling in course');
    throw error;
  }
};

// Get user's enrolled courses
export const getUserEnrolledCourses = async (userId: string): Promise<Course[]> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const enrolledCourses = userSnap.data().enrolledCourses || [];
      const courses = await Promise.all(
        enrolledCourses.map((courseId: string) => getCourseById(courseId))
      );
      return courses.filter((course) => course !== null) as Course[];
    }
    return [];
  } catch (error: any) {
    console.error('Error fetching enrolled courses:', error);
    throw error;
  }
};

// Get course progress
export const getCourseProgress = async (courseId: string, userId: string): Promise<CourseProgress | null> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const progressRef = doc(db, 'courseProgress', `${userId}_${courseId}`);
    const progressSnap = await getDoc(progressRef);
    if (progressSnap.exists()) {
      const data = progressSnap.data();
      return {
        ...data,
        lastAccessed: data.lastAccessed?.toDate() || new Date(),
        completedAt: data.completedAt?.toDate(),
      } as CourseProgress;
    }
    return null;
  } catch (error: any) {
    console.error('Error fetching course progress:', error);
    throw error;
  }
};

// Mark lesson as complete
export const markLessonComplete = async (
  courseId: string,
  lessonId: string,
  userId: string
): Promise<void> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const progressRef = doc(db, 'courseProgress', `${userId}_${courseId}`);
    const progressSnap = await getDoc(progressRef);
    
    const course = await getCourseById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    const lessons = await getLessonsByCourseId(courseId);
    const totalLessons = lessons.length;

    if (progressSnap.exists()) {
      const progressData = progressSnap.data() as CourseProgress;
      const completedLessons = progressData.completedLessons || [];
      
      if (!completedLessons.includes(lessonId)) {
        const newCompletedLessons = [...completedLessons, lessonId];
        const progress = Math.round((newCompletedLessons.length / totalLessons) * 100);
        const isCompleted = progress === 100;

        await updateDoc(progressRef, {
          completedLessons: newCompletedLessons,
          progress,
          lastAccessed: Timestamp.now(),
          ...(isCompleted && { completedAt: Timestamp.now() }),
        });
      }
    } else {
      // Initialize progress
      await setDoc(progressRef, {
        courseId,
        userId,
        completedLessons: [lessonId],
        progress: Math.round((1 / totalLessons) * 100),
        lastAccessed: Timestamp.now(),
      });
    }
  } catch (error: any) {
    console.error('Error marking lesson complete:', error);
    toast.error('Error updating progress');
    throw error;
  }
};

