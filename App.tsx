import React, { useState, useEffect } from 'react';
import { VocabularyProvider } from './hooks/useVocabulary';
import { SettingsProvider, useSettings } from './hooks/useSettings';
import { InspectorProvider, useInspector } from './hooks/useInspector';
import { HistoryProvider, useHistory } from './hooks/useHistory';
import WordInspectorModal from './components/WordInspectorModal';
import Header from './components/Header';
import AddWord from './components/AddWord';
import WordList from './components/WordList';
import Practice from './components/Practice';
import Flashcards from './components/Flashcards';
import Login from './components/Login';
import Home from './components/Home';
import BackgroundCustomizer from './components/BackgroundCustomizer';
import Footer from './components/Footer';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import TermsOfServiceModal from './components/TermsOfServiceModal';
import History from './components/History';
import { View } from './types';
import { Home as HomeIcon, BookOpen, Feather, PenSquare, Sparkles, Layers, Gamepad2, History as HistoryIcon, BrainCircuit } from 'lucide-react';
import SettingsModal from './components/SettingsModal';
import Games from './components/Games';
import AiTools from './components/AiTools';
import Review from './components/Review';
import ApiKeySetup from './components/ApiKeySetup';
import NotificationManager from './components/NotificationManager';

const AppLayout: React.FC<{ onLogout: () => void; onOpenSettings: () => void; }> = ({ onLogout, onOpenSettings }) => {
  const [currentView, setCurrentView] = useState<View>(View.Home);
  const { inspectingWord, closeInspector } = useInspector();
  const { backgroundSetting } = useSettings();
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  const renderView = () => {
    switch (currentView) {
      case View.Home:
        return <Home setCurrentView={setCurrentView} />;
      case View.Add:
        return <AddWord />;
      case View.List:
        return <WordList />;
      case View.Practice:
        return <Practice />;
      case View.Flashcards:
        return <Flashcards />;
      case View.Review:
        return <Review />;
      case View.Games:
        return <Games />;
      case View.AiTools:
        return <AiTools />;
      case View.History:
        return <History />;
      default:
        return <Home setCurrentView={setCurrentView} />;
    }
  };

  const navItems = [
    { view: View.Home, label: 'Trang chủ', icon: HomeIcon },
    { view: View.Review, label: 'Ôn tập', icon: BrainCircuit },
    { view: View.Practice, label: 'Luyện tập', icon: PenSquare },
    { view: View.Flashcards, label: 'Thẻ ghi nhớ', icon: Layers },
    { view: View.Games, label: 'Trò chơi', icon: Gamepad2 },
    { view: View.AiTools, label: 'Công cụ AI', icon: Sparkles },
    { view: View.Add, label: 'Thêm từ', icon: Feather },
    { view: View.List, label: 'Danh sách từ', icon: BookOpen },
    { view: View.History, label: 'Lịch sử', icon: HistoryIcon },
  ];
  
  let backgroundStyle: React.CSSProperties = {};
  let backgroundClasses = 'bg-gradient-to-br from-gray-900 via-slate-900 to-indigo-900';
  const contentContainerClasses = backgroundSetting?.type === 'image'
    ? 'bg-black/40 backdrop-blur-xl'
    : 'bg-slate-900/60 backdrop-blur-lg';

  if (backgroundSetting) {
    if (backgroundSetting.type === 'image') {
        backgroundStyle = { backgroundImage: `url(${backgroundSetting.value})` };
        backgroundClasses = 'bg-cover bg-center bg-fixed';
    } else if (backgroundSetting.type === 'gradient') {
        backgroundStyle = { backgroundImage: backgroundSetting.value };
        backgroundClasses = '';
    }
  }

  return (
    <>
      <NotificationManager />
      <div 
        className={`min-h-screen text-gray-200 font-sans flex flex-col ${backgroundClasses}`}
        style={backgroundStyle}
      >
        <Header onLogout={onLogout} onOpenSettings={onOpenSettings} />
        <main className="container mx-auto p-4 md:p-6 lg:p-8 flex-grow">
          <div className="max-w-5xl mx-auto">
            <div className={`${contentContainerClasses} rounded-3xl shadow-2xl shadow-slate-900/50 border border-slate-700/60`}>
              <nav className="p-2 border-b border-slate-700/80 flex justify-center">
                <div className="bg-slate-800/60 p-1 rounded-full overflow-x-auto">
                  <ul className="flex items-center justify-start space-x-1">
                    {navItems.map((item) => (
                      <li key={item.view}>
                        <button
                          onClick={() => setCurrentView(item.view)}
                          className={`flex-shrink-0 flex items-center space-x-2 px-3 py-1.5 text-sm sm:px-4 sm:text-base rounded-full font-medium transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 ${
                            currentView === item.view
                              ? 'bg-indigo-600 text-white shadow-lg'
                              : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'
                          }`}
                        >
                          <item.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="hidden sm:inline">{item.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </nav>
              <div className="p-4 sm:p-6 lg:p-8">{renderView()}</div>
            </div>
          </div>
        </main>
        <Footer onOpenPrivacy={() => setIsPrivacyModalOpen(true)} onOpenTerms={() => setIsTermsModalOpen(true)} />
        <BackgroundCustomizer />
      </div>
      {inspectingWord && (
        <WordInspectorModal
          word={inspectingWord}
          isOpen={!!inspectingWord}
          onClose={closeInspector}
        />
      )}
      <PrivacyPolicyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />
      <TermsOfServiceModal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} />
    </>
  );
};

const AppContent: React.FC = () => {
  const { addHistoryEntry } = useHistory();
  const { hasApiKey, addUserApiKey } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('isAuthenticated') === 'true';
    } catch {
      return false;
    }
  });
  
  const handleLoginSuccess = () => {
    try {
      sessionStorage.setItem('isAuthenticated', 'true');
    } catch (error) {
      console.error("Could not save auth state to sessionStorage", error);
    }
    addHistoryEntry('LOGIN', 'Đăng nhập vào hệ thống');
    setIsAuthenticated(true);
  };
  
  const handleLogout = () => {
    try {
      sessionStorage.removeItem('isAuthenticated');
    } catch (error) {
      console.error("Could not remove auth state from sessionStorage", error);
    }
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }
  
  if (!hasApiKey) {
    return <ApiKeySetup onAddKey={addUserApiKey} />;
  }

  return (
    <VocabularyProvider>
      <InspectorProvider>
        <AppLayout onLogout={handleLogout} onOpenSettings={() => setIsSettingsOpen(true)} />
        <SettingsModal 
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
        />
      </InspectorProvider>
    </VocabularyProvider>
  );
}

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <HistoryProvider>
        <AppContent />
      </HistoryProvider>
    </SettingsProvider>
  );
};

export default App;
