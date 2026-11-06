import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Star, ArrowUp, Loader2 } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

interface LeaderboardUser {
  _id: string;
  username: string;
  karmaPoints: number;
}

const LeaderboardPage: React.FC = () => {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await api.get('/auth/leaderboard');
        setUsers(response.data.leaderboard || []);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        toast.error('Failed to load leaderboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-6 h-6 text-yellow-500 dark:text-yellow-300" />;
      case 1:
        return <Medal className="w-6 h-6 text-gray-400 dark:text-slate-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-amber-600 dark:text-amber-300" />;
      default:
        return <span className="text-sm font-bold text-gray-500 dark:text-gray-400 w-6 text-center">{index + 1}</span>;
    }
  };

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-white dark:bg-slate-800 border-brand-200 dark:border-brand-900 shadow-sm';
      case 1:
        return 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-sm';
      case 2:
        return 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-sm';
      default:
        return 'bg-white dark:bg-slate-800/80 border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors';
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Header Section */}
      <div className="text-center mb-12 relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-block p-4 bg-brand-700/10 dark:bg-red-900/20 rounded-full mb-4"
        >
          <Trophy className="w-12 h-12 text-brand-700 dark:text-red-400" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-3"
        >
          Community leaderboard
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto"
        >
          Recognizing people who help return lost items. Karma points reflect contributions recorded in this app.
        </motion.p>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-brand-700 dark:text-red-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800/50 rounded-3xl border border-gray-100 dark:border-slate-700">
            <Star className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No contributions recorded yet.</p>
          </div>
        ) : (
          users.map((user, index) => (
            <motion.div
              key={user._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl border ${getRankStyle(index)} backdrop-blur-sm relative overflow-hidden group`}
            >
              <div className="flex items-center space-x-4 sm:space-x-6 z-10">
                <div className="flex-shrink-0 w-10 flex justify-center">
                  {getRankIcon(index)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex flex-wrap items-center">
                    {user.username}
                    {index === 0 && <span className="ml-2 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 text-[10px] uppercase font-bold rounded-full">Champion</span>}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Community member
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-white/50 dark:bg-slate-900/50 px-4 py-2 rounded-xl border border-gray-200/50 dark:border-slate-600/50 z-10">
                <ArrowUp className="w-4 h-4 text-green-500 dark:text-green-300" />
                <span className="font-extrabold text-xl text-gray-800 dark:text-gray-200">
                  {user.karmaPoints}
                </span>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 hidden sm:inline-block ml-1">
                  Karma points
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
