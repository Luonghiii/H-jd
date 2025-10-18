
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useVocabulary, themeTranslationMap } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { VocabularyWord } from '../types';
import { RefreshCw, ArrowLeft } from 'lucide-react';

type PracticeView = 'setup' | 'playing' | 'results';
type Answer = {
  word: VocabularyWord;
  userAnswer: string;
  isCorrect: boolean;
};

const Practice: React.FC = () => {
  const { words, getAvailableThemes } = useVocabulary();
  const { targetLanguage } = useSettings();

  const [view, setView] = useState<PracticeView>('setup');
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set(['all']));
  const [numWords, setNumWords] = useState(10);
  
  const [practiceWords, setPracticeWords] = useState<VocabularyWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  
  const availableThemes = getAvailableThemes();
  
  const wordsForPractice = useMemo(() => {
    if (selectedThemes.has('all')) return words;
    return words.filter(w => w.theme && selectedThemes.has(w.theme));
  }, [words, selectedThemes]);
  
  const handleThemeToggle = (theme: string) => {
    setSelectedThemes(prev => {
        const newSet = new Set(prev);
        if (theme === 'all') return new Set(['all']);
        newSet.delete('all');
        if (newSet.has(theme)) newSet.delete(theme);
        else newSet.add(theme);
        if (newSet.size === 0) return new Set(['all']);
        return newSet;
    });
  };

  const handleStartPractice = useCallback(() => {
    const shuffledWords = [...wordsForPractice].sort(() => 0.5 - Math.random());
    const wordCount = Math.min(numWords, shuffledWords.length);
    const wordsToPractice = shuffledWords.slice(0, wordCount);

    setPracticeWords(wordsToPractice);
    setCurrentWordIndex(0);
    setAnswers([]);
    setUserAnswer('');
    setView('playing');
  }, [wordsForPractice, numWords]);

  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;

    const currentWord = practiceWords[currentWordIndex];
    const correctAnswer = currentWord.translation[targetLanguage];
    const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.toLowerCase();
    
    setAnswers(prev => [...prev, { word: currentWord, userAnswer: userAnswer.trim(), isCorrect }]);
    
    if (currentWordIndex < practiceWords.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
      setUserAnswer('');
    } else {
      setView('results');
    }
  };

  const currentWord = practiceWords[currentWordIndex];

  if (view === 'setup') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Luyện tập Viết</h2>
          <p className="text-gray-400 mt-1">Dịch từ để củng cố kiến thức.</p>
        </div>
        <div>
          <h3 className="font-semibold text-white mb-2">1. Chọn chủ đề</h3>
          <div className="flex flex-wrap gap-2 p-3 bg-slate-800/50 border border-slate-700 rounded-2xl">
            <button onClick={() => handleThemeToggle('all')} className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedThemes.has('all') ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-700 hover:bg-slate-600'}`}>
              Tất cả ({words.length})
            </button>
            {availableThemes.map(theme => (
              <button key={theme} onClick={() => handleThemeToggle(theme)} className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedThemes.has(theme) ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-700 hover:bg-slate-600'}`}>
                {targetLanguage === 'english' ? (themeTranslationMap[theme] || theme) : theme} ({words.filter(w => w.theme === theme).length})
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-white mb-2">2. Chọn số từ</h3>
          <div className="flex justify-center gap-2">
            {[5, 10, 20].map(n => (
              <button key={n} onClick={() => setNumWords(n)} className={`px-4 py-2 text-sm rounded-xl transition-colors ${numWords === n ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>{n} từ</button>
            ))}
            <button onClick={() => setNumWords(wordsForPractice.length)} className={`px-4 py-2 text-sm rounded-xl transition-colors ${numWords === wordsForPractice.length ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>Tất cả ({wordsForPractice.length})</button>
          </div>
        </div>
        <button onClick={handleStartPractice} disabled={wordsForPractice.length === 0} className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed">
            Bắt đầu
        </button>
      </div>
    );
  }

  if (view === 'results') {
    const correctCount = answers.filter(a => a.isCorrect).length;
    return (
      <div className="space-y-6 text-center animate-fade-in">
        <h2 className="text-3xl font-bold text-white">Kết quả</h2>
        <p className="text-xl text-gray-300">Bạn đã trả lời đúng {correctCount} trên {answers.length} từ!</p>
        <div className="text-left space-y-3 pt-4">
            <h3 className="font-semibold text-white">Xem lại các câu trả lời:</h3>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {answers.map(({ word, userAnswer, isCorrect }, index) => (
                    <div key={index} className={`p-3 rounded-xl ${isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <p className="font-semibold text-white">{word.word}</p>
                        <p className="text-sm">{isCorrect ? 
                            <span className="text-green-400">Chính xác: {userAnswer}</span> : 
                            <>
                                <span className="text-red-400 line-through">Bạn trả lời: {userAnswer}</span><br />
                                <span className="text-green-400">Đáp án đúng: {word.translation[targetLanguage]}</span>
                            </>
                        }</p>
                    </div>
                ))}
            </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button onClick={() => setView('setup')} className="flex-1 px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl">Luyện tập lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold text-white">Câu hỏi {currentWordIndex + 1} / {practiceWords.length}</h2>
          <button onClick={() => setView('setup')} className="text-sm text-indigo-400 hover:underline">Thoát</button>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2.5">
          <div className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${((currentWordIndex + 1) / practiceWords.length) * 100}%` }}></div>
        </div>
      </div>
      <div className="text-center p-8 bg-slate-800/50 rounded-2xl">
        <p className="text-3xl font-bold text-white">{currentWord.word}</p>
        <p className="text-gray-400 mt-1">Dịch sang {targetLanguage === 'vietnamese' ? 'Tiếng Việt' : 'Tiếng Anh'}</p>
      </div>
      <form onSubmit={handleSubmitAnswer} className="space-y-4">
        <input 
          type="text"
          value={userAnswer}
          onChange={e => setUserAnswer(e.target.value)}
          className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
          placeholder="Nhập câu trả lời của bạn..."
          autoFocus
        />
        <button type="submit" className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98]">
          Kiểm tra
        </button>
      </form>
    </div>
  );
};

export default Practice;