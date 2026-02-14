'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import { getAllUsers, User, updateUserDetails, toggleUserActivation, changeUserUid } from '@/lib/usermanagement';
import { getUserActivity, UserActivity } from '@/lib/activity';
import { getUserCertificates, Certificate, resendCertificate } from '@/lib/certificatemanagement';
import { getUserData, UserData } from '@/lib/auth';
import { generateCertificatePDF } from '@/lib/certificates';
import Sidebar from '@/components/Sidebar';
import PageTransition from '@/components/PageTransition';
import AuthGuard from '@/components/AuthGuard';
import EditUserModal from '@/components/admin/editusermodal';
import NotifyUserModal from '@/components/admin/NotifyUserModal';

type Tab = 'all-users' | 'activity' | 'manage-certificates';

export default function UserManagementPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('all-users');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity | null>(null);
  const [userCertificates, setUserCertificates] = useState<Certificate[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const data = await getUserData(currentUser.uid);
        setUserData(data);
        if (data?.role === 'admin') {
          const fetchedUsers = await getAllUsers();
          setUsers(fetchedUsers);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSaveUser = async (uid: string, data: Partial<User> & { newUid?: string }) => {
    if (data.newUid && data.newUid !== uid) {
      await changeUserUid(uid, data.newUid);
      const updatedUsers = users.map(u => u.uid === uid ? { ...u, uid: data.newUid, ...data, newUid: undefined } : u);
      setUsers(updatedUsers);
    } else {
      await updateUserDetails(uid, data);
      const updatedUsers = users.map(u => u.uid === uid ? { ...u, ...data } : u);
      setUsers(updatedUsers);
    }
  };

  const handleViewCertificate = (cert: Certificate) => {
    if (!selectedUser) return;
    generateCertificatePDF({
      userName: selectedUser.name,
      courseName: cert.courseId,
      type: 'course',
      completionDate: cert.issuedDate instanceof Date ? cert.issuedDate : new Date(cert.issuedDate),
    });
  };

  const handleResendCertificate = async (cert: Certificate) => {
    await resendCertificate(cert.certificateId);
    setNotification(`Certificate ${cert.certificateId} resent to user ${cert.userId}`);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleSendNotification = async (uid: string, message: string) => {
    console.log(`Sending notification to ${uid}: ${message}`);
    setNotification(`Notification sent to user ${uid}`);
    setTimeout(() => setNotification(''), 3000);
  };

  useEffect(() => {
    if (selectedUser && activeTab === 'activity') {
      getUserActivity(selectedUser.uid).then(setUserActivity);
    } else if (selectedUser && activeTab === 'manage-certificates') {
      getUserCertificates(selectedUser.uid).then(setUserCertificates);
    }
  }, [selectedUser, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !userData || userData.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">You must be an admin to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard requiredRole="admin">
      <PageTransition>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
          <Sidebar userRole={userData.role} userName={userData.name} userEmail={userData.email} />
          <div className="flex-1 p-8">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
              >
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">User Management</h1>
                <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setActiveTab('all-users')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'all-users' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}`}
                    >
                      All Users
                    </button>
                    <button
                      onClick={() => setActiveTab('activity')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'activity' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}`}
                    >
                      Activity
                    </button>
                    <button
                      onClick={() => setActiveTab('manage-certificates')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'manage-certificates' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}`}
                    >
                      Manage Certificates
                    </button>
                  </nav>
                </div>

                {activeTab === 'all-users' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">All Users</h2>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">UserID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Username</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">UserEmail</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Password</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">CourseDetails</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                          {users.map((u) => (
                            <tr key={u.uid}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{u.uid}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{u.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{u.email}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{u.password || 'N/A'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{u.enrolledCourses?.join(', ') || 'N/A'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button onClick={() => { setSelectedUser(u); setActiveTab('activity'); }} className="text-blue-600 hover:text-blue-900 dark:text-blue-500 dark:hover:text-blue-300">View</button>
                                <button onClick={() => { setUserToEdit(u); setIsEditModalOpen(true); }} className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-500 dark:hover:text-yellow-300 ml-4">Edit</button>
                                <button onClick={() => toggleUserActivation(u.uid, !u.isDeactivated)} className="text-red-600 hover:text-red-900 dark:text-red-500 dark:hover:text-red-300 ml-4">{u.isDeactivated ? 'Activate' : 'Deactivate'}</button>
                                <button onClick={() => { setSelectedUser(u); setIsNotifyModalOpen(true); }} className="text-green-600 hover:text-green-900 dark:text-green-500 dark:hover:text-green-300 ml-4">Notify</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'activity' && selectedUser && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Activity for {selectedUser.name}</h2>
                    {userActivity ? (
                      <div className="space-y-4">
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                          <h3 className="font-medium text-gray-900 dark:text-white">Last Login</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{userActivity.lastLogin ? new Date(userActivity.lastLogin).toLocaleString() : 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                          <h3 className="font-medium text-gray-900 dark:text-white">Completed Courses</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{userActivity.completedCourses.join(', ')}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                          <h3 className="font-medium text-gray-900 dark:text-white">Recent Quiz Attempts</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{userActivity.recentQuizAttempts.join(', ')}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">Loading activity...</p>
                    )}
                  </div>
                )}

                {activeTab === 'manage-certificates' && selectedUser && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Manage Certificates for {selectedUser.name}</h2>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">CertificateID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">UserID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                          {userCertificates.map((cert, idx) => (
                            <tr key={`${cert.certificateId}-${cert.userId}-${idx}`}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{cert.certificateId}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{cert.userId}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button onClick={() => handleViewCertificate(cert)} className="text-blue-600 hover:text-blue-900 dark:text-blue-500 dark:hover:text-blue-300">View</button>
                                <button onClick={() => handleResendCertificate(cert)} className="text-green-600 hover:text-green-900 dark:text-green-500 dark:hover:text-green-300 ml-4">Resend</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </PageTransition>

      <EditUserModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} user={userToEdit} onSave={handleSaveUser} />
      <NotifyUserModal isOpen={isNotifyModalOpen} onClose={() => setIsNotifyModalOpen(false)} user={selectedUser} onSend={handleSendNotification} />

      {notification && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {notification}
        </div>
      )}
    </AuthGuard>
  );
}

