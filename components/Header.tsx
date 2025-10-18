import React from 'react';
import { BookOpen, LogOut, Settings, Sun, Moon } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { TargetLanguage } from '../types';

const ThemeToggleButton: React.FC = () => {
  const { theme, setTheme } = useSettings();
  
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900 focus:ring-indigo-500"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
};

const TargetLanguageSelector: React.FC = () => {
  const { targetLanguage, setTargetLanguage } = useSettings();

  const baseClasses = "px-3 py-1 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 dark:focus:ring-offset-slate-900 focus:ring-indigo-500";
  const activeClasses = "bg-indigo-600 text-white";
  const inactiveClasses = "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-gray-300 hover:bg-slate-400 dark:hover:bg-slate-600";

  return (
    <div className="flex items-center p-1 bg-slate-200 dark:bg-slate-800 rounded-lg">
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

const Header: React.FC<{ onLogout: () => void; onOpenSettings: () => void; }> = ({ onLogout, onOpenSettings }) => {
  return (
    <header className="py-4 px-4 sm:px-8">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center min-w-0">
          <BookOpen className="w-8 h-8 text-indigo-500 dark:text-indigo-400 mr-3 flex-shrink-0" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-500 to-cyan-500 dark:from-indigo-400 dark:to-cyan-300 text-transparent bg-clip-text truncate">
            LBWL
          </h1>
        </div>
        <div className="flex items-center flex-shrink-0 space-x-1 sm:space-x-2">
          <TargetLanguageSelector />
          <ThemeToggleButton />
          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900 focus:ring-indigo-500"
            aria-label="Cài đặt"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={onLogout}
            className="p-2 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900 focus:ring-indigo-500"
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
