import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useVocabulary, themeTranslationMap } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { VocabularyWord } from '../types';
import { ArrowRight, Check, X, RefreshCw } from 'lucide-react';
import { useInspector } from '../hooks/useInspector';

const Practice: React.FC = () => {
  const { words, getAvailableThemes } = useVocabulary();
  const { targetLanguage, learningLanguage } = useSettings();
  const { openInspector } = useInspector();
  
  type PracticeCard = VocabularyWord & { direction: 'de_to_trans' | 'trans_to_de' };

  const [practiceDeck, setPracticeDeck] = useState<PracticeCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [isRandomMode, setIsRandomMode] = useState(false);
  const [hintInterval, setHintInterval] = useState<number>(0);
  const [revealedHint, setRevealedHint] = useState<string>('');
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set(['all']));

  const availableThemes = getAvailableThemes();
  
  const handleThemeToggle = (theme: string) => {
    setSelectedThemes(prev => {
        const newSet = new Set(prev);
        if (theme === 'all') {
            return new Set(['all']);
        }

        newSet.delete('all');

        if (newSet.has(theme)) {
            newSet.delete(theme);
        } else {
            newSet.add(theme);
        }

        if (newSet.size === 0) {
            return new Set(['all']);
        }
        
        return newSet;
    });
  };

  const startNewSession = useCallback(() => {
    const filteredWords = selectedThemes.has('all')
      ? words
      : words.filter(w => w.theme && selectedThemes.has(w.theme));
    
    if (filteredWords.length === 0) return;
    
    const starredWords = filteredWords.filter(w => w.isStarred);
    const weightedDeck = [...filteredWords, ...starredWords]; // Starred words appear twice
    
    const shuffled = weightedDeck.sort(() => 0.5 - Math.random());
    const deck = shuffled.map(word => ({
      ...word,
      direction: Math.random() < 0.5 ? 'de_to_trans' : 'trans_to_de' as ('de_to_trans' | 'trans_to_de')
    }));

    setPracticeDeck(deck);
    setCurrentIndex(0);
    setUserInput('');
    setShowAnswer(false);
    setIsCorrect(null);
    setRevealedHint('');
    setSessionActive(true);
  }, [words, selectedThemes]);

  const currentQuestion = sessionActive && practiceDeck.length > 0 ? practiceDeck[currentIndex] : null;

  useEffect(() => {
    setRevealedHint(''); 

    if (hintInterval === 0 || showAnswer || !currentQuestion) {
      return; 
    }

    const correctAnswer = currentQuestion.direction === 'de_to_trans' 
      ? currentQuestion.translation[targetLanguage]
      : currentQuestion.word;
    
    let timerId: number | undefined;
    const revealLetter = () => {
        setRevealedHint(prev => {
            if (prev.length >= correctAnswer.length) {
              if (timerId) clearInterval(timerId);
              return prev;
            }
            return correctAnswer.substring(0, prev.length + 1);
        });
    };

    timerId = window.setInterval(revealLetter, hintInterval * 1000);

    return () => clearInterval(timerId);
  }, [currentQuestion, hintInterval, showAnswer, targetLanguage]);

  const isSessionFinished = !isRandomMode && sessionActive && currentIndex >= practiceDeck.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion || !userInput.trim() || showAnswer) return;

    const answer = currentQuestion.direction === 'de_to_trans' 
      ? currentQuestion.translation[targetLanguage]
      : currentQuestion.word;

    const correct = userInput.trim().toLowerCase() === answer.trim().toLowerCase();
    
    setIsCorrect(correct);
    setShowAnswer(true);
  };

  const handleNext = () => {
    setShowAnswer(false);
    setIsCorrect(null);
    setUserInput('');
    if (isRandomMode) {
      const newIndex = Math.floor(Math.random() * practiceDeck.length);
      setCurrentIndex(newIndex);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };
  
  const wordsForSelectedTheme = useMemo(() => {
     return selectedThemes.has('all')
      ? words
      : words.filter(w => w.theme && selectedThemes.has(w.theme));
  }, [words, selectedThemes]);

  if (words.length === 0) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold text-white">Bắt đầu luyện tập</h2>
        <p className="text-gray-400 mt-2">Thêm vài từ vào danh sách của bạn để bắt đầu buổi học.</p>
      </div>
    );
  }

  if (!sessionActive) {
    return (
      <div className="space-y-6">
        <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Thiết lập buổi luyện tập</h2>
            <p className="text-gray-400 mt-1">Chọn chủ đề và chế độ để bắt đầu.</p>
        </div>
        <div className="space-y-4 max-w-sm mx-auto">
            <div>
                <label htmlFor="theme-select" className="block text-sm font-medium text-gray-300 mb-2">1. Chọn chủ đề</label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-800/50 border border-slate-700 rounded-2xl">
                    <button
                        onClick={() => handleThemeToggle('all')}
                        className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedThemes.has('all') ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-700 hover:bg-slate-600'}`}
                    >
                        Tất cả ({words.length})
                    </button>
                    {availableThemes.map(theme => (
                        <button
                            key={theme}
                            onClick={() => handleThemeToggle(theme)}
                            className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedThemes.has(theme) ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-700 hover:bg-slate-600'}`}
                        >
                            {targetLanguage === 'english' ? (themeTranslationMap[theme] || theme) : theme} ({words.filter(w => w.theme === theme).length})
                        </button>
                    ))}
                </div>
            </div>
            <div>
                 <p className="block text-sm font-medium text-gray-300 mb-1">2. Chế độ luyện tập</p>
                 <div className="flex items-center justify-center gap-3 text-sm text-gray-300 bg-slate-800/50 border border-slate-700 rounded-xl p-3">
                    <span>Tuần tự</span>
                    <button
                        onClick={() => setIsRandomMode(!isRandomMode)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                        isRandomMode ? 'bg-indigo-600' : 'bg-slate-600'
                        }`}
                    >
                        <span aria-hidden="true" className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isRandomMode ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <span>Ngẫu nhiên</span>
                </div>
            </div>
             <button
                onClick={startNewSession}
                disabled={wordsForSelectedTheme.length === 0}
                className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
                Bắt đầu luyện tập
            </button>
             {wordsForSelectedTheme.length === 0 && <p className="text-center text-sm text-amber-400">Không có từ nào trong chủ đề này để luyện tập.</p>}
        </div>
      </div>
    );
  }

  if (isSessionFinished) {
    return (
        <div className="text-center py-10 space-y-4">
            <h2 className="text-2xl font-bold text-white">Buổi học kết thúc!</h2>
            <p className="text-gray-400 mt-2">Bạn đã luyện tập tất cả các từ trong chủ đề này. Làm tốt lắm!</p>
            <div className="flex justify-center gap-4">
                <button
                    onClick={() => setSessionActive(false)}
                    className="inline-flex items-center justify-center px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98]"
                >
                    Quay lại
                </button>
                <button
                    onClick={startNewSession}
                    className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98]"
                >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Luyện tập lại
                </button>
            </div>
        </div>
    );
  }
  
  if (!currentQuestion) {
      return (
        <div className="text-center py-10">
            <p className="text-gray-400 mt-2">Đang tải buổi luyện tập...</p>
        </div>
      )
  }
  
  const languageNameMap = {
      german: 'tiếng Đức',
      english: 'tiếng Anh',
      chinese: 'tiếng Trung'
  };

  const promptText = currentQuestion.direction === 'de_to_trans' 
    ? `Dịch sang ${targetLanguage === 'vietnamese' ? 'tiếng Việt' : 'tiếng Anh'}:`
    : `Dịch sang ${languageNameMap[learningLanguage]}:`;
  const wordToDisplay = currentQuestion.direction === 'de_to_trans' ? currentQuestion.word : currentQuestion.translation[targetLanguage];
  const correctAnswer = currentQuestion.direction === 'de_to_trans' ? currentQuestion.translation[targetLanguage] : currentQuestion.word;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Buổi luyện tập</h2>
        <p className="text-gray-400 mt-1">Dịch từ dưới đây.</p>
      </div>

      <div className="space-y-3">
        {!isRandomMode && (
          <div className="relative text-center">
              <div className="h-2 bg-slate-700 rounded-full">
                  <div 
                    className="h-2 bg-indigo-500 rounded-full transition-all duration-300" 
                    style={{ width: `${((currentIndex) / practiceDeck.length) * 100}%` }}
                  ></div>
              </div>
              <p className="text-sm text-gray-400 mt-2 font-medium">Từ {currentIndex + 1} trên {practiceDeck.length}</p>
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-3 text-sm text-gray-300">
            <button onClick={() => setSessionActive(false)} className="text-sm text-indigo-400 hover:underline">
                Kết thúc & Chọn lại
            </button>
            <div className="flex items-center gap-2">
                <label htmlFor="hint-interval" className="text-gray-300">Tốc độ gợi ý:</label>
                <select
                    id="hint-interval"
                    value={hintInterval}
                    onChange={(e) => setHintInterval(Number(e.target.value))}
                    className="bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 py-1 px-2"
                    aria-label="Tốc độ gợi ý"
                >
                    <option value={0}>Tắt</option>
                    {[...Array(10)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}s</option>
                    ))}
                </select>
            </div>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-2xl text-center shadow-inner">
        {currentQuestion.imageUrl && (
            <img 
                src={currentQuestion.imageUrl}
                alt={`Hint for ${currentQuestion.word}`}
                className="mx-auto mb-4 h-32 w-32 object-contain rounded-lg"
            />
        )}
        <p className="text-lg text-gray-400 mb-2">{promptText}</p>
        <div 
            className="inline-block cursor-pointer hover:underline" 
            onClick={() => openInspector(currentQuestion)}
            title="Nhấp để phân tích từ"
        >
            <p className="text-3xl font-bold text-cyan-300">{wordToDisplay}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Câu trả lời của bạn..."
            className="flex-grow w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            disabled={showAnswer}
            autoFocus
          />
          {showAnswer ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 flex items-center justify-center px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98]"
            >
              Tiếp theo
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          ) : (
            <button
              type="submit"
              className="flex-1 flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed"
              disabled={!userInput.trim()}
            >
              Kiểm tra
            </button>
          )}
        </div>
      </form>
      
      {revealedHint && !showAnswer && (
        <div className="mt-4 p-3 bg-slate-800/50 rounded-xl text-center">
            <p className="text-sm text-gray-400">Gợi ý:</p>
            <p className="font-mono text-lg text-amber-400 tracking-widest">{revealedHint}</p>

        </div>
      )}

      {showAnswer && (
        <div className={`mt-4 p-4 rounded-xl border flex items-center gap-3 ${isCorrect ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            {isCorrect ? <Check className="w-6 h-6 text-green-400 flex-shrink-0" /> : <X className="w-6 h-6 text-red-400 flex-shrink-0" />}
            <div>
              {isCorrect ? (
                <p className="font-semibold text-white">Chính xác!</p>
              ) : (
                <>
                  <p className="font-semibold text-white">Chưa đúng. Đáp án đúng là:</p>
                  <p className="text-gray-300 font-mono text-lg">{correctAnswer}</p>
                </>
              )}
            </div>
        </div>
      )}
    </div>
  );
};

export default Practice;