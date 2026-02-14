'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import { getUserData, UserData } from '@/lib/auth';
import { getLeaderboardData, LeaderboardEntry } from '@/lib/analytics';
import Sidebar from '@/components/Sidebar';
import PageTransition from '@/components/PageTransition';
import AuthGuard from '@/components/AuthGuard';

export default function LeaderboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

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

        // Load leaderboard data
        try {
          const leaderboardData = await getLeaderboardData(50);
          setLeaderboard(leaderboardData);
        } catch (error) {
          console.error('Error loading leaderboard:', error);
        } finally {
          setLoadingLeaderboard(false);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !userData) {
    return null;
  }

  const getUserRank = () => {
    if (!user) return -1;
    return leaderboard.findIndex(entry => entry.userId === user.uid) + 1;
  };

  const userRank = getUserRank();
  const userEntry = leaderboard.find(entry => entry.userId === user.uid);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'from-yellow-400 to-yellow-600';
    if (rank === 2) return 'from-gray-300 to-gray-500';
    if (rank === 3) return 'from-orange-300 to-orange-500';
    return 'from-blue-500 to-blue-600';
  };

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
                  className="mb-8"
                >
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    Leaderboard
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Top quiz scorers and achievers
                  </p>
                </motion.div>

                {/* User's Current Rank Card */}
                {userEntry && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 shadow-lg mb-8 text-white"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90 mb-1">Your Rank</p>
                        <p className="text-4xl font-bold">{userRank > 0 ? `#${userRank}` : 'Unranked'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm opacity-90 mb-1">Total Points</p>
                        <p className="text-3xl font-bold">{userEntry.totalPoints}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm opacity-90 mb-1">Average Score</p>
                        <p className="text-3xl font-bold">{userEntry.averageScore}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm opacity-90 mb-1">Quizzes Taken</p>
                        <p className="text-3xl font-bold">{userEntry.totalQuizzes}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {loadingLeaderboard ? (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-lg text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading leaderboard...</p>
                  </div>
                ) : leaderboard.length > 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Rank
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              User
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Total Points
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Avg Score
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Best Score
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Quizzes
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {leaderboard.map((entry, index) => {
                            const rank = index + 1;
                            const isCurrentUser = entry.userId === user?.uid;
                            
                            return (
                              <motion.tr
                                key={entry.userId}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`${
                                  isCurrentUser
                                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                } transition-colors`}
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                      {getRankIcon(rank)}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                      {entry.userName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {entry.userName}
                                        {isCurrentUser && (
                                          <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded">
                                            You
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {entry.userEmail}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                                    {entry.totalPoints}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {entry.averageScore}%
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                                    {entry.bestScore}%
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-lg text-gray-900 dark:text-white">
                                    {entry.totalQuizzes}
                                  </span>
                                </td>
                              </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-lg text-center">
                    <div className="text-6xl mb-4">🏆</div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      No Leaderboard Data Yet
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Start taking quizzes to appear on the leaderboard!
                    </p>
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




