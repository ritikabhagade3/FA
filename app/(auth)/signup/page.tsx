'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { signInWithGoogle, getUserData } from '@/lib/auth';
import { auth } from '@/lib/firebaseConfig';

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const timer = setTimeout(async () => {
      try {
        const user = auth?.currentUser || null;
        if (user && user.emailVerified) {
          const userData = await getUserData(user.uid);
          router.push(userData?.role === 'admin' ? '/dashboard/admin' : '/dashboard/user');
        }
      } catch (e) {
        // Non-fatal: stay on signup
      } finally {
        setIsCheckingAuth(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [router, isMounted]);

  if (!isMounted || isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const redirectUser = async (uid: string) => {
    try {
      const userData = await getUserData(uid);
      console.log('📊 User data from database:', userData);
      
      if (userData) {
        const dashboardPath = userData.role === 'admin' ? '/dashboard/admin' : '/dashboard/user';
        console.log('🔀 Redirecting to:', dashboardPath);
        router.push(dashboardPath);
      } else {
        router.push('/dashboard/user');
      }
    } catch (error) {
      console.error('❌ Error redirecting user:', error);
      router.push('/dashboard/user');
    }
  };

  const handleGoogleSignIn = async () => {
    console.log(''); // Empty line for readability
    console.log('='.repeat(60));
    console.log('🚀 STARTING GOOGLE SIGN-IN PROCESS');
    console.log('='.repeat(60));
    console.log('📝 Selected role in component state:', role);
    console.log('📝 Role type:', typeof role);
    console.log('📝 Role === "admin":', role === 'admin');
    console.log('📝 Role === "user":', role === 'user');
    
    setLoading(true);
    setError('');
    
    try {
      console.log('🔵 About to call signInWithGoogle(' + role + ')');
      
      // ✅ CRITICAL: Pass the role parameter to signInWithGoogle
      const user = await signInWithGoogle(role);
      
      console.log('✅ Google sign-in completed');
      
      if (user) {
        console.log('👤 User object received:', user.email);
        await redirectUser(user.uid);
      }
    } catch (error: any) {
      console.error('❌ Google sign in error:', error);
      setError('Google sign-in failed. Please try again.');
      setLoading(false);
    }
    
    console.log('='.repeat(60));
    console.log('');
  };

  const handleRoleChange = (newRole: 'user' | 'admin') => {
    console.log('🔄 Role changed from', role, 'to', newRole);
    setRole(newRole);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-xl"
      >
        <div>
          <h2 className="mt-6 text-center text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Join FlashLearn and start learning today
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

        

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Sign up as
            </label>
            <div className="flex gap-4">
              <label className="flex-1 cursor-pointer">
                <input 
                  type="radio" 
                  name="role" 
                  value="user" 
                  checked={role === 'user'} 
                  onChange={() => handleRoleChange('user')}
                  className="sr-only"
                />
                <div className={`
                  p-4 rounded-lg border-2 transition-all
                  ${role === 'user' 
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }
                `}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">User</span>
                    {role === 'user' && (
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Access learning materials and courses
                  </p>
                </div>
              </label>

              <label className="flex-1 cursor-pointer">
                <input 
                  type="radio" 
                  name="role" 
                  value="admin" 
                  checked={role === 'admin'} 
                  onChange={() => handleRoleChange('admin')}
                  className="sr-only"
                />
                <div className={`
                  p-4 rounded-lg border-2 transition-all
                  ${role === 'admin' 
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }
                `}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">Admin</span>
                    {role === 'admin' && (
                      <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Manage content and users
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Google Sign In Button */}
          <motion.button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full inline-flex justify-center items-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700 dark:border-gray-300 mr-2"></div>
                Signing up...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google as {role === 'admin' ? 'Admin' : 'User'}
              </>
            )}
          </motion.button>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
            By continuing, you agree to FlashLearn's Terms of Service and Privacy Policy
          </p>
        </div>
      </motion.div>
    </div>
  );
}