import React, { useState, useEffect, useRef, createContext, useContext, useCallback, Suspense } from 'react';
import { VocabularyProvider, useVocabulary } from './hooks/useVocabulary';
import { SettingsProvider, useSettings } from './hooks/useSettings';
import { InspectorProvider, useInspector, QuickTranslateProvider } from './hooks/useInspector';
import { HistoryProvider, useHistory } from './hooks/useHistory';
import { AuthProvider, useAuth } from './hooks/useAuth';
import WordInspectorModal, { QuickTranslateModal } from './components/WordInspectorModal';
import Header from './components/Header';
import Login from './components/Login';
import AppBackground from './components/AppBackground';
import Home from './components/Home';
import BackgroundCustomizer from './components/BackgroundCustomizer';
import Footer from './components/Footer';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import TermsOfServiceModal from './components/TermsOfServiceModal';
import { View } from './types';
import SettingsModal from './components/SettingsModal';
import ProfileModal from './components/ProfileModal';
import ApiKeySetup from './components/ApiKeySetup';
import NotificationManager from './components/NotificationManager';
import eventBus from './utils/eventBus';
import { Loader2 } from 'lucide-react';
import BottomNavBar from './components/BottomNavBar';
import { I18nProvider } from './hooks/useI18n';
import { AiAssistantProvider } from './hooks/useAiAssistant';
import AiAssistant from './components/AiAssistant';
import { ActivityTrackerProvider } from './hooks/useActivityTracker';
import { AchievementsProvider } from './hooks/useAchievements';

// Lazy-loaded components
const Learn = React.lazy(() => import('./components/Learn'));
const Vocabulary = React.lazy(() => import('./components/Vocabulary'));
const Games = React.lazy(() => import('./components/Games'));
const AiTools = React.lazy(() => import('./components/AiTools'));
const History = React.lazy(() => import('./components/History'));
const Leaderboard = React.lazy(() => import('./components/Leaderboard'));
const Achievements = React.lazy(() => import('./components/Achievements'));
const Discover = React.lazy(() => import('./components/Discover'));
const More = React.lazy(() => import('./components/More'));


const AppLayout: React.FC<{ onOpenSettings: () => void; }> = ({ onOpenSettings }) => {
  const [currentView, _setCurrentView] = useState<View>(View.Home);
  const [displayedView, setDisplayedView] = useState(currentView);
  const [animationClass, setAnimationClass] = useState('');
  const isInitialLoad = useRef(true);

  const setCurrentView = useCallback((newView: View) => {
    if (newView !== currentView) {
      setAnimationClass('animate-fade-out');
      setTimeout(() => {
        _setCurrentView(newView);
        setDisplayedView(newView);
        setAnimationClass('animate-fade-in');
      }, 250); // Match fade-out duration
    }
  }, [currentView]);
  
  useEffect(() => {
    if (isInitialLoad.current) {
      setAnimationClass('animate-fade-in');
      isInitialLoad.current = false;
    }
  }, []);

  const { inspectingWord, closeInspector } = useInspector();
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isBgCustomizerOpen, setIsBgCustomizerOpen] = useState(false);

  const renderView = () => {
    switch (displayedView) {
      case View.Home:
        return <Home setCurrentView={setCurrentView} />;
      case View.Learn:
        return <Learn />;
      case View.Games:
        return <Games />;
      case View.AiTools:
        return <AiTools />;
      case View.Vocabulary:
        return <Vocabulary />;
      case View.History:
        return <History />;
      case View.Leaderboard:
        return <Leaderboard />;
      case View.Achievements:
        return <Achievements />;
      case View.Discover:
        return <Discover />;
      case View.More:
        return <More setCurrentView={setCurrentView} onOpenBgCustomizer={() => setIsBgCustomizerOpen(true)} />;
      default:
        return <Home setCurrentView={setCurrentView} />;
    }
  };

  return (
    <>
      <AppBackground />
      <NotificationManager />
      <div className="min-h-screen text-slate-800 font-sans flex flex-col">
        <Header onOpenSettings={onOpenSettings} onOpenProfile={() => setIsProfileModalOpen(true)} />
        <main className="container mx-auto p-4 md:p-6 lg:p-8 flex-grow pb-28">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white/40 backdrop-blur-xl rounded-3xl neu-light border border-white/30">
              <div className={`p-4 sm:p-6 lg:p-8 ${animationClass}`}>
                <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>}>
                    {renderView()}
                </Suspense>
              </div>
            </div>
          </div>
        </main>
        <Footer onOpenPrivacy={() => setIsPrivacyModalOpen(true)} onOpenTerms={() => setIsTermsModalOpen(true)} />
        <BottomNavBar currentView={currentView} setCurrentView={setCurrentView} />
      </div>
      {inspectingWord && (
        <WordInspectorModal
          word={inspectingWord}
          isOpen={!!inspectingWord}
          onClose={closeInspector}
        />
      )}
      <QuickTranslateModal />
      <PrivacyPolicyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />
      <TermsOfServiceModal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} />
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      <BackgroundCustomizer isOpen={isBgCustomizerOpen} onClose={() => setIsBgCustomizerOpen(false)} />
      <AiAssistant setCurrentView={setCurrentView} />
    </>
  );
};

