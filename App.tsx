import React, { useState } from 'react';
import { VocabularyProvider } from './hooks/useVocabulary';
import { SettingsProvider } from './hooks/useSettings';
import Header from './components/Header';
import AddWord from './components/AddWord';
import WordList from './components/WordList';
import Practice from './components/Practice';
import StoryGenerator from './components/StoryGenerator';
import SentenceGenerator from './components/SentenceGenerator';
import Flashcards from './components/Flashcards';
import LuckyWheel from './components/LuckyWheel';
import Login from './components/Login';
import ApiKeySetup from './components/ApiKeySetup';
import SettingsModal from './components/SettingsModal';
import { View } from './types';
import { BookOpen, Feather, PenSquare, Sparkles, MessageSquarePlus, Layers, Dices } from 'lucide-react';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('isAuthenticated') === 'true';
    } catch {
      return false;
    }
  });

  const [apiKey, setApiKey] = useState<string | null>(() => {
    try {
      return localStorage.getItem('gemini_api_key');
    } catch {
      return null;
    }
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<View>(View.Practice);
  
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

  const handleKeySave = (key: string) => {
    try {
        localStorage.setItem('gemini_api_key', key);
        setApiKey(key);
    } catch (error) {
        console.error("Could not save API key to localStorage", error);
        alert("Error: Could not save API key. Your browser might be in private mode or has storage disabled.");
    }
  };

  const handleKeyClear = () => {
      try {
          localStorage.removeItem('gemini_api_key');
          setApiKey(null);
          setIsSettingsOpen(false);
      } catch (error) {
          console.error("Could not clear API key from localStorage", error);
      }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (!apiKey) {
    return <ApiKeySetup onKeySaved={handleKeySave} />;
  }

  const renderView = () => {
    switch (currentView) {
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
        return <Practice />;
    }
  };

  const navItems = [
    { view: View.Practice, label: 'Luyện tập', icon: PenSquare },
    { view: View.Flashcards, label: 'Thẻ ghi nhớ', icon: Layers },
    { view: View.LuckyWheel, label: 'Vòng quay', icon: Dices },
    { view: View.Sentence, label: 'Câu AI', icon: MessageSquarePlus },
    { view: View.Story, label: 'Truyện AI', icon: Sparkles },
    { view: View.Add, label: 'Thêm từ', icon: Feather },
    { view: View.List, label: 'Danh sách từ', icon: BookOpen },
  ];

  return (
    <SettingsProvider>
      <VocabularyProvider>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-800 text-gray-200 font-sans">
          <Header onLogout={handleLogout} onSettingsClick={() => setIsSettingsOpen(true)} />
          <main className="container mx-auto p-4 md:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
              <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl shadow-2xl shadow-slate-900/50 border border-slate-700">
                <nav className="p-2 border-b border-slate-700 overflow-x-auto">
                  <ul className="flex items-center justify-start sm:justify-center space-x-2 sm:space-x-4">
                    {navItems.map((item) => (
                      <li key={item.view}>
                        <button
                          onClick={() => setCurrentView(item.view)}
                          className={`flex-shrink-0 flex items-center space-x-2 px-3 py-2 text-sm sm:px-4 sm:text-base rounded-md font-medium transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 ${
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
                </nav>
                <div className="p-4 sm:p-6 lg:p-8">{renderView()}</div>
              </div>
            </div>
          </main>
        </div>
        <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onKeySave={handleKeySave}
            onKeyClear={handleKeyClear}
            currentApiKey={apiKey}
        />
      </VocabularyProvider>
    </SettingsProvider>
  );
};

export default App;