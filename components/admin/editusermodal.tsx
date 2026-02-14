import { useEffect, useState } from 'react';
import { User } from '@/lib/usermanagement';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (uid: string, data: Partial<User> & { newUid?: string }) => void;
}

export default function EditUserModal({ isOpen, onClose, user, onSave }: EditUserModalProps) {
  const [uidInput, setUidInput] = useState(user?.uid || '');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [coursesInput, setCoursesInput] = useState<string>((user?.enrolledCourses || []).join(', '));

  useEffect(() => {
    if (user) {
      setUidInput(user.uid || '');
      setName(user.name || '');
      setEmail(user.email || '');
      setCoursesInput((user.enrolledCourses || []).join(', '));
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSave = () => {
    const enrolledCourses = coursesInput
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    const newUid = uidInput && uidInput !== user.uid ? uidInput : undefined;

    onSave(user.uid, { name, email, enrolledCourses, newUid });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Edit User</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">UserID</label>
            <input
              type="text"
              value={uidInput}
              onChange={(e) => setUidInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CourseDetails (comma-separated)</label>
            <input
              type="text"
              value={coursesInput}
              onChange={(e) => setCoursesInput(e.target.value)}
              placeholder="course1, course2"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}