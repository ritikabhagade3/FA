'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import { getUserData, UserData } from '@/lib/auth';
import {
  Assignment,
  AssignmentSubmission,
  getAllAssignments,
  getSubmissionForStudent,
  submitAssignment,
  deleteSubmission,
} from '@/lib/assignments';
import Sidebar from '@/components/Sidebar';
import PageTransition from '@/components/PageTransition';
import AuthGuard from '@/components/AuthGuard';
import BackButton from '@/components/BackButton';
import toast from 'react-hot-toast';

interface AssignmentWithSubmission extends Assignment {
  submission: AssignmentSubmission | null;
}

export default function UserAssignmentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<AssignmentWithSubmission[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});

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
        await loadAssignments(currentUser.uid);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadAssignments = async (userId: string) => {
    try {
      const all = await getAllAssignments();
      const withSubs: AssignmentWithSubmission[] = [];

      for (const a of all) {
        const sub = await getSubmissionForStudent(a.id!, userId);
        withSubs.push({ ...a, submission: sub });
      }

      setAssignments(withSubs);
    } catch (err) {
      console.error('Error loading assignments:', err);
      toast.error('Error loading assignments');
    }
  };

  const handleFileChange = (assignmentId: string, file: File | null) => {
    setSelectedFiles((prev) => ({ ...prev, [assignmentId]: file }));
  };

  const getStatus = (assignment: AssignmentWithSubmission): 'Submitted' | 'Checked' | 'Missing' | 'Pending' => {
    const now = new Date();
    const due =
      assignment.dueAt instanceof Date
        ? assignment.dueAt
        : (assignment.dueAt as any)?.toDate?.() || new Date();

    if (assignment.submission?.status === 'checked') return 'Checked';
    if (assignment.submission) return 'Submitted';
    if (now > due) return 'Missing';
    return 'Pending';
  };

  const getStatusColor = (status: string) => {
    if (status === 'Checked') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
    if (status === 'Submitted') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
    if (status === 'Missing') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
  };

  const handleSubmit = async (assignment: AssignmentWithSubmission) => {
    if (!user || !userData) return;
    const file = selectedFiles[assignment.id!];
    if (!file) {
      toast.error('Please choose a file to upload');
      return;
    }

    setUploadingId(assignment.id!);
    try {
      await submitAssignment({
        assignment,
        studentId: user.uid,
        studentName: userData.name,
        studentEmail: userData.email,
        file,
      });
      await loadAssignments(user.uid);
      setSelectedFiles((prev) => ({ ...prev, [assignment.id!]: null }));
    } catch {
      // errors are already toasted from lib
    } finally {
      setUploadingId(null);
    }
  };

  const handleDeleteSubmission = async (assignment: AssignmentWithSubmission) => {
    if (!assignment.submission?.id) return;
    if (!confirm('Delete this submission?')) return;

    try {
      await deleteSubmission(assignment.submission.id);
      if (user) {
        await loadAssignments(user.uid);
      }
    } catch {
      // error toasted in lib
    }
  };

  const handleEditClick = (assignmentId: string) => {
    if (typeof document === 'undefined') return;
    const input = document.getElementById(`assignment-file-${assignmentId}`) as HTMLInputElement | null;
    input?.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user || !userData) return null;

  return (
    <AuthGuard requiredRole="user">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="flex">
          <Sidebar userRole={userData.role} userName={userData.name} userEmail={userData.email} />

          <main className="flex-1 md:ml-0 p-4 md:p-8">
            <PageTransition>
              <div className="max-w-6xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <BackButton />
                    <div>
                      <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Assignments
                      </h1>
                      <p className="text-gray-600 dark:text-gray-400">
                        Upload and track your assignment submissions
                      </p>
                    </div>
                  </div>
                </motion.div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 md:p-6">
                  {assignments.length === 0 ? (
                    <div className="py-16 text-center text-gray-500 dark:text-gray-400">
                      <div className="text-5xl mb-4">📝</div>
                      <p className="text-lg">No assignments have been posted yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {assignments.map((assignment) => {
                        const status = getStatus(assignment);
                        const due =
                          assignment.dueAt instanceof Date
                            ? assignment.dueAt
                            : (assignment.dueAt as any)?.toDate?.() || new Date();
                        const readOnly = status === 'Missing';
                        const file = selectedFiles[assignment.id!] || null;

                        return (
                          <motion.div
                            key={assignment.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:p-5 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900"
                          >
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-3 mb-1">
                                  <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
                                    {assignment.title}
                                  </h2>
                                  <span
                                    className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                                      status
                                    )}`}
                                  >
                                    {status}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                  {assignment.description}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Due:{' '}
                                  <span className="font-medium">
                                    {due.toLocaleDateString()} {due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {' • '}
                                  Posted by {assignment.createdByName}
                                </p>
                              </div>

                              <div className="w-full md:w-72 space-y-3">
                                {assignment.submission && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    <p>
                                      Last submitted:{' '}
                                      {assignment.submission.submittedAt instanceof Date
                                        ? assignment.submission.submittedAt.toLocaleString()
                                        : (assignment.submission.submittedAt as any)?.toDate?.().toLocaleString() ||
                                          ''}
                                    </p>
                                    <p className="truncate">
                                      File:{' '}
                                      <a
                                        href={assignment.submission.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:underline"
                                      >
                                        {assignment.submission.fileName}
                                      </a>
                                    </p>
                                    {assignment.submission.remarks && (
                                      <p className="mt-1 text-green-500 dark:text-green-300">
                                        Remarks: {assignment.submission.remarks}
                                      </p>
                                    )}
                                    <div className="mt-2 flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleEditClick(assignment.id!)}
                                        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-white"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSubmission(assignment)}
                                        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-red-500 hover:bg-red-600 text-white"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <input
                                      id={`assignment-file-${assignment.id}`}
                                      type="file"
                                      accept=".pdf,.doc,.docx,image/*"
                                      disabled={readOnly || uploadingId === assignment.id}
                                      onChange={(e) =>
                                        handleFileChange(
                                          assignment.id!,
                                          e.target.files && e.target.files[0] ? e.target.files[0] : null
                                        )
                                      }
                                      className="block w-full sm:flex-1 text-xs text-gray-500 dark:text-gray-300
                                        file:mr-2 file:py-1.5 file:px-3
                                        file:rounded-md file:border-0
                                        file:text-xs file:font-semibold
                                        file:bg-gradient-to-r file:from-blue-500 file:to-purple-500 file:text-white
                                        hover:file:from-blue-600 hover:file:to-purple-600
                                        disabled:opacity-50"
                                    />

                                    <button
                                      type="button"
                                      disabled={readOnly || uploadingId === assignment.id || !file}
                                      onClick={() => handleSubmit(assignment)}
                                      className="px-4 py-2 rounded-md text-xs font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                      {uploadingId === assignment.id
                                        ? 'Uploading...'
                                        : assignment.submission
                                        ? 'Re-upload'
                                        : 'Submit'}
                                    </button>
                                  </div>
                                  {readOnly && (
                                    <p className="text-[11px] text-red-500 text-right">
                                      Deadline passed. New submissions are blocked.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </PageTransition>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

