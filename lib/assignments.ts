import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebaseConfig';
import toast from 'react-hot-toast';

// Helpers
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

export type AssignmentStatus = 'submitted' | 'missing' | 'checked';

export interface Assignment {
  id?: string;
  title: string; // Topic name
  description: string;
  // Optional linkage to a course (by id)
  courseId?: string;
  createdBy: string; // teacher/admin uid
  createdByName: string;
  dueAt: Timestamp | Date; // exact due date & time
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface AssignmentSubmission {
  id?: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  submittedAt: Timestamp | Date;
  status: AssignmentStatus;
  remarks?: string;
  checkedAt?: Timestamp | Date;
  checkedBy?: string;
  checkedByName?: string;
}

// Allowed file MIME types for assignments
export const ALLOWED_ASSIGNMENT_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

export const isAllowedAssignmentFile = (file: File): boolean => {
  if (!file.type) return false;
  if (ALLOWED_ASSIGNMENT_FILE_TYPES.includes(file.type)) return true;
  // Allow generic image types
  if (file.type.startsWith('image/')) return true;
  return false;
};

// -------- Assignment CRUD (Teacher/Admin) --------

export const createAssignment = async (
  data: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const assignmentsRef = collection(db, 'assignments');
    const newRef = doc(assignmentsRef);
    const payload = removeUndefined({
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(newRef, payload);
    toast.success('Assignment created successfully');
    return newRef.id;
  } catch (error) {
    console.error('Error creating assignment:', error);
    toast.error('Error creating assignment');
    throw error;
  }
};

export const updateAssignment = async (
  assignmentId: string,
  data: Partial<Assignment>
): Promise<void> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const refDoc = doc(db, 'assignments', assignmentId);
    await updateDoc(
      refDoc,
      removeUndefined({
        ...data,
        updatedAt: Timestamp.now(),
      })
    );
    toast.success('Assignment updated successfully');
  } catch (error) {
    console.error('Error updating assignment:', error);
    toast.error('Error updating assignment');
    throw error;
  }
};

export const deleteAssignment = async (assignmentId: string): Promise<void> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    // Delete all submissions and their files first
    const subs = await getSubmissionsForAssignment(assignmentId);
    if (storage) {
      await Promise.all(
        subs.map(async (sub) => {
          try {
            if (sub.fileUrl) {
              const fileRef = ref(storage, sub.fileUrl);
              await deleteObject(fileRef);
            }
          } catch (e) {
            console.error('Error deleting assignment file:', e);
          }
        })
      );
    }

    const assignmentsRef = doc(db, 'assignments', assignmentId);
    await deleteDoc(assignmentsRef);
    toast.success('Assignment deleted successfully');
  } catch (error) {
    console.error('Error deleting assignment:', error);
    toast.error('Error deleting assignment');
    throw error;
  }
};

export const getAllAssignments = async (): Promise<Assignment[]> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const assignmentsRef = collection(db, 'assignments');
    const q = query(assignmentsRef, orderBy('dueAt', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as Assignment;
      return {
        id: d.id,
        ...data,
        createdAt: (data.createdAt as any)?.toDate?.() || new Date(),
        updatedAt: (data.updatedAt as any)?.toDate?.() || new Date(),
        dueAt: (data.dueAt as any)?.toDate?.() || new Date(),
      };
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    throw error;
  }
};

export const getAssignmentsByTeacher = async (teacherId: string): Promise<Assignment[]> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const assignmentsRef = collection(db, 'assignments');
    const q = query(assignmentsRef, where('createdBy', '==', teacherId), orderBy('dueAt', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as Assignment;
      return {
        id: d.id,
        ...data,
        createdAt: (data.createdAt as any)?.toDate?.() || new Date(),
        updatedAt: (data.updatedAt as any)?.toDate?.() || new Date(),
        dueAt: (data.dueAt as any)?.toDate?.() || new Date(),
      };
    });
  } catch (error) {
    console.error('Error fetching teacher assignments:', error);
    throw error;
  }
};

// -------- Submissions (Student & Teacher) --------

export const getSubmissionForStudent = async (
  assignmentId: string,
  studentId: string
): Promise<AssignmentSubmission | null> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const submissionsRef = collection(db, 'assignmentSubmissions');
    const q = query(
      submissionsRef,
      where('assignmentId', '==', assignmentId),
      where('studentId', '==', studentId)
    );
    const snap = await getDocs(q);
    const docSnap = snap.docs[0];
    if (!docSnap) return null;
    const data = docSnap.data() as AssignmentSubmission;
    return {
      id: docSnap.id,
      ...data,
      submittedAt: (data.submittedAt as any)?.toDate?.() || new Date(),
      checkedAt: (data.checkedAt as any)?.toDate?.(),
    };
  } catch (error) {
    console.error('Error fetching submission:', error);
    throw error;
  }
};

export const getSubmissionsForAssignment = async (
  assignmentId: string
): Promise<AssignmentSubmission[]> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const submissionsRef = collection(db, 'assignmentSubmissions');
    const q = query(submissionsRef, where('assignmentId', '==', assignmentId));
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => {
      const data = d.data() as AssignmentSubmission;
      return {
        id: d.id,
        ...data,
        submittedAt: (data.submittedAt as any)?.toDate?.() || new Date(),
        checkedAt: (data.checkedAt as any)?.toDate?.(),
      };
    });
    return items.sort(
      (a, b) =>
        (a.submittedAt as Date).getTime() - (b.submittedAt as Date).getTime()
    );
  } catch (error) {
    console.error('Error fetching submissions:', error);
    throw error;
  }
};