const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 5) return "vừa xong";
    if (seconds < 60) return `${seconds} giây trước`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày trước`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} tháng trước`;
    const years = Math.floor(months / 12);
    return `${years} năm trước`;
};

const LoginAndStreakHandler: React.FC = () => {
    const { addHistoryEntry, history, hasMore } = useHistory();
    const loggedInRef = useRef(false);
    const notificationShownRef = useRef(false);

    // Effect to add the login entry once per session.
    useEffect(() => {
        if (!loggedInRef.current) {
            addHistoryEntry('LOGIN', 'Đăng nhập thành công.');
            loggedInRef.current = true;
        }
    }, [addHistoryEntry]);

    // Effect to show the notification about the last login, once per session.
    useEffect(() => {
        if (notificationShownRef.current) return;

        // history is sorted descending. We need at least two logins: the current one and the previous one.
        const loginEntries = history.filter(e => e.type === 'LOGIN');
        if (loginEntries.length > 1) {
            const previousLogin = loginEntries[1]; // The latest is [0], the one before is [1].
            const timeAgo = formatTimeAgo(previousLogin.timestamp);
            
            eventBus.dispatch('notification', {
                type: 'info',
                message: `Lần gần nhất bạn đăng nhập là ${timeAgo}.`
            });
            notificationShownRef.current = true;
        } else if (!hasMore && loginEntries.length <= 1) {
            // If all history is loaded (`!hasMore`) and there's still only one or zero logins,
            // it means there's no previous login to report. Stop checking.
            notificationShownRef.current = true;
        }
    }, [history, hasMore]);
    
    return null;
};


const AppContent: React.FC = () => {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const { userApiKeys, isSettingsLoading } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  if (isAuthLoading || isSettingsLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }
  
  if (userApiKeys.length === 0) {
    return <ApiKeySetup />;
  }

  return (
    <React.Fragment key={currentUser.uid}>
      <HistoryProvider>
        <VocabularyProvider>
          <InspectorProvider>
            <QuickTranslateProvider>
              <ActivityTrackerProvider>
                <AchievementsProvider>
                  <AiAssistantProvider>
                    <LoginAndStreakHandler />
                    <AppLayout onOpenSettings={() => setIsSettingsOpen(true)} />
                    <SettingsModal
                      isOpen={isSettingsOpen}
                      onClose={() => setIsSettingsOpen(false)}
                    />
                  </AiAssistantProvider>
                </AchievementsProvider>
              </ActivityTrackerProvider>
            </QuickTranslateProvider>
          </InspectorProvider>
        </VocabularyProvider>
      </HistoryProvider>
    </React.Fragment>
  );
}

const App: React.FC = () => {
  return (
    <AuthProvider>
        <SettingsProvider>
          <I18nProvider>
            <AppContent />
          </I18nProvider>
        </SettingsProvider>
    </AuthProvider>
  );
};

export default App;