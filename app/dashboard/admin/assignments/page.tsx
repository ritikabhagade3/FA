'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import { getUserData, UserData } from '@/lib/auth';
import {
  Assignment,
  AssignmentSubmission,
  getAssignmentsByTeacher,
  getSubmissionsForAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  markSubmissionChecked,
  listenToSubmissionsForAssignment,
} from '@/lib/assignments';
import Sidebar from '@/components/Sidebar';
import PageTransition from '@/components/PageTransition';
import AuthGuard from '@/components/AuthGuard';
import BackButton from '@/components/BackButton';
import toast from 'react-hot-toast';

interface AssignmentWithSubs extends Assignment {
  submissions?: AssignmentSubmission[];
}

export default function AdminAssignmentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<AssignmentWithSubs[]>([]);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [unsubscribeSubmissions, setUnsubscribeSubmissions] = useState<(() => void) | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AssignmentWithSubs | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');

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

  const loadAssignments = async (teacherId: string) => {
    try {
      const list = await getAssignmentsByTeacher(teacherId);
      setAssignments(list);
    } catch (err) {
      console.error('Error loading assignments:', err);
      toast.error('Error loading assignments');
    }
  };

  const openModal = (assignment?: AssignmentWithSubs) => {
    if (assignment) {
      setEditing(assignment);
      setTitle(assignment.title);
      setDescription(assignment.description);
      const due =
        assignment.dueAt instanceof Date
          ? assignment.dueAt
          : (assignment.dueAt as any)?.toDate?.() || new Date();
      setDueDate(due.toISOString().slice(0, 10));
      setDueTime(due.toTimeString().slice(0, 5));
    } else {
      setEditing(null);
      setTitle('');
      setDescription('');
      setDueDate('');
      setDueTime('');
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const buildDueAt = (): Date | null => {
    if (!dueDate || !dueTime) return null;
    const [hours, minutes] = dueTime.split(':').map((v) => parseInt(v, 10));
    const d = new Date(dueDate);
    d.setHours(hours || 0, minutes || 0, 0, 0);
    return d;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userData) return;
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    const dueAt = buildDueAt();
    if (!dueAt) {
      toast.error('Please select a valid due date and time');
      return;
    }

    try {
      if (editing) {
        await updateAssignment(editing.id!, {
          title: title.trim(),
          description: description.trim(),
          dueAt,
        });
      } else {
        await createAssignment({
          title: title.trim(),
          description: description.trim(),
          createdBy: user.uid,
          createdByName: userData.name,
          dueAt,
        });
      }
      await loadAssignments(user.uid);
      closeModal();
    } catch {
      // errors already toasted
    }
  };

  const handleDeleteAssignment = async (assignment: AssignmentWithSubs) => {
    if (!confirm(`Delete assignment "${assignment.title}"? This will remove all submissions.`)) return;
    try {
      await deleteAssignment(assignment.id!);
      if (user) await loadAssignments(user.uid);
    } catch {
      // toasted from lib
    }
  };

  const toggleSubmissions = async (assignment: AssignmentWithSubs) => {
    // Toggle off if already active
    if (activeAssignmentId === assignment.id) {
      setActiveAssignmentId(null);
      if (unsubscribeSubmissions) {
        unsubscribeSubmissions();
        setUnsubscribeSubmissions(null);
      }
      return;
    }

    // Switch listener to a new assignment
    if (unsubscribeSubmissions) {
      unsubscribeSubmissions();
      setUnsubscribeSubmissions(null);
    }

    try {
      const unsub = listenToSubmissionsForAssignment(assignment.id!, (subs) => {
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === assignment.id ? { ...a, submissions: subs } : a
          )
        );
      });
      setUnsubscribeSubmissions(() => unsub);
      setActiveAssignmentId(assignment.id!);
    } catch (err) {
      console.error('Error subscribing to submissions:', err);
      toast.error('Error loading submissions');
    }
  };

  const handleMarkChecked = async (submission: AssignmentSubmission) => {
    if (!user || !userData || !submission.id) return;
    const remarks = prompt('Add remarks (optional):', submission.remarks || '');
    try {
      await markSubmissionChecked({
        submissionId: submission.id,
        teacherId: user.uid,
        teacherName: userData.name,
        remarks: remarks || undefined,
      });
    } catch {
      // toasted in lib
    }
  };

  const getStatusLabel = (s: AssignmentSubmission) => {
    if (s.status === 'checked') return 'Checked';
    if (s.status === 'submitted') return 'Submitted';
    if (s.status === 'missing') return 'Missing';
    return s.status;
  };

  const getStatusChip = (s: AssignmentSubmission) => {
    const label = getStatusLabel(s);
    let cls =
      'px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
    if (s.status === 'checked')
      cls =
        'px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
    if (s.status === 'missing')
      cls =
        'px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
    return <span className={cls}>{label}</span>;
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
    <AuthGuard requiredRole="admin">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="flex">
          <Sidebar userRole={userData.role} userName={userData.name} userEmail={userData.email} />

          <main className="flex-1 md:ml-0 p-4 md:p-8">
            <PageTransition>
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <BackButton />
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Manage Assignments
                      </h1>
                      <p className="text-gray-600 dark:text-gray-400">
                        Create assignments and review student submissions
                      </p>
                    </motion.div>
                  </div>
                  <motion.button
                    onClick={() => openModal()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg"
                  >
                    + New Assignment
                  </motion.button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 md:p-6">
                  {assignments.length === 0 ? (
                    <div className="py-16 text-center text-gray-500 dark:text-gray-400">
                      <div className="text-5xl mb-4">📝</div>
                      <p className="text-lg">No assignments created yet.</p>
                      <p className="text-sm mt-1">Click "New Assignment" to create one.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {assignments.map((a) => {
                        const due =
                          a.dueAt instanceof Date
                            ? a.dueAt
                            : (a.dueAt as any)?.toDate?.() || new Date();

                        return (
                          <motion.div
                            key={a.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:p-5 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900"
                          >
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                              <div>
                                <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-1">
                                  {a.title}
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                  {a.description}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Due:{' '}
                                  <span className="font-medium">
                                    {due.toLocaleDateString()} {due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Submissions: {a.submissions?.length ?? 0}
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleSubmissions(a)}
                                    className="px-3 py-1.5 rounded-md text-xs font-semibold bg-gray-700 text-white hover:bg-gray-600"
                                  >
                                    {activeAssignmentId === a.id
                                      ? 'Hide Submissions'
                                      : 'View Submissions'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openModal(a)}
                                    className="px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAssignment(a)}
                                    className="px-3 py-1.5 rounded-md text-xs font-semibold bg-red-500 text-white hover:bg-red-600"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>

                            {activeAssignmentId === a.id && (
                              <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                                  Submissions
                                </h3>
                                {a.submissions && a.submissions.length > 0 ? (
                                  <div className="space-y-2">
                                    {a.submissions.map((s) => {
                                      const submitted =
                                        s.submittedAt instanceof Date
                                          ? s.submittedAt
                                          : (s.submittedAt as any)?.toDate?.() || new Date();
                                      return (
                                        <div
                                          key={s.id}
                                          className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 bg-gray-50 dark:bg-gray-800/60 rounded-md px-3 py-2"
                                        >
                                          <div className="space-y-1">
                                            <p className="text-sm text-gray-900 dark:text-white">
                                              {s.studentName}{' '}
                                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                                ({s.studentEmail})
                                              </span>
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                              Submitted: {submitted.toLocaleString()}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                              File:{' '}
                                              <a
                                                href={s.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-500 hover:underline"
                                              >
                                                {s.fileName}
                                              </a>
                                            </p>
                                            {s.remarks && (
                                              <p className="text-xs text-green-500 dark:text-green-300">
                                                Remarks: {s.remarks}
                                              </p>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {getStatusChip(s)}
                                            {s.status !== 'checked' && (
                                              <button
                                                type="button"
                                                onClick={() => handleMarkChecked(s)}
                                                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-green-500 text-white hover:bg-green-600"
                                              >
                                                Mark Checked
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    No submissions yet.
                                  </p>
                                )}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
                  >
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {editing ? 'Edit Assignment' : 'Create Assignment'}
                      </h2>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        ✕
                      </button>
                    </div>
                    <form onSubmit={handleSave} className="px-6 py-4 space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                          Topic / Title
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          required
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                          Description
                        </label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={4}
                          required
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                            Due Date
                          </label>
                          <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                            Due Time
                          </label>
                          <input
                            type="time"
                            value={dueTime}
                            onChange={(e) => setDueTime(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={closeModal}
                          className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-600 text-white hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
                        >
                          {editing ? 'Update Assignment' : 'Create Assignment'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </PageTransition>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

