import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useVocabulary, themeTranslationMap } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { useInspector } from '../hooks/useInspector';
import { useHistory } from '../hooks/useHistory';
import { ArrowLeft, ArrowRight, Shuffle, RotateCcw, Info, ChevronDown, Sparkles } from 'lucide-react';
import { VocabularyWord, StudySet } from '../types';
import AiWordSelectorModal from './AiWordSelectorModal';

type FlashcardView = 'setup' | 'playing';
type SelectionSource = 'theme' | 'studySet';

interface FlashcardsProps {
  onBack: () => void;
}

const Flashcards: React.FC<FlashcardsProps> = ({ onBack }) => {
  const { words, getAvailableThemes } = useVocabulary();
  const { uiLanguage, studySets } = useSettings();
  const { openInspector } = useInspector();
  const { addHistoryEntry } = useHistory();
  
  const [view, setView] = useState<FlashcardView>('setup');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  
  // Setup State
  const [selectionSource, setSelectionSource] = useState<SelectionSource>('theme');
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set(['all']));
  const [selectedStudySetIds, setSelectedStudySetIds] = useState<Set<string>>(new Set());
  const availableThemes = getAvailableThemes();

  const baseWordsForSelection = useMemo(() => {
    if (selectionSource === 'theme') {
      if (selectedThemes.has('all')) return words;
      return words.filter(w => w.theme && selectedThemes.has(w.theme));
    } else { // 'studySet'
      if (selectedStudySetIds.size === 0) return [];
      const combinedWordIds = new Set<string>();
      (studySets || []).forEach(set => {
        if (selectedStudySetIds.has(set.id)) {
          set.wordIds.forEach(id => combinedWordIds.add(id));
        }
      });
      return words.filter(w => combinedWordIds.has(w.id));
    }
  }, [words, selectionSource, selectedThemes, selectedStudySetIds, studySets]);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(baseWordsForSelection.map(w => w.id)));
  
  useEffect(() => {
    setSelectedIds(new Set(baseWordsForSelection.map(w => w.id)));
  }, [baseWordsForSelection]);
  
  const wordsForFlashcards = useMemo(() => baseWordsForSelection.filter(w => selectedIds.has(w.id)), [baseWordsForSelection, selectedIds]);

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
  
  const handleStudySetToggle = (setId: string) => {
    setSelectedStudySetIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(setId)) newSet.delete(setId);
        else newSet.add(setId);
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
  const handleSelectAll = () => setSelectedIds(new Set(baseWordsForSelection.map(w => w.id)));
  const handleDeselectAll = () => setSelectedIds(new Set());

  const handleAiSelect = (aiWords: VocabularyWord[]) => {
    const newIds = new Set(aiWords.map(w => w.id));
    setSelectedIds(newIds);
    setIsAiModalOpen(false);
  };

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
      <>
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Thẻ ghi nhớ</h2>
              <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 text-gray-200 font-semibold rounded-xl transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  <span>Quay lại</span>
              </button>
          </div>
          <p className="text-gray-400 -mt-4 text-center sm:text-left">Chọn từ để bắt đầu ôn tập.</p>

           <div className="flex justify-center p-1 bg-slate-800/60 rounded-full mb-4">
              <button onClick={() => setSelectionSource('theme')} className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all ${selectionSource === 'theme' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-700'}`}>Theo Chủ đề</button>
              <button onClick={() => setSelectionSource('studySet')} className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all ${selectionSource === 'studySet' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-700'}`}>Theo Bộ từ học</button>
          </div>

          <div>
              <h3 className="font-semibold text-white mb-2">Lựa chọn từ</h3>
              <button 
                  onClick={() => setIsAiModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600/20 text-indigo-300 border border-indigo-500/50 rounded-xl hover:bg-indigo-600/40"
              >
                  <Sparkles className="w-5 h-5" />
                  Nhờ AI chọn giúp
              </button>
          </div>

          <details className="group bg-slate-800/50 border border-slate-700 rounded-2xl">
              <summary className="list-none p-3 cursor-pointer flex justify-between items-center">
                  <h3 className="font-semibold text-white">Hoặc, chọn thủ công...</h3>
                  <ChevronDown className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" />
              </summary>
              <div className="p-3 border-t border-slate-600 space-y-4">
                {selectionSource === 'theme' ? (
                    <div>
                      <h3 className="font-semibold text-white">1. Chọn chủ đề <span className="text-gray-400 font-normal text-sm">({selectedThemes.has('all') ? 'Tất cả' : `${selectedThemes.size} đã chọn`})</span></h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <button onClick={() => handleThemeToggle('all')} className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedThemes.has('all') ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-700 text-gray-200 hover:bg-slate-600'}`}>
                              Tất cả ({words.length})
                            </button>
                            {availableThemes.map(theme => (
                              <button key={theme} onClick={() => handleThemeToggle(theme)} className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedThemes.has(theme) ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-700 text-gray-200 hover:bg-slate-600'}`}>
                                {uiLanguage === 'english' ? (themeTranslationMap[theme] || theme) : theme} ({words.filter(w => w.theme === theme).length})
                              </button>
                            ))}
                        </div>
                    </div>
                ) : (
                     <div>
                        <h3 className="font-semibold text-white">1. Chọn bộ từ học <span className="text-gray-400 font-normal text-sm">({selectedStudySetIds.size} đã chọn)</span></h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {(studySets || []).map((set: StudySet) => (
                              <button key={set.id} onClick={() => handleStudySetToggle(set.id)} className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedStudySetIds.has(set.id) ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-700 text-gray-200 hover:bg-slate-600'}`}>
                                {set.name} ({set.wordIds.length})
                              </button>
                            ))}
                            {(studySets || []).length === 0 && <p className="text-sm text-gray-400">Bạn chưa tạo bộ từ học nào.</p>}
                        </div>
                    </div>
                )}


                <div>
                  <h3 className="font-semibold text-white mb-2">2. Chọn từ ({selectedIds.size} / {baseWordsForSelection.length} đã chọn)</h3>
                  <div className="flex gap-2 mb-2">
                    <button onClick={handleSelectAll} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg text-gray-200">Chọn tất cả</button>
                    <button onClick={handleDeselectAll} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg text-gray-200">Bỏ chọn tất cả</button>
                  </div>
                  <div className="max-h-[25vh] overflow-y-auto pr-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-3 space-y-2">
                    {baseWordsForSelection.map(word => (
                      <div key={word.id} onClick={() => handleToggleWord(word.id)} className="flex items-center p-2 rounded-xl hover:bg-slate-700/50 cursor-pointer transition-colors">
                        <input type="checkbox" checked={selectedIds.has(word.id)} readOnly className="w-5 h-5 mr-3 bg-slate-900 border-slate-600 text-indigo-500 focus:ring-indigo-600 rounded-md pointer-events-none" />
                        <div>
                          <p className="font-medium text-white hover:underline" onClick={(e) => { e.stopPropagation(); openInspector(word); }}>{word.word}</p>
                          <p className="text-sm text-gray-400">{word.translation[uiLanguage]}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
          </details>

          <button onClick={handleStart} disabled={wordsForFlashcards.length === 0} className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed">
              Bắt đầu ôn tập ({wordsForFlashcards.length} từ)
          </button>
        </div>
        <AiWordSelectorModal 
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          availableWords={baseWordsForSelection}
          onConfirm={handleAiSelect}
        />
      </>
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
          className="relative w-full h-64 rounded-2xl shadow-xl transition-transform duration-500 cursor-pointer [will-change:transform]"
          style={{
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transformStyle: 'preserve-3d',
            WebkitTransformStyle: 'preserve-3d', // For Safari/iOS
          }}
        >
          {/* Front of the card */}
          <div
            key={currentWord.id + '-front'}
            className="absolute w-full h-full flex items-center justify-center p-4 bg-slate-700 rounded-2xl border border-slate-600"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden', // For Safari/iOS
            }}
          >
            <p className="text-3xl font-bold text-white text-center">{currentWord.word}</p>
            <button onClick={(e) => { e.stopPropagation(); openInspector(currentWord); }} className="absolute top-2 right-2 p-2 text-gray-300 hover:text-white hover:bg-black/20 rounded-full" aria-label="Inspect word"><Info className="w-5 h-5" /></button>
          </div>
          {/* Back of the card */}
          <div
            key={currentWord.id + '-back'}
            className="absolute w-full h-full flex items-center justify-center p-4 bg-indigo-500 rounded-2xl"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden', // For Safari/iOS
              transform: 'rotateY(180deg)',
              WebkitTransform: 'rotateY(180deg)', // For Safari/iOS
            }}
          >
            <p className="text-3xl font-bold text-white text-center">{currentWord.translation[uiLanguage]}</p>
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