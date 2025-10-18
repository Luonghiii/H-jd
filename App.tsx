import React, { useState } from 'react';
import { VocabularyProvider } from './hooks/useVocabulary';
import { SettingsProvider, useSettings } from './hooks/useSettings';
import { InspectorProvider, useInspector } from './hooks/useInspector';
import WordInspectorModal from './components/WordInspectorModal';
import Header from './components/Header';
import AddWord from './components/AddWord';
import WordList from './components/WordList';
import Practice from './components/Practice';
import StoryGenerator from './components/StoryGenerator';
import SentenceGenerator from './components/SentenceGenerator';
import Flashcards from './components/Flashcards';
import LuckyWheel from './components/LuckyWheel';
import Login from './components/Login';
import Home from './components/Home';
import BackgroundCustomizer from './components/BackgroundCustomizer';
import Footer from './components/Footer';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import TermsOfServiceModal from './components/TermsOfServiceModal';
import { View } from './types';
import { Home as HomeIcon, BookOpen, Feather, PenSquare, Sparkles, MessageSquarePlus, Layers, Dices } from 'lucide-react';
import ApiKeySetup from './components/ApiKeySetup';
import SettingsModal from './components/SettingsModal';

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
      case View.LuckyWheel:
        return <LuckyWheel />;
      case View.Story:
        return <StoryGenerator />;
      case View.Sentence:
        return <SentenceGenerator />;
      default:
        return <Home setCurrentView={setCurrentView} />;
    }
  };

  const navItems = [
    { view: View.Home, label: 'Trang chủ', icon: HomeIcon },
    { view: View.Practice, label: 'Luyện tập', icon: PenSquare },
    { view: View.Flashcards, label: 'Thẻ ghi nhớ', icon: Layers },
    { view: View.LuckyWheel, label: 'Vòng quay', icon: Dices },
    { view: View.Sentence, label: 'Câu AI', icon: MessageSquarePlus },
    { view: View.Story, label: 'Truyện AI', icon: Sparkles },
    { view: View.Add, label: 'Thêm từ', icon: Feather },
    { view: View.List, label: 'Danh sách từ', icon: BookOpen },
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
  const { apiKey, setApiKey, clearApiKey } = useSettings();
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

  if (!apiKey) {
    return <ApiKeySetup onKeySaved={setApiKey} />;
  }

  return (
    <VocabularyProvider>
      <InspectorProvider>
        <AppLayout onLogout={handleLogout} onOpenSettings={() => setIsSettingsOpen(true)} />
        <SettingsModal 
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onKeySave={(key) => { setApiKey(key); setIsSettingsOpen(false); }}
            onKeyClear={() => { clearApiKey(); setIsSettingsOpen(false); }}
            currentApiKey={apiKey}
        />
      </InspectorProvider>
    </VocabularyProvider>
  );
}

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
};

export default App;