// Real-time listener for submissions of a single assignment
export const listenToSubmissionsForAssignment = (
  assignmentId: string,
  onChange: (subs: AssignmentSubmission[]) => void
): (() => void) => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  const submissionsRef = collection(db, 'assignmentSubmissions');
  const q = query(submissionsRef, where('assignmentId', '==', assignmentId));

  const unsubscribe = onSnapshot(q, (snap) => {
    const items: AssignmentSubmission[] = [];
    snap.forEach((d) => {
      const data = d.data() as AssignmentSubmission;
      items.push({
        id: d.id,
        ...data,
        submittedAt: (data.submittedAt as any)?.toDate?.() || new Date(),
        checkedAt: (data.checkedAt as any)?.toDate?.(),
      });
    });

    items.sort(
      (a, b) =>
        (a.submittedAt as Date).getTime() - (b.submittedAt as Date).getTime()
    );

    onChange(items);
  });

  return unsubscribe;
};

// Upload or re-upload a submission file (student)
export const submitAssignment = async (params: {
  assignment: Assignment;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  file: File;
}): Promise<void> => {
  const { assignment, studentId, studentName, studentEmail, file } = params;

  if (!db || !storage) {
    throw new Error('Firebase not initialized');
  }

  if (!isAllowedAssignmentFile(file)) {
    toast.error('Only PDF, document, and image files are allowed');
    throw new Error('Invalid file type');
  }

  // Enforce deadline
  const now = new Date();
  const due = assignment.dueAt instanceof Date ? assignment.dueAt : (assignment.dueAt as any).toDate?.() || new Date();
  if (now > due) {
    toast.error('Submission deadline has passed');
    throw new Error('Deadline passed');
  }

  try {
    const existing = await getSubmissionForStudent(assignment.id!, studentId);

    // Upload file
    const safeName = encodeURIComponent(file.name);
    const storagePath = `assignments/${assignment.id}/${studentId}/${Date.now()}-${safeName}`;
    const fileRef = ref(storage, storagePath);
    await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(fileRef);

    // Delete old file if any
    if (existing?.fileUrl) {
      try {
        const oldRef = ref(storage, existing.fileUrl);
        await deleteObject(oldRef);
      } catch (e) {
        console.error('Error deleting old submission file:', e);
      }
    }

    const submissionsRef = collection(db, 'assignmentSubmissions');

    if (existing) {
      // Update existing
      const subDoc = doc(db, 'assignmentSubmissions', existing.id!);
      await updateDoc(
        subDoc,
        removeUndefined({
          fileUrl: downloadURL,
          fileName: file.name,
          fileType: file.type,
          submittedAt: Timestamp.now(),
          status: 'submitted' as AssignmentStatus,
        })
      );
      toast.success('Assignment re-submitted successfully');
    } else {
      // Create new
      const newRef = doc(submissionsRef);
      const payload: AssignmentSubmission = {
        assignmentId: assignment.id!,
        studentId,
        studentName,
        studentEmail,
        fileUrl: downloadURL,
        fileName: file.name,
        fileType: file.type,
        submittedAt: Timestamp.now(),
        status: 'submitted',
      };
      await setDoc(newRef, removeUndefined(payload));
      toast.success('Assignment submitted successfully');
    }
  } catch (error) {
    console.error('Error submitting assignment:', error);
    toast.error('Error submitting assignment');
    throw error;
  }
};

// Delete a submission (student, before due date)
export const deleteSubmission = async (submissionId: string): Promise<void> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const subRef = doc(db, 'assignmentSubmissions', submissionId);
    const snap = await getDoc(subRef);
    if (!snap.exists()) return;
    const data = snap.data() as AssignmentSubmission;

    if (storage && data.fileUrl) {
      try {
        const fileRef = ref(storage, data.fileUrl);
        await deleteObject(fileRef);
      } catch (e) {
        console.error('Error deleting submission file:', e);
      }
    }

    await deleteDoc(subRef);
    toast.success('Submission deleted');
  } catch (error) {
    console.error('Error deleting submission:', error);
    toast.error('Error deleting submission');
    throw error;
  }
};

// Teacher: mark as checked & add remarks
export const markSubmissionChecked = async (params: {
  submissionId: string;
  teacherId: string;
  teacherName: string;
  remarks?: string;
}): Promise<void> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const { submissionId, teacherId, teacherName, remarks } = params;
    const subRef = doc(db, 'assignmentSubmissions', submissionId);
    await updateDoc(
      subRef,
      removeUndefined({
        status: 'checked' as AssignmentStatus,
        remarks,
        checkedAt: Timestamp.now(),
        checkedBy: teacherId,
        checkedByName: teacherName,
      })
    );
    toast.success('Submission marked as checked');
  } catch (error) {
    console.error('Error marking submission checked:', error);
    toast.error('Error updating submission');
    throw error;
  }
};

