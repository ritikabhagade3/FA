'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

interface SidebarProps {
  userRole: 'user' | 'admin';
  userName: string;
  userEmail: string;
}

export default function Sidebar({ userRole, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const userNavItems: NavItem[] = [
    { name: 'Home', href: '/dashboard/user', icon: '🏠' },
    { name: 'My Courses', href: '/dashboard/user/courses', icon: '📚' },
    { name: 'AI Quiz', href: '/dashboard/user/quiz', icon: '🧠' },
    { name: 'Leaderboard', href: '/dashboard/user/leaderboard', icon: '🏆' },
    { name: 'Certificates', href: '/dashboard/user/certificates', icon: '🎓' },
    { name: 'Profile', href: '/dashboard/user/profile', icon: '👤' },
  ];

  const adminNavItems: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard/admin', icon: '📊' },
    { name: 'Manage Courses', href: '/dashboard/admin/courses', icon: '📚' },
    { name: 'Manage Users', href: '/dashboard/admin/users', icon: '👥' },
    { name: 'Analytics', href: '/dashboard/admin/analytics', icon: '📈' },
    { name: 'Settings', href: '/dashboard/admin/settings', icon: '⚙️' },
  ];

  const navItems = userRole === 'admin' ? adminNavItems : userNavItems;

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const isActive = (href: string) => {
    if (href === '/dashboard/user' || href === '/dashboard/admin') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <motion.aside
        initial={false}
        animate={{ x: 0 }}
        transition={{ duration: 0.3 }}
        className="hidden md:flex flex-col h-screen w-64 bg-white dark:bg-gray-800 shadow-xl z-40"
      >
            <div className="flex flex-col h-full">
              {/* Logo/Brand */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  FlashLearn
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {userRole === 'admin' ? 'Admin Panel' : 'Student Portal'}
                </p>
              </div>

              {/* User Info */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {userName && userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {userName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {userEmail}
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                      <motion.div
                        whileHover={{ x: 5 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                          active
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="text-xl">{item.icon}</span>
                        <span className="font-medium">{item.name}</span>
                      </motion.div>
                    </Link>
                  );
                })}
              </nav>

              {/* Logout Button */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <motion.button
                  onClick={handleLogout}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
                >
                  <span>🚪</span>
                  <span>Logout</span>
                </motion.button>
              </div>
            </div>
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.3 }}
              className="md:hidden fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 shadow-xl z-40"
            >
              <div className="flex flex-col h-full">
                {/* Logo/Brand */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    FlashLearn
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {userRole === 'admin' ? 'Admin Panel' : 'Student Portal'}
                  </p>
                </div>

                {/* User Info */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {userName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {userEmail}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                  {navItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                        <motion.div
                          whileHover={{ x: 5 }}
                          whileTap={{ scale: 0.95 }}
                          className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                            active
                              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <span className="text-xl">{item.icon}</span>
                          <span className="font-medium">{item.name}</span>
                        </motion.div>
                      </Link>
                    );
                  })}
                </nav>

                {/* Logout Button */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <motion.button
                    onClick={handleLogout}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
                  >
                    <span>🚪</span>
                    <span>Logout</span>
                  </motion.button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

