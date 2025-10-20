import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Settings, Flame, User as UserIcon, Edit, LogOut } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../hooks/useAuth';
import { useHistory } from '../hooks/useHistory';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { useI18n } from '../hooks/useI18n';
import { achievementsList } from '../data/achievements';

const UiLanguageSelector: React.FC = () => {
  const { uiLanguage, setUiLanguage } = useSettings();

  const baseClasses = "relative z-10 px-4 py-1 text-sm font-semibold rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 focus:ring-indigo-500";
  const activeClasses = "bg-white/50 text-slate-800";
  const inactiveClasses = "text-gray-600 hover:text-slate-900";

  return (
    <div className="flex items-center p-1 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
      <button 
        onClick={() => setUiLanguage('vietnamese')}
        className={`${baseClasses} ${uiLanguage === 'vietnamese' ? activeClasses : inactiveClasses}`}
      >
        VIE
      </button>
      <button 
        onClick={() => setUiLanguage('english')}
        className={`${baseClasses} ${uiLanguage === 'english' ? activeClasses : inactiveClasses}`}
      >
        ENG
      </button>
    </div>
  );
};

const StreakDisplay: React.FC = () => {
  const { stats } = useSettings();
  const { t } = useI18n();
  const streak = stats.currentStreak || 0;

  const getFlameColor = () => {
    if (streak === 0) return 'text-slate-400';
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
    <div className="flex items-center gap-1 bg-white/30 px-3 py-1.5 rounded-full" title={t('header.streak_title', { streak })}>
        <span className="font-bold text-slate-800 text-sm">{streak}</span>
        <Flame className={`w-4 h-4 ${getFlameColor()}`} />
    </div>
  )
}

const ProfileDropdown: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onEditProfile: () => void;
}> = ({ isOpen, onClose, onLogout, onEditProfile }) => {
  const { profile } = useSettings();
  const { t } = useI18n();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div ref={dropdownRef} className="absolute top-full right-0 mt-2 w-64 bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl p-4 z-50 animate-fade-in-up">
        <div className="flex flex-col items-center pb-3 border-b border-slate-200">
            <p className="font-bold text-slate-800 truncate">{profile.displayName || 'User'}</p>
            {profile.username && <p className="text-sm text-gray-500">@{profile.username}</p>}
        </div>
        <div className="py-2 text-slate-700">
            <button onClick={onEditProfile} className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-slate-200">
                <Edit className="w-4 h-4 text-gray-500" />
                <span>{t('header.edit_profile')}</span>
            </button>
             <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md text-red-500 hover:bg-red-500/10">
                <LogOut className="w-4 h-4" />
                <span>{t('header.logout')}</span>
            </button>
        </div>
    </div>
  );
};


const Header: React.FC<{ onOpenSettings: () => void; onOpenProfile: () => void; }> = ({ onOpenSettings, onOpenProfile }) => {
  const { addHistoryEntry } = useHistory();
  const { profile } = useSettings();
  const { t } = useI18n();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const handleLogout = async () => {
    await addHistoryEntry('LOGOUT', 'Đã đăng xuất.');
    await signOut(auth);
  };
  
  const selectedAchData = profile.selectedAchievement
    ? achievementsList.find(a => a.id === profile.selectedAchievement?.id)
    : null;

  return (
    <header className="py-4 px-4 sm:px-8">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center min-w-0">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mr-3 flex-shrink-0">
              <path d="M4 19V5C4 4.44772 4.44772 4 5 4H12" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 4H19C19.5523 4 20 4.44772 20 5V19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19" stroke="currentColor" className="text-slate-400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 4V14.5C12 14.7761 12.2239 15 12.5 15H17" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight animated-gradient-text truncate">
            LBWL
          </h1>
        </div>
        <div className="flex items-center flex-shrink-0 space-x-1 sm:space-x-2">
          <StreakDisplay />
          <UiLanguageSelector />
          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 focus:ring-indigo-500 bg-slate-100/60 backdrop-blur-sm border border-white/30 text-slate-700 neu-button-light"
            aria-label={t('header.settings')}
          >
            <Settings className="w-5 h-5" />
          </button>
          
          <div className="relative">
            <button
                onClick={() => setIsProfileOpen(prev => !prev)}
                className="w-10 h-10 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 focus:ring-indigo-500 relative transition-transform duration-150 ease-out active:scale-90"
            >
                {profile.photoURL ? (
                    <img src={profile.photoURL} alt="User Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                    <div className="w-full h-full rounded-full bg-slate-300 flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-gray-500" />
                    </div>
                )}
            </button>
            {selectedAchData && profile.selectedAchievement && (
                <div 
                    className="absolute -bottom-1 -right-1 p-1 bg-slate-100 rounded-full shadow-md pointer-events-none"
                    title={`${selectedAchData.name} (Cấp ${profile.selectedAchievement.level})`}
                >
                    <selectedAchData.icon className="w-4 h-4 text-amber-500" />
                </div>
            )}
            <ProfileDropdown 
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                onLogout={handleLogout}
                onEditProfile={() => {
                    setIsProfileOpen(false);
                    onOpenProfile();
                }}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;