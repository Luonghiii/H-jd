import React from 'react';
import { BookOpen, LogOut, Settings, Flame } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

const TargetLanguageSelector: React.FC = () => {
  const { targetLanguage, setTargetLanguage } = useSettings();

  const baseClasses = "px-3 py-1 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500";
  const activeClasses = "bg-indigo-600 text-white";
  const inactiveClasses = "bg-slate-700 text-gray-300 hover:bg-slate-600";

  return (
    <div className="flex items-center p-1 bg-slate-800 rounded-lg">
      <button 
        onClick={() => setTargetLanguage('vietnamese')}
        className={`${baseClasses} ${targetLanguage === 'vietnamese' ? activeClasses : inactiveClasses}`}
      >
        VIE
      </button>
      <button 
        onClick={() => setTargetLanguage('english')}
        className={`${baseClasses} ${targetLanguage === 'english' ? activeClasses : inactiveClasses}`}
      >
        ENG
      </button>
    </div>
  );
};

const StreakDisplay: React.FC = () => {
  const { stats } = useSettings();
  const streak = stats.currentStreak || 0;

  const getFlameColor = () => {
    if (streak === 0) return 'text-slate-500';
    if (streak < 5) return 'text-orange-400';
    if (streak < 10) return 'text-orange-500';
    if (streak < 20) return 'text-red-500';
    if (streak < 30) return 'text-red-600';
    if (streak < 50) return 'text-purple-500';
    if (streak < 100) return 'text-blue-500';
    return 'text-cyan-400 animate-pulse';
  };
  
  if (streak === 0) return null;

  return (
    <div className="flex items-center gap-1 bg-slate-800/60 px-3 py-1.5 rounded-full" title={`Chuỗi ${streak} ngày học!`}>
        <span className="font-bold text-white text-sm">{streak}</span>
        <Flame className={`w-4 h-4 ${getFlameColor()}`} />
    </div>
  )
}

const Header: React.FC<{ onLogout: () => void; onOpenSettings: () => void; }> = ({ onLogout, onOpenSettings }) => {
  return (
    <header className="py-4 px-4 sm:px-8">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center min-w-0">
          <BookOpen className="w-8 h-8 text-indigo-400 mr-3 flex-shrink-0" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-300 text-transparent bg-clip-text truncate">
            LBWL
          </h1>
        </div>
        <div className="flex items-center flex-shrink-0 space-x-1 sm:space-x-2">
          <StreakDisplay />
          <TargetLanguageSelector />
          <button
            onClick={onOpenSettings}
            className="p-2 text-gray-300 hover:bg-slate-700/50 hover:text-white rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500"
            aria-label="Cài đặt"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={onLogout}
            className="p-2 text-gray-300 hover:bg-slate-700/50 hover:text-white rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500"
            aria-label="Đăng xuất"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;