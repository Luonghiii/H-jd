import React, { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../hooks/useAuth';
import { getLeaderboardData, LeaderboardEntry } from '../services/firestoreService';
import { Trophy, Flame, BookOpen, UserCheck, Loader2, User as UserIcon } from 'lucide-react';

type LeaderboardTab = 'streak' | 'words';

const PodiumIcon: React.FC<{ rank: number }> = ({ rank }) => {
    const colors = {
        1: 'text-yellow-400',
        2: 'text-slate-300',
        3: 'text-yellow-600',
    };
    const rankColor = colors[rank as keyof typeof colors] || 'text-gray-500';
    return <Trophy className={`w-6 h-6 ${rankColor}`} />;
};

const DisplayNamePrompt: React.FC = () => {
    return (
        <div className="text-center p-6 bg-slate-800/50 border border-slate-700 rounded-2xl max-w-md mx-auto animate-fade-in">
            <UserCheck className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Tham gia Bảng xếp hạng</h2>
            <p className="text-gray-400 mb-6">
                Vui lòng thiết lập tên hiển thị trong <strong className="text-white">Hồ sơ cá nhân</strong> của bạn (nhấp vào avatar ở góc trên bên phải) để xuất hiện trên bảng xếp hạng.
            </p>
        </div>
    );
};


const Leaderboard: React.FC = () => {
    const { leaderboardName, isSettingsLoading } = useSettings();
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<LeaderboardTab>('streak');
    const [streakData, setStreakData] = useState<LeaderboardEntry[]>([]);
    const [wordData, setWordData] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (isSettingsLoading) return;
            setIsLoading(true);
            try {
                // Only fetch data if the user has opted-in to the leaderboard
                if (leaderboardName) {
                    const [streaks, words] = await Promise.all([
                        getLeaderboardData('longestStreak'),
                        getLeaderboardData('totalWords'),
                    ]);
                    setStreakData(streaks);
                    setWordData(words);
                }
            } catch (error) {
                console.error("Failed to fetch leaderboard data", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [leaderboardName, isSettingsLoading]);

    if (isSettingsLoading) {
        return <div className="text-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }
    
    if (!leaderboardName) {
        return <DisplayNamePrompt />;
    }

    const data = activeTab === 'streak' ? streakData : wordData;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center">
                <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                <h2 className="text-3xl font-bold text-white">Bảng xếp hạng</h2>
                <p className="text-gray-400 mt-1">Xem ai đang dẫn đầu cuộc đua học tập!</p>
            </div>
            
            <div className="flex justify-center p-1 bg-slate-800/60 rounded-full">
                <button onClick={() => setActiveTab('streak')} className={`px-4 py-1.5 text-sm rounded-full font-medium flex items-center gap-2 ${activeTab === 'streak' ? 'bg-indigo-600 text-white' : 'text-gray-300'}`}>
                    <Flame className="w-4 h-4" /> Chuỗi dài nhất
                </button>
                 <button onClick={() => setActiveTab('words')} className={`px-4 py-1.5 text-sm rounded-full font-medium flex items-center gap-2 ${activeTab === 'words' ? 'bg-indigo-600 text-white' : 'text-gray-300'}`}>
                    <BookOpen className="w-4 h-4" /> Nhiều từ nhất
                </button>
            </div>

            {isLoading ? (
                <div className="text-center p-10"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : (
                <div className="space-y-3">
                    {data.map((entry, index) => {
                        const rank = index + 1;
                        const isCurrentUser = entry.uid === currentUser?.uid;
                        return (
                            <div key={entry.uid} className={`flex items-center p-3 sm:p-4 rounded-2xl border transition-all duration-300 ${isCurrentUser ? 'bg-indigo-600/30 border-indigo-500 scale-105 shadow-lg shadow-indigo-500/20' : 'bg-slate-800/50 border-slate-700'}`}>
                                <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                                    <span className="font-bold text-lg w-6 text-center">{rank}</span>
                                    <PodiumIcon rank={rank} />
                                </div>
                                <div className="flex items-center gap-3 flex-grow min-w-0 mx-3 sm:mx-4">
                                    {entry.photoURL ? (
                                        <img src={entry.photoURL} alt={entry.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                            <UserIcon className="w-6 h-6 text-gray-400" />
                                        </div>
                                    )}
                                    <p className={`font-semibold truncate ${isCurrentUser ? 'text-white' : 'text-gray-200'}`}>{entry.name}</p>
                                </div>
                                <div className="flex items-center gap-2 font-bold text-lg text-cyan-300 flex-shrink-0">
                                    <span>{entry.value}</span>
                                    {activeTab === 'streak' ? <Flame className="w-5 h-5"/> : <BookOpen className="w-5 h-5"/>}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default Leaderboard;