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
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 1:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-gray-500 dark:text-gray-400 w-6 text-center">{index + 1}</span>;
    }
  };

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-gradient-to-r from-yellow-50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-800/10 border-yellow-200 dark:border-yellow-700/30 shadow-sm';
      case 1:
        return 'bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/40 dark:to-gray-800/20 border-gray-200 dark:border-gray-700/50 shadow-sm';
      case 2:
        return 'bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 border-amber-200 dark:border-amber-700/30 shadow-sm';
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
          className="inline-block p-4 bg-[#800000]/10 dark:bg-red-900/20 rounded-full mb-4"
        >
          <Trophy className="w-12 h-12 text-[#800000] dark:text-red-400" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-3"
        >
          Top Citizens Leaderboard
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto"
        >
          Honoring the most helpful and honest individuals in our community. Return lost items to earn Karma Points and climb the ranks!
        </motion.p>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-[#800000] dark:text-red-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800/50 rounded-3xl border border-gray-100 dark:border-slate-700">
            <Star className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No top citizens yet. Be the first to earn Karma Points!</p>
          </div>
        ) : (
          users.map((user, index) => (
            <motion.div
              key={user._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border ${getRankStyle(index)} backdrop-blur-sm relative overflow-hidden group`}
            >
              <div className="flex items-center space-x-4 sm:space-x-6 z-10">
                <div className="flex-shrink-0 w-10 flex justify-center">
                  {getRankIcon(index)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
                    {user.username}
                    {index === 0 && <span className="ml-2 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 text-[10px] uppercase font-bold rounded-full">Champion</span>}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Community Member
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 bg-white/50 dark:bg-slate-900/50 px-4 py-2 rounded-xl border border-gray-200/50 dark:border-slate-600/50 z-10">
                <ArrowUp className="w-4 h-4 text-green-500" />
                <span className="font-extrabold text-xl text-gray-800 dark:text-gray-200">
                  {user.karmaPoints}
                </span>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 hidden sm:inline-block ml-1">
                  KP
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
