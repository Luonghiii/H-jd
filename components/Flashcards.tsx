

import React, { useState, useMemo, useCallback } from 'react';
import { useVocabulary, themeTranslationMap } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { ArrowLeft, ArrowRight, Shuffle, RotateCcw } from 'lucide-react';

type FlashcardView = 'setup' | 'playing';

const Flashcards: React.FC = () => {
  const { words, getAvailableThemes } = useVocabulary();
  const { targetLanguage } = useSettings();
  
  const [view, setView] = useState<FlashcardView>('setup');
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set(['all']));
  const [cardWords, setCardWords] = useState(words);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const availableThemes = getAvailableThemes();
  
  const wordsForFlashcards = useMemo(() => {
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

  const handleStart = () => {
    const shuffled = [...wordsForFlashcards].sort(() => 0.5 - Math.random());
    setCardWords(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setView('playing');
  };
  
  const handleShuffle = () => {
      const shuffled = [...cardWords].sort(() => 0.5 - Math.random());
      setCardWords(shuffled);
      setCurrentIndex(0);
      setIsFlipped(false);
  }

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex(prev => (prev + 1) % cardWords.length), 150);
  };
  
  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex(prev => (prev - 1 + cardWords.length) % cardWords.length), 150);
  };

  if (view === 'setup') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Thẻ ghi nhớ</h2>
          <p className="text-gray-400 mt-1">Chọn chủ đề để bắt đầu ôn tập.</p>
        </div>
        <div>
          <h3 className="font-semibold text-white mb-2">Chọn chủ đề</h3>
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
        <button onClick={handleStart} disabled={wordsForFlashcards.length === 0} className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed">
            Bắt đầu ôn tập ({wordsForFlashcards.length} từ)
        </button>
      </div>
    );
  }

  const currentWord = cardWords[currentIndex];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-white">Thẻ {currentIndex + 1} / {cardWords.length}</h2>
        <button onClick={() => setView('setup')} className="text-sm text-indigo-400 hover:underline">Thay đổi lựa chọn</button>
      </div>
      
      <div className="[perspective:1000px]" onClick={() => setIsFlipped(!isFlipped)}>
        <div 
          className="relative w-full h-64 rounded-2xl shadow-xl [transform-style:preserve-3d] transition-transform duration-500 cursor-pointer"
          style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'}}
        >
          <div className="absolute w-full h-full [backface-visibility:hidden] flex items-center justify-center p-4 bg-slate-700 rounded-2xl border border-slate-600">
            <p className="text-3xl font-bold text-white text-center">{currentWord.word}</p>
          </div>
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center p-4 bg-indigo-500 rounded-2xl">
            <p className="text-3xl font-bold text-white text-center">{currentWord.translation[targetLanguage]}</p>
          </div>
        </div>
      </div>
      
      <p className="text-center text-sm text-gray-400">Nhấn vào thẻ để lật.</p>
      
      <div className="flex justify-center items-center gap-4">
        <button onClick={handlePrev} className="p-4 bg-slate-700/80 hover:bg-slate-700 rounded-full text-white">
          <ArrowLeft className="w-6 h-6"/>
        </button>
        <button onClick={handleShuffle} className="p-3 bg-slate-700/80 hover:bg-slate-700 rounded-full text-white">
          <Shuffle className="w-5 h-5"/>
        </button>
        <button onClick={() => setIsFlipped(!isFlipped)} className="p-3 bg-slate-700/80 hover:bg-slate-700 rounded-full text-white">
          <RotateCcw className="w-5 h-5"/>
        </button>
        <button onClick={handleNext} className="p-4 bg-slate-700/80 hover:bg-slate-700 rounded-full text-white">
          <ArrowRight className="w-6 h-6"/>
        </button>
      </div>
    </div>
  );
};

export default Flashcards;