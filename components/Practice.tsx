import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useVocabulary, themeTranslationMap } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { VocabularyWord } from '../types';
import { RefreshCw, ArrowLeft, Check, X, ChevronDown, Sparkles, Loader2 } from 'lucide-react';
import { useInspector } from '../hooks/useInspector';
import { useHistory } from '../hooks/useHistory';
import AiWordSelectorModal from './AiWordSelectorModal';
import { useActivityTracker } from '../hooks/useActivityTracker';
import { gradePracticeAnswer } from '../services/geminiService';

type PracticeView = 'setup' | 'playing' | 'results';
type Answer = {
  word: VocabularyWord;
  userAnswer: string;
  isCorrect: boolean;
  aiFeedback?: string;
};

interface PracticeProps {
  onBack: () => void;
}

const Practice: React.FC<PracticeProps> = ({ onBack }) => {
  const { words, getAvailableThemes } = useVocabulary();
  const { uiLanguage, learningLanguage, recordActivity, addXp } = useSettings();
  const { openInspector } = useInspector();
  const { addHistoryEntry } = useHistory();
  const { logActivity } = useActivityTracker();

  const [view, setView] = useState<PracticeView>('setup');
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set(['all']));
  const [numWords, setNumWords] = useState(10);
  
  const [practiceWords, setPracticeWords] = useState<VocabularyWord[]>([]);
  const [initialPracticeWords, setInitialPracticeWords] = useState<VocabularyWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [answerStatus, setAnswerStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  
  const availableThemes = getAvailableThemes();
  
  const themeFilteredWords = useMemo(() => {
    if (selectedThemes.has('all')) return words;
    return words.filter(w => w.theme && selectedThemes.has(w.theme));
  }, [words, selectedThemes]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(themeFilteredWords.map(w => w.id)));
  
  useEffect(() => {
    setSelectedIds(new Set(themeFilteredWords.map(w => w.id)));
  }, [themeFilteredWords]);

  const wordsForPractice = useMemo(() => themeFilteredWords.filter(w => selectedIds.has(w.id)), [themeFilteredWords, selectedIds]);
  
  useEffect(() => {
    if (wordsForPractice.length > 0) {
        setNumWords(currentNum => Math.max(1, Math.min(currentNum, wordsForPractice.length)));
    } else {
        setNumWords(1);
    }
  }, [wordsForPractice.length]);

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
  
  const handleAiSelect = (aiWords: VocabularyWord[]) => {
    const newIds = new Set(aiWords.map(w => w.id));
    setSelectedIds(newIds);
    setIsAiModalOpen(false);
  };

  const handleStartPractice = useCallback((options?: { replay?: boolean }) => {
    let wordsToPractice: VocabularyWord[];

    if (options?.replay && initialPracticeWords.length > 0) {
        wordsToPractice = [...initialPracticeWords].sort(() => 0.5 - Math.random());
    } else {
        const shuffledWords = [...wordsForPractice].sort(() => 0.5 - Math.random());
        const wordCount = Math.min(numWords, shuffledWords.length);
        wordsToPractice = shuffledWords.slice(0, wordCount);
        setInitialPracticeWords(wordsToPractice);
    }

    setPracticeWords(wordsToPractice);
    setCurrentWordIndex(0);
    setAnswers([]);
    setUserAnswer('');
    recordActivity(); // Record activity as soon as the session starts
    setView('playing');
  }, [wordsForPractice, numWords, initialPracticeWords, recordActivity]);

  const handleNextQuestion = () => {
      if (currentWordIndex < practiceWords.length - 1) {
          setCurrentWordIndex(prev => prev + 1);
          setUserAnswer('');
          setAnswerStatus('idle');
      } else {
          addHistoryEntry('PRACTICE_SESSION_COMPLETED', `Hoàn thành phiên luyện tập với ${practiceWords.length} từ.`, { count: practiceWords.length });
          addXp(15);
          setView('results');
      }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim() || answerStatus !== 'idle' || isGrading) return;

    const currentWord = practiceWords[currentWordIndex];
    const correctAnswer = currentWord.translation[uiLanguage];
    const userAnswerTrimmed = userAnswer.trim().toLowerCase();
    const correctAnswerTrimmed = correctAnswer.toLowerCase();
    
    let isCorrect = false;
    let aiFeedback: string | undefined = undefined;

    // 1. Fast, local check
    if (userAnswerTrimmed === correctAnswerTrimmed || (learningLanguage === 'german' && correctAnswerTrimmed.includes(userAnswerTrimmed))) {
        isCorrect = true;
    } else {
        // 2. Slower, smarter AI check
        setIsGrading(true);
        try {
            const result = await gradePracticeAnswer(currentWord.word, correctAnswer, userAnswer.trim(), learningLanguage);
            isCorrect = result.evaluation === 'correct' || result.evaluation === 'close';
            aiFeedback = result.feedback;
        } catch (error) {
            console.error("AI grading failed", error);
            isCorrect = false; // Fallback to incorrect on error
            aiFeedback = "Lỗi khi chấm điểm bằng AI.";
        } finally {
            setIsGrading(false);
        }
    }
    
    if (isCorrect) {
        addXp(3);
    }

    logActivity('PRACTICE_SESSION_COMPLETED', `Answered for word "${currentWord.word}". Correct: ${isCorrect}.`, { word: currentWord.word, correct: isCorrect });
    
    setAnswers(prev => [...prev, { word: currentWord, userAnswer: userAnswer.trim(), isCorrect, aiFeedback }]);
    setAnswerStatus(isCorrect ? 'correct' : 'incorrect');
  };
  
  const getStatusClasses = () => {
      if (answerStatus === 'correct') return 'ring-2 ring-green-500 border-green-500';
      if (answerStatus === 'incorrect') return 'ring-2 ring-red-500 border-red-500';
      return 'border-slate-600 focus:ring-2 focus:ring-indigo-500';
  }

  const currentWord = practiceWords[currentWordIndex];

  if (view === 'setup') {
    return (
      <>
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Luyện tập Viết</h2>
              <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 text-gray-200 font-semibold rounded-xl transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  <span>Quay lại</span>
              </button>
          </div>
          <p className="text-gray-400 -mt-4 text-center sm:text-left">Dịch từ để củng cố kiến thức.</p>

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

                  <div>
                    <h3 className="font-semibold text-white mb-2">2. Chọn từ ({selectedIds.size} / {themeFilteredWords.length} đã chọn)</h3>
                    <div className="flex gap-2 mb-2">
                      <button onClick={handleSelectAll} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg text-gray-200">Chọn tất cả</button>
                      <button onClick={handleDeselectAll} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg text-gray-200">Bỏ chọn tất cả</button>
                    </div>
                    <div className="max-h-[20vh] overflow-y-auto pr-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-3 space-y-2">
                      {themeFilteredWords.map(word => (
                        <div key={word.id} onClick={() => handleToggleWord(word.id)} className="flex items-center p-2 rounded-xl hover:bg-slate-700/50 cursor-pointer transition-colors">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.has(word.id)}
                            readOnly
                            className="w-5 h-5 mr-3 bg-slate-900 border-slate-600 text-indigo-500 focus:ring-indigo-600 rounded-md pointer-events-none"
                          />
                          <div>
                            <p 
                              className="font-medium text-white hover:underline" 
                              onClick={(e) => { 
                                e.stopPropagation();
                                openInspector(word); 
                              }}
                            >
                              {word.word}
                            </p>
                            <p className="text-sm text-gray-400">{word.translation[uiLanguage]}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
              </div>
          </details>

          <div>
            <h3 className="font-semibold text-white mb-2 flex justify-between items-center">
              <span>3. Chọn số từ</span>
              <span className="font-bold text-indigo-400 text-lg bg-slate-800/50 px-3 py-1 rounded-lg">
                  {wordsForPractice.length > 0 ? numWords : 0}
              </span>
            </h3>
            <input
              type="range"
              min="1"
              max={wordsForPractice.length > 0 ? wordsForPractice.length : 1}
              value={wordsForPractice.length > 0 ? numWords : 1}
              onChange={(e) => setNumWords(Number(e.target.value))}
              disabled={wordsForPractice.length === 0}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-indigo-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer"
            />
          </div>
          <button onClick={() => handleStartPractice()} disabled={wordsForPractice.length === 0} className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed">
              Bắt đầu
          </button>
        </div>
        <AiWordSelectorModal 
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          availableWords={themeFilteredWords}
          onConfirm={handleAiSelect}
        />
      </>
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
                {answers.map(({ word, userAnswer, isCorrect, aiFeedback }, index) => (
                    <div key={index} className={`p-3 rounded-xl ${isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <p className="font-semibold text-white cursor-pointer hover:underline" onClick={() => openInspector(word)}>{word.word}</p>
                        <p className="text-sm">{isCorrect ? 
                            <span className="text-green-400">Chính xác: {userAnswer}</span> : 
                            <>
                                <span className="text-red-400 line-through">Bạn trả lời: {userAnswer}</span><br />
                                <span className="text-green-400">Đáp án đúng: {word.translation[uiLanguage]}</span>
                            </>
                        }</p>
                        {aiFeedback && <p className="text-xs text-yellow-400 mt-1">💡 AI: {aiFeedback}</p>}
                    </div>
                ))}
            </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button onClick={onBack} className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl">Game mới</button>
            <button onClick={() => handleStartPractice({ replay: true })} className="flex-1 px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl">Chơi lại</button>
            <button onClick={() => handleStartPractice()} className="flex-1 flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">
                 <RefreshCw className="w-5 h-5 mr-2" /> Tiếp tục
            </button>
        </div>
      </div>
    );
  }

  const lastAnswerFeedback = answers[answers.length - 1]?.aiFeedback;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold text-white">Câu hỏi {currentWordIndex + 1} / {practiceWords.length}</h2>
          <button onClick={onBack} className="text-sm text-indigo-400 hover:underline">Thoát</button>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2.5">
          <div className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${((currentWordIndex + 1) / practiceWords.length) * 100}%` }}></div>
        </div>
      </div>
      <div className="text-center p-8 bg-slate-800/50 rounded-2xl">
        <p 
          className="text-3xl font-bold text-white cursor-pointer hover:underline"
          onClick={() => openInspector(currentWord)}
          title="Nhấp để xem chi tiết"
        >
          {currentWord.word}
        </p>
        <p className="text-gray-400 mt-1">Dịch sang {uiLanguage === 'vietnamese' ? 'Tiếng Việt' : 'Tiếng Anh'}</p>
      </div>
      <form onSubmit={handleSubmitAnswer}>
        <div className="relative">
            <input 
              type="text"
              value={userAnswer}
              onChange={e => setUserAnswer(e.target.value)}
              className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-gray-500 focus:outline-none text-lg transition-all ${getStatusClasses()}`}
              placeholder="Nhập câu trả lời của bạn..."
              autoFocus
              disabled={answerStatus !== 'idle' || isGrading}
            />
             {answerStatus === 'correct' && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-green-500" />}
             {answerStatus === 'incorrect' && <X className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-red-500" />}
        </div>
        {lastAnswerFeedback && answerStatus !== 'idle' && (
            <p className="text-xs text-yellow-400 mt-2 text-center animate-fade-in">💡 AI: {lastAnswerFeedback}</p>
        )}
        {answerStatus === 'idle' ? (
            <button type="submit" className="w-full mt-4 flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98]" disabled={!userAnswer.trim() || isGrading}>
              {isGrading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> AI đang chấm điểm...</> : 'Kiểm tra'}
            </button>
        ) : (
            <button type="button" onClick={handleNextQuestion} className="w-full mt-4 flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98]">
              Tiếp theo
            </button>
        )}
      </form>
    </div>
  );
};

export default Practice;