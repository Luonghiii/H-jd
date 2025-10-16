import React, { useState, useEffect, useCallback } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { VocabularyWord } from '../types';
import { ArrowRight, Check, X, RefreshCw } from 'lucide-react';

const Practice: React.FC = () => {
  const { words } = useVocabulary();
  const { targetLanguage } = useSettings();
  
  type PracticeCard = VocabularyWord & { direction: 'de_to_trans' | 'trans_to_de' };

  const [practiceDeck, setPracticeDeck] = useState<PracticeCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [isRandomMode, setIsRandomMode] = useState(false);

  const startNewSession = useCallback(() => {
    if (words.length === 0) return;
    
    const shuffled = [...words].sort(() => 0.5 - Math.random());
    const deck = shuffled.map(word => ({
      ...word,
      direction: Math.random() < 0.5 ? 'de_to_trans' : 'trans_to_de' as ('de_to_trans' | 'trans_to_de')
    }));

    setPracticeDeck(deck);
    setCurrentIndex(0);
    setUserInput('');
    setShowAnswer(false);
    setIsCorrect(null);
    setSessionActive(true);
  }, [words]);

  useEffect(() => {
    if (words.length > 0) {
      startNewSession();
    } else {
      setSessionActive(false);
    }
  }, [words, startNewSession]);
  
  const currentQuestion = sessionActive && practiceDeck.length > 0 ? practiceDeck[currentIndex] : null;
  const isSessionFinished = !isRandomMode && sessionActive && currentIndex >= practiceDeck.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion || !userInput.trim() || showAnswer) return;

    const answer = currentQuestion.direction === 'de_to_trans' 
      ? currentQuestion.translation[targetLanguage]
      : currentQuestion.german;

    // A simple check. For German, this could be improved to handle articles flexibly.
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

  if (words.length === 0) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold text-white">Bắt đầu luyện tập</h2>
        <p className="text-gray-400 mt-2">Thêm vài từ vào danh sách của bạn để bắt đầu buổi học.</p>
      </div>
    );
  }

  if (isSessionFinished) {
    return (
        <div className="text-center py-10 space-y-4">
            <h2 className="text-2xl font-bold text-white">Buổi học kết thúc!</h2>
            <p className="text-gray-400 mt-2">Bạn đã luyện tập tất cả các từ. Làm tốt lắm!</p>
            <button
                onClick={startNewSession}
                className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition duration-300"
            >
                <RefreshCw className="w-5 h-5 mr-2" />
                Bắt đầu buổi học mới
            </button>
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
  
  const promptText = currentQuestion.direction === 'de_to_trans' 
    ? `Dịch sang ${targetLanguage === 'vietnamese' ? 'tiếng Việt' : 'tiếng Anh'}:`
    : 'Dịch sang tiếng Đức:';
  const wordToDisplay = currentQuestion.direction === 'de_to_trans' ? currentQuestion.german : currentQuestion.translation[targetLanguage];
  const correctAnswer = currentQuestion.direction === 'de_to_trans' ? currentQuestion.translation[targetLanguage] : currentQuestion.german;

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
        <div className="flex items-center justify-center gap-3 text-sm text-gray-300">
            <span>Tuần tự</span>
            <button
                onClick={() => setIsRandomMode(!isRandomMode)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                isRandomMode ? 'bg-indigo-600' : 'bg-slate-600'
                }`}
            >
                <span
                aria-hidden="true"
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isRandomMode ? 'translate-x-5' : 'translate-x-0'
                }`}
                />
            </button>
            <span>Ngẫu nhiên</span>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl text-center shadow-inner">
        <p className="text-lg text-gray-400 mb-2">{promptText}</p>
        <p className="text-3xl font-bold text-cyan-300">{wordToDisplay}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Câu trả lời của bạn..."
            className="flex-grow w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            disabled={showAnswer}
            autoFocus
          />
          {showAnswer ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 flex items-center justify-center px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-md transition duration-300"
            >
              Tiếp theo
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          ) : (
            <button
              type="submit"
              className="flex-1 flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition duration-300 disabled:bg-indigo-400 disabled:cursor-not-allowed"
              disabled={!userInput.trim()}
            >
              Kiểm tra
            </button>
          )}
        </div>
      </form>
      
      {showAnswer && (
        <div className={`p-4 rounded-lg border flex items-center gap-3 ${isCorrect ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
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