import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useVocabulary, themeTranslationMap } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { useInspector } from '../hooks/useInspector';
import { useHistory } from '../hooks/useHistory';
import { ArrowLeft, ArrowRight, Shuffle, RotateCcw, Info } from 'lucide-react';

type FlashcardView = 'setup' | 'playing';

const Flashcards: React.FC = () => {
  const { words, getAvailableThemes } = useVocabulary();
  const { targetLanguage } = useSettings();
  const { openInspector } = useInspector();
  const { addHistoryEntry } = useHistory();
  
  const [view, setView] = useState<FlashcardView>('setup');
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set(['all']));
  
  const availableThemes = getAvailableThemes();
  
  const themeFilteredWords = useMemo(() => {
    if (selectedThemes.has('all')) return words;
    return words.filter(w => w.theme && selectedThemes.has(w.theme));
  }, [words, selectedThemes]);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(themeFilteredWords.map(w => w.id)));
  
  useEffect(() => {
    setSelectedIds(new Set(themeFilteredWords.map(w => w.id)));
  }, [themeFilteredWords]);
  
  const wordsForFlashcards = useMemo(() => themeFilteredWords.filter(w => selectedIds.has(w.id)), [themeFilteredWords, selectedIds]);

  const [cardWords, setCardWords] = useState(wordsForFlashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
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

  const handleToggleWord = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
      return newSet;
    });
  };
  const handleSelectAll = () => setSelectedIds(new Set(themeFilteredWords.map(w => w.id)));
  const handleDeselectAll = () => setSelectedIds(new Set());

  const handleStart = () => {
    const shuffled = [...wordsForFlashcards].sort(() => 0.5 - Math.random());
    setCardWords(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    addHistoryEntry('FLASHCARDS_SESSION_STARTED', `Bắt đầu phiên thẻ ghi nhớ với ${wordsForFlashcards.length} từ.`, { count: wordsForFlashcards.length });
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
          <p className="text-gray-400 mt-1">Chọn từ để bắt đầu ôn tập.</p>
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
          <h3 className="font-semibold text-white mb-2">2. Chọn từ ({selectedIds.size} / {themeFilteredWords.length} đã chọn)</h3>
          <div className="flex gap-2 mb-2">
            <button onClick={handleSelectAll} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg">Chọn tất cả</button>
            <button onClick={handleDeselectAll} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg">Bỏ chọn tất cả</button>
          </div>
          <div className="max-h-[25vh] overflow-y-auto pr-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-3 space-y-2">
            {themeFilteredWords.map(word => (
              <div key={word.id} onClick={() => handleToggleWord(word.id)} className="flex items-center p-2 rounded-xl hover:bg-slate-700/50 cursor-pointer transition-colors">
                <input type="checkbox" checked={selectedIds.has(word.id)} readOnly className="w-5 h-5 mr-3 bg-slate-900 border-slate-600 text-indigo-500 focus:ring-indigo-600 rounded-md pointer-events-none" />
                <div>
                  <p className="font-medium text-white hover:underline" onClick={(e) => { e.stopPropagation(); openInspector(word); }}>{word.word}</p>
                  <p className="text-sm text-gray-400">{word.translation[targetLanguage]}</p>
                </div>
              </div>
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
      
      <div className="[perspective:1000px]">
        <div 
          onClick={() => setIsFlipped(!isFlipped)}
          className="relative w-full h-64 rounded-2xl shadow-xl [transform-style:preserve-3d] transition-transform duration-500 cursor-pointer"
          style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'}}
        >
          <div className="absolute w-full h-full [backface-visibility:hidden] flex items-center justify-center p-4 bg-slate-700 rounded-2xl border border-slate-600">
            <p className="text-3xl font-bold text-white text-center">{currentWord.word}</p>
            <button onClick={(e) => { e.stopPropagation(); openInspector(currentWord); }} className="absolute top-2 right-2 p-2 text-gray-300 hover:text-white hover:bg-black/20 rounded-full" aria-label="Inspect word"><Info className="w-5 h-5" /></button>
          </div>
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center p-4 bg-indigo-500 rounded-2xl">
            <p className="text-3xl font-bold text-white text-center">{currentWord.translation[targetLanguage]}</p>
            <button onClick={(e) => { e.stopPropagation(); openInspector(currentWord); }} className="absolute top-2 right-2 p-2 text-gray-200 hover:text-white hover:bg-black/20 rounded-full" aria-label="Inspect word"><Info className="w-5 h-5" /></button>
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