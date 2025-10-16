import React, { useState, useMemo, useEffect } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { VocabularyWord } from '../types';
import { generateQuizForWord } from '../services/geminiService';
import { RefreshCw, Dices, Trophy, Flame, Star } from 'lucide-react';

type Quiz = {
  question: string;
  options: string[];
  correctAnswer: string;
};

const LuckyWheel: React.FC = () => {
  const { words } = useVocabulary();
  const { targetLanguage } = useSettings();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(words.map(w => w.id)));
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
  const [bestStreak, setBestStreak] = useState(0);

  useEffect(() => {
    try {
      const savedBestStreak = localStorage.getItem('luckyWheelBestStreak');
      if (savedBestStreak) {
        setBestStreak(Number(savedBestStreak));
      }
    } catch (error) {
      console.error("Could not load best streak from localStorage", error);
    }
  }, []);

  const wordsForWheel = useMemo(() => words.filter(w => selectedIds.has(w.id)), [words, selectedIds]);

  const handleToggleWord = (id: string) => {
    setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        return newSet;
    });
  };
  
  const handleSelectAll = () => setSelectedIds(new Set(words.map(w => w.id)));
  const handleDeselectAll = () => setSelectedIds(new Set());

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

    const winningIndex = Math.floor(Math.random() * wordsForWheel.length);
    const winningWord = wordsForWheel[winningIndex];

    setTimeout(async () => {
      setIsSpinning(false);
      setResultWord(winningWord);
      
      if (winningWord) {
        const generatedQuiz = await generateQuizForWord(winningWord, targetLanguage);
        setQuiz(generatedQuiz);
      }
    }, duration * 1000);
  };
  
  const handleAnswer = (option: string) => {
    if (showResult || !quiz) return;
    setSelectedAnswer(option);
    if (option === quiz.correctAnswer) {
      setScore(prev => prev + 1);
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
        try {
          localStorage.setItem('luckyWheelBestStreak', String(newStreak));
        } catch (error) {
          console.error("Could not save best streak to localStorage", error);
        }
      }
    } else {
      setCurrentStreak(0);
    }
    setShowResult(true);
  };
  
  const handlePlayAgain = () => {
    setResultWord(null);
    setQuiz(null);
    setShowResult(false);
    setSelectedAnswer(null);
    setView('setup');
  }

  if (words.length === 0) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold text-white">Vòng Quay Từ Vựng</h2>
        <p className="text-gray-400 mt-2">Thêm vài từ vào danh sách để chơi.</p>
      </div>
    );
  }

  const renderWheel = () => (
    <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 z-10" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))'}}>
          <svg width="30" height="45" viewBox="0 0 24 36" className="text-cyan-400" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
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
        {quiz ? (
            <div className="space-y-4 animate-fade-in">
                <p className="text-gray-400">Từ cần dịch là:</p>
                <p className="text-4xl font-bold text-cyan-300 my-2">{resultWord?.german}</p>
                <div className="grid grid-cols-1 gap-3 pt-2">
                    {quiz.options.map((option, i) => {
                        const isCorrect = option === quiz.correctAnswer;
                        const isSelected = option === selectedAnswer;
                        let buttonClass = 'bg-slate-700/80 hover:bg-slate-700';
                         if (showResult) {
                            if (isCorrect) buttonClass = 'bg-green-600 ring-2 ring-green-400 text-white scale-105';
                            else if (isSelected && !isCorrect) buttonClass = 'bg-red-600 ring-2 ring-red-400 text-white';
                            else buttonClass = 'bg-slate-700/50 opacity-60';
                        }
                        return (
                             <button key={i} onClick={() => handleAnswer(option)} disabled={showResult} className={`w-full text-center py-3 px-4 rounded-lg font-semibold text-lg transition-all duration-300 ${buttonClass}`}>
                                {option}
                            </button>
                        );
                    })}
                </div>
                 {showResult && (
                     <button onClick={handleSpin} className="w-auto mt-6 inline-flex items-center justify-center px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition duration-300 animate-fade-in">
                        <Dices className="w-5 h-5 mr-2"/>
                        Quay tiếp
                    </button>
                 )}
            </div>
        ) : (
             <div className="flex flex-col justify-center items-center p-6 rounded-lg h-full">
                 <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-indigo-400" />
                 <p className="text-white text-lg">{isSpinning ? "Đang quay..." : `Trúng từ "${resultWord?.german}"! Đang tạo câu hỏi...`}</p>
             </div>
        )}
        </div>
    </div>
  );
  
  const renderSetupView = () => (
    <div className="space-y-6">
       <div className="space-y-4">
          <div>
              <h3 className="font-semibold text-white mb-2">1. Thời gian quay</h3>
              <div className="flex justify-center gap-2">
                  {[1, 2, 3, 5, 10].map(d => (
                      <button key={d} onClick={() => setDuration(d)} className={`px-4 py-2 text-sm rounded-md transition-colors ${duration === d ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>{d}s</button>
                  ))}
              </div>
          </div>
          <button onClick={handleSpin} className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition duration-300 disabled:bg-indigo-400 disabled:cursor-not-allowed" disabled={isSpinning || wordsForWheel.length < 2}>
              {isSpinning ? <><RefreshCw className="w-5 h-5 mr-2 animate-spin" />Đang quay...</> : <><Dices className="w-5 h-5 mr-2"/>Bắt đầu quay</>}
          </button>
          {wordsForWheel.length < 2 && <p className="text-center text-sm text-amber-400">Vui lòng chọn ít nhất 2 từ cho vòng quay.</p>}
       </div>
       <div>
          <h3 className="font-semibold text-white mb-2">2. Chọn từ ({selectedIds.size} đã chọn)</h3>
          <div className="flex gap-2 mb-2">
              <button onClick={handleSelectAll} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded">Chọn tất cả</button>
              <button onClick={handleDeselectAll} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded">Bỏ chọn tất cả</button>
          </div>
          <div className="max-h-[25vh] overflow-y-auto pr-2 bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-2">
              {words.map(word => (
                  <div key={word.id} onClick={() => handleToggleWord(word.id)} className="flex items-center p-2 rounded-md hover:bg-slate-700/50 cursor-pointer">
                      <input type="checkbox" checked={selectedIds.has(word.id)} readOnly className="w-5 h-5 mr-3 bg-slate-900 border-slate-600 text-indigo-500 focus:ring-indigo-600 rounded" />
                      <div>
                          <p className="font-medium text-white">{word.german}</p>
                          <p className="text-sm text-gray-400">{word.translation[targetLanguage]}</p>
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-2xl font-bold text-white">Vòng Quay Từ Vựng</h2>
            <div className="flex items-center gap-3">
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
                    <span className="font-bold text-white text-lg">{bestStreak}</span>
                </div>
            </div>
        </div>
        
        {view === 'game' ? renderGameView() : renderSetupView()}

        {view === 'game' && <button onClick={handlePlayAgain} className="w-full text-center text-sm text-indigo-400 hover:underline mt-2">Quay lại màn hình cài đặt</button>}
    </div>
  );
};

export default LuckyWheel;