import React, { useState, useMemo, useEffect } from 'react';
import { useVocabulary, themeTranslationMap } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { VocabularyWord } from '../types';
import { generateQuizForWord } from '../services/geminiService';
import { RefreshCw, Dices, Trophy, Flame, Star, ArrowLeft } from 'lucide-react';
import { useInspector } from '../hooks/useInspector';
import { useHistory } from '../hooks/useHistory';

type Quiz = {
  question: string;
  options: string[];
  correctAnswer: string;
};

interface LuckyWheelProps {
  onBack: () => void;
}

const LuckyWheel: React.FC<LuckyWheelProps> = ({ onBack }) => {
  const { words, getAvailableThemes } = useVocabulary();
  const { targetLanguage, learningLanguage, stats, updateBestStreak } = useSettings();
  const { openInspector } = useInspector();
  const { addHistoryEntry } = useHistory();
  
  const availableThemes = useMemo(() => getAvailableThemes(), [getAvailableThemes]);
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set(['all']));
  
  const filteredWordsByTheme = useMemo(() => {
    if (selectedThemes.has('all')) {
        return words;
    }
    return words.filter(word => word.theme && selectedThemes.has(word.theme));
  }, [words, selectedThemes]);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(filteredWordsByTheme.map(w => w.id)));
  
  const [duration, setDuration] = useState(3);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [resultWord, setResultWord] = useState<VocabularyWord | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [view, setView] = useState<'setup' | 'game'>('setup');
  const [currentStreak, setCurrentStreak] = useState(0);
  
  useEffect(() => {
    setSelectedIds(new Set(filteredWordsByTheme.map(w => w.id)));
  }, [filteredWordsByTheme]);

  const wordsForWheel = useMemo(() => filteredWordsByTheme.filter(w => selectedIds.has(w.id)), [filteredWordsByTheme, selectedIds]);

  const handleToggleWord = (id: string) => {
    setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        return newSet;
    });
  };
  
  const handleSelectAll = () => setSelectedIds(new Set(filteredWordsByTheme.map(w => w.id)));
  const handleDeselectAll = () => setSelectedIds(new Set());

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

  const handleSpin = () => {
    if (isSpinning || wordsForWheel.length < 2) return;
    
    setView('game');
    setIsSpinning(true);
    setQuiz(null);
    setResultWord(null);
    setSelectedAnswer(null);
    setShowResult(false);

    const randomSpins = 5;
    const randomStopAngle = Math.floor(Math.random() * 360);
    const newRotation = rotation + (360 * randomSpins) + randomStopAngle;
    setRotation(newRotation);
    
    const starredWords = wordsForWheel.filter(w => w.isStarred);
    const weightedList = [...wordsForWheel, ...starredWords];

    const winningIndex = Math.floor(Math.random() * weightedList.length);
    const winningWord = weightedList[winningIndex];

    const quizPromise = winningWord 
      ? generateQuizForWord(winningWord, targetLanguage, learningLanguage) 
      : Promise.resolve(null);

    setTimeout(async () => {
      setIsSpinning(false);
      setResultWord(winningWord);
      
      const generatedQuiz = await quizPromise;
      setQuiz(generatedQuiz);

    }, duration * 1000);
  };
  
  const handleAnswer = (option: string) => {
    if (showResult || !quiz || !resultWord) return;
    setSelectedAnswer(option);
    if (option === quiz.correctAnswer) {
      setScore(prev => prev + 1);
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      if (newStreak > stats.luckyWheelBestStreak) {
        updateBestStreak(newStreak);
      }
      addHistoryEntry('LUCKY_WHEEL_CORRECT_ANSWER', `Trả lời đúng câu hỏi cho từ "${resultWord.word}".`, { word: resultWord.word });
    } else {
      setCurrentStreak(0);
    }
    setShowResult(true);
  };
  
  const handleResetForNewSpin = () => {
    setResultWord(null);
    setQuiz(null);
    setShowResult(false);
    setSelectedAnswer(null);
    handleSpin();
  }

  const renderWheel = () => (
    <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 z-10" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))'}}>
          <svg width="30" height="45" viewBox="0 0 24 36" className="text-cyan-300" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 36C12 36 24 19.8636 24 12C24 4.5 18.6274 0 12 0C5.37258 0 0 4.5 0 12C0 19.8636 12 36 12 36Z"/>
          </svg>
      </div>
      
      <div 
        className="w-full h-full rounded-full border-8 border-slate-800/60 shadow-lg relative transition-transform"
        style={{ 
          transform: `rotate(${rotation}deg)`, 
          transitionDuration: `${isSpinning ? duration : 0}s`,
          transitionTimingFunction: 'cubic-bezier(0.25, 0.1, 0.25, 1.0)'
        }}
      >
        <div 
          className="w-full h-full rounded-full"
          style={{
            background: `conic-gradient(
              #4f46e5 0deg 15deg, #38bdf8 15deg 30deg,
              #4338ca 30deg 45deg, #0ea5e9 45deg 60deg,
              #4f46e5 60deg 75deg, #38bdf8 75deg 90deg,
              #4338ca 90deg 105deg, #0ea5e9 105deg 120deg,
              #4f46e5 120deg 135deg, #38bdf8 135deg 150deg,
              #4338ca 150deg 165deg, #0ea5e9 165deg 180deg,
              #4f46e5 180deg 195deg, #38bdf8 195deg 210deg,
              #4338ca 210deg 225deg, #0ea5e9 225deg 240deg,
              #4f46e5 240deg 255deg, #38bdf8 255deg 270deg,
              #4338ca 270deg 285deg, #0ea5e9 285deg 300deg,
              #4f46e5 300deg 315deg, #38bdf8 315deg 330deg,
              #4338ca 330deg 345deg, #0ea5e9 345deg 360deg
            )`
          }}
        ></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-slate-700 rounded-full border-4 border-slate-600 shadow-inner"></div>
      </div>
    </div>
  );
  
  const renderGameView = () => (
    <div className="flex flex-col items-center">
        {renderWheel()}
        <div className="w-full max-w-md text-center min-h-[17rem] mt-8 flex flex-col justify-center">
        {quiz && resultWord ? (
            <div className="space-y-4 animate-fade-in">
                <p className="text-gray-400">Từ cần dịch là:</p>
                <div 
                  className="inline-block cursor-pointer hover:underline" 
                  onClick={() => openInspector(resultWord)}
                  title="Nhấp để phân tích từ"
                >
                    <p className="text-4xl font-bold text-cyan-300 my-2">{resultWord.word}</p>
                </div>
                <div className="grid grid-cols-1 gap-3 pt-2">
                    {quiz.options.map((option, i) => {
                        const isCorrect = option === quiz.correctAnswer;
                        const isSelected = option === selectedAnswer;
                        let buttonClass = 'bg-slate-700/80 hover:bg-slate-700 hover:scale-[1.02] text-white';
                         if (showResult) {
                            if (isCorrect) buttonClass = 'bg-green-500 ring-2 ring-green-400 text-white scale-105';
                            else if (isSelected && !isCorrect) buttonClass = 'bg-red-500 ring-2 ring-red-400 text-white';
                            else buttonClass = 'bg-slate-700/50 opacity-60';
                        }
                        return (
                             <button key={i} onClick={() => handleAnswer(option)} disabled={showResult} className={`w-full text-center py-3 px-4 rounded-2xl font-semibold text-lg transition-all duration-300 ${buttonClass}`}>
                                {option}
                            </button>
                        );
                    })}
                </div>
                 {showResult && (
                     <button onClick={handleResetForNewSpin} className="w-auto mt-6 inline-flex items-center justify-center px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] animate-fade-in">
                        <Dices className="w-5 h-5 mr-2"/>
                        Quay tiếp
                    </button>
                 )}
            </div>
        ) : (
             <div className="flex flex-col justify-center items-center p-6 rounded-2xl h-full">
                 <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-indigo-400" />
                 <p className="text-white text-lg">{isSpinning ? "Đang quay..." : `Trúng từ "${resultWord?.word}"! Đang tạo câu hỏi...`}</p>
             </div>
        )}
        </div>
    </div>
  );
  
  const renderSetupView = () => (
    <div className="space-y-6">
        <div>
            <h3 className="font-semibold text-white mb-2">1. Chọn chủ đề</h3>
            <div className="flex flex-wrap gap-2 p-3 bg-slate-800/50 border border-slate-700 rounded-2xl">
                <button
                    onClick={() => handleThemeToggle('all')}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedThemes.has('all') ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-700 hover:bg-slate-600'}`}
                >
                    Tất cả
                </button>
                {availableThemes.map(theme => (
                    <button
                        key={theme}
                        onClick={() => handleThemeToggle(theme)}
                        className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedThemes.has(theme) ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-700 hover:bg-slate-600'}`}
                    >
                        {targetLanguage === 'english' ? (themeTranslationMap[theme] || theme) : theme}
                    </button>
                ))}
            </div>
        </div>
        <div>
          <h3 className="font-semibold text-white mb-2">2. Chọn từ ({selectedIds.size} / {filteredWordsByTheme.length} đã chọn)</h3>
          <div className="flex gap-2 mb-2">
              <button onClick={handleSelectAll} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg">Chọn tất cả</button>
              <button onClick={handleDeselectAll} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg">Bỏ chọn tất cả</button>
          </div>
          <div className="max-h-[25vh] overflow-y-auto pr-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-3 space-y-2">
              {filteredWordsByTheme.length > 0 ? filteredWordsByTheme.map(word => (
                  <div key={word.id} onClick={() => handleToggleWord(word.id)} className="flex items-center p-2 rounded-xl hover:bg-slate-700/50 cursor-pointer">
                      <input type="checkbox" checked={selectedIds.has(word.id)} readOnly className="w-5 h-5 mr-3 bg-slate-900 border-slate-600 text-indigo-500 focus:ring-indigo-600 rounded-md pointer-events-none" />
                      <div>
                          <p className="font-medium text-white">{word.word}</p>
                          <p className="text-sm text-gray-400">{word.translation[targetLanguage]}</p>
                      </div>
                  </div>
              )) : <p className="text-sm text-gray-400 text-center py-4">Không có từ nào trong chủ đề đã chọn.</p>}
          </div>
      </div>
       <div className="space-y-4">
          <div>
              <h3 className="font-semibold text-white mb-2">3. Thời gian quay</h3>
              <div className="flex justify-center gap-2">
                  {[1, 2, 3, 5, 10].map(d => (
                      <button key={d} onClick={() => setDuration(d)} className={`px-4 py-2 text-sm rounded-xl transition-colors ${duration === d ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>{d}s</button>
                  ))}
              </div>
          </div>
          <button onClick={handleSpin} className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed" disabled={isSpinning || wordsForWheel.length < 2}>
              {isSpinning ? <><RefreshCw className="w-5 h-5 mr-2 animate-spin" />Đang quay...</> : <><Dices className="w-5 h-5 mr-2"/>Bắt đầu quay</>}
          </button>
          {wordsForWheel.length < 2 && <p className="text-center text-sm text-amber-400">Vui lòng chọn ít nhất 2 từ cho vòng quay.</p>}
       </div>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
        <div className="flex justify-between items-start flex-wrap gap-2">
            <div>
              <h2 className="text-2xl font-bold text-white">Vòng Quay Từ Vựng</h2>
              {view === 'game' && <button onClick={() => setView('setup')} className="text-sm text-indigo-400 hover:underline mt-1">Thay đổi cài đặt</button>}
            </div>
            <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 text-gray-200 font-semibold rounded-xl transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </button>
        </div>
         <div className="flex items-center justify-center sm:justify-end gap-3">
            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700" title="Điểm">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className="font-bold text-white text-lg">{score}</span>
            </div>
             <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700" title="Chuỗi hiện tại">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="font-bold text-white text-lg">{currentStreak}</span>
            </div>
             <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700" title="Chuỗi tốt nhất">
                <Star className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-white text-lg">{stats.luckyWheelBestStreak}</span>
            </div>
        </div>
        
        {view === 'game' ? renderGameView() : renderSetupView()}

    </div>
  );
};

export default LuckyWheel;