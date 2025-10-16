import React from 'react';
import { BotMessageSquare, LogOut, Settings } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { TargetLanguage } from '../types';

const LanguageSelector: React.FC = () => {
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


const Header: React.FC<{ onLogout: () => void; onSettingsClick: () => void }> = ({ onLogout, onSettingsClick }) => {
  return (
    <header className="py-4 px-4 sm:px-8">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <BotMessageSquare className="w-8 h-8 text-indigo-400 mr-3" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-300 text-transparent bg-clip-text">
            AI Từ vựng tiếng Đức
          </h1>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <LanguageSelector />
          <button
            onClick={onSettingsClick}
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