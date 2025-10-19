import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useVocabulary, themeTranslationMap } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { useInspector } from '../hooks/useInspector';
import { useHistory } from '../hooks/useHistory';
import { VocabularyWord } from '../types';
import { generateQuizForWord } from '../services/geminiService';
import { Check, X, Loader2, RefreshCw, ArrowLeft } from 'lucide-react';

type QuizQuestion = {
  word: VocabularyWord;
  question: string;
  options: string[];
  correctAnswer: string;
};

type UserAnswer = {
  question: QuizQuestion;
  answer: string;
  isCorrect: boolean;
};

type QuizView = 'setup' | 'loading' | 'playing' | 'results';

interface QuizProps {
  onBack: () => void;
}

const Quiz: React.FC<QuizProps> = ({ onBack }) => {
  const { words, getAvailableThemes } = useVocabulary();
  const { targetLanguage, learningLanguage, recordActivity } = useSettings();
  const { openInspector } = useInspector();
  const { addHistoryEntry } = useHistory();

  const [view, setView] = useState<QuizView>('setup');
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set(['all']));
  const [numQuestions, setNumQuestions] = useState(10);
  
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const availableThemes = getAvailableThemes();
  
  const wordsForQuiz = useMemo(() => {
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

  const handleStartQuiz = useCallback(async () => {
    setError(null);
    const shuffledWords = [...wordsForQuiz].sort(() => 0.5 - Math.random());
    const questionCount = Math.min(numQuestions, shuffledWords.length);
    const wordsToQuiz = shuffledWords.slice(0, questionCount);

    if (wordsToQuiz.length === 0) {
      setError("Không có từ nào để tạo bài kiểm tra. Hãy thử chọn một chủ đề khác.");
      return;
    }
    
    setView('loading');
    
    try {
        const promises = wordsToQuiz.map(word => 
        generateQuizForWord(word, targetLanguage, learningLanguage).catch(err => {
            console.error(`Failed to generate quiz for "${word.word}":`, err);
            return null;
        })
        );

        const results = await Promise.all(promises);
        const successfulQuizzes = results.filter(q => q !== null) as Awaited<ReturnType<typeof generateQuizForWord>>[];
        
        const formattedQuestions: QuizQuestion[] = successfulQuizzes.map((quiz, index) => ({
            ...quiz!,
            word: wordsToQuiz.find(w => w.word === quiz!.question.split('"')[1]) || wordsToQuiz[index], // Robust word matching
        }));

        if (formattedQuestions.length < 1) {
            setError("Không thể tạo câu hỏi. Có thể do API key của bạn đã hết hạn mức.");
            setView('setup');
            return;
        }

        setQuizQuestions(formattedQuestions);
        setCurrentQuestionIndex(0);
        setUserAnswers([]);
        setSelectedAnswer(null);
        setView('playing');
    } catch (error: any) {
        if (error.message === "All API keys failed.") {
             setError("Tất cả API key đều không hoạt động. Vui lòng kiểm tra lại trong Cài đặt.");
        } else {
             setError("Không thể tạo câu hỏi. Vui lòng kiểm tra API key hoặc thử lại.");
        }
        setView('setup');
    }

  }, [wordsForQuiz, numQuestions, targetLanguage, learningLanguage]);
  
  const handleAnswerSelect = (answer: string) => {
    if (selectedAnswer) return;
    
    const currentQuestion = quizQuestions[currentQuestionIndex];
    const isCorrect = answer === currentQuestion.correctAnswer;
    
    setUserAnswers(prev => [...prev, { question: currentQuestion, answer, isCorrect }]);
    setSelectedAnswer(answer);
  };
  
  const handleNextQuestion = () => {
    const isLastQuestion = currentQuestionIndex >= quizQuestions.length - 1;
    
    if (!isLastQuestion) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
    } else {
      // Logic for when the quiz finishes
      const finalAnswers = [...userAnswers];
      if (finalAnswers.length < quizQuestions.length) {
          const currentQuestion = quizQuestions[currentQuestionIndex];
          const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
          finalAnswers.push({ question: currentQuestion, answer: selectedAnswer!, isCorrect });
      }
      
      const correctCount = finalAnswers.filter(a => a.isCorrect).length;
      const score = { correct: correctCount, total: quizQuestions.length };
      addHistoryEntry('QUIZ_COMPLETED', `Hoàn thành bài trắc nghiệm. (${score.correct}/${score.total})`, { score });
      recordActivity();
      setView('results');
    }
  };


  const handleRestartQuiz = () => {
      handleStartQuiz();
  }
  
  const ResultsScreen = () => {
    const correctAnswers = userAnswers.filter(a => a.isCorrect).length;
    const score = quizQuestions.length > 0 ? (correctAnswers / quizQuestions.length) * 100 : 0;
    const incorrectAnswers = userAnswers.filter(a => !a.isCorrect);

    return (
        <div className="space-y-6 text-center animate-fade-in">
            <h2 className="text-3xl font-bold text-white">Kết quả</h2>
            <div className="relative w-40 h-40 mx-auto">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path className="text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                    <path className="text-indigo-500" strokeDasharray={`${score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"></path>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-white">{correctAnswers}</span>
                    <span className="text-gray-400">/{quizQuestions.length}</span>
                </div>
            </div>
            <p className="text-xl text-gray-300">Bạn đã trả lời đúng {correctAnswers} trên {quizQuestions.length} câu!</p>

            {incorrectAnswers.length > 0 && (
                <div className="text-left space-y-3 pt-4">
                    <h3 className="font-semibold text-white">Xem lại các câu sai:</h3>
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                        {incorrectAnswers.map(({ question, answer }, index) => (
                            <div key={index} className="p-3 bg-slate-800/50 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-white cursor-pointer hover:underline" onClick={() => openInspector(question.word)}>{question.word.word}</p>
                                    <p className="text-sm"><span className="text-red-400">Bạn chọn: {answer}</span> • <span className="text-green-400">Đáp án: {question.correctAnswer}</span></p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button onClick={onBack} className="flex-1 px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl">Quay lại</button>
                <button onClick={handleRestartQuiz} className="flex-1 flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">
                    <RefreshCw className="w-5 h-5 mr-2" /> Làm lại
                </button>
            </div>
        </div>
    );
  };

  const renderSetup = () => (
    <div className="space-y-6 animate-fade-in">
       <div className="flex items-center justify-between">
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-bold text-white">Kiểm tra trắc nghiệm</h2>
          <p className="text-gray-400 mt-1">Chọn chủ đề và số lượng câu hỏi.</p>
        </div>
        <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 text-gray-200 font-semibold rounded-xl transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>
      </div>
      
      {error && <p className="text-center text-red-400 bg-red-500/10 p-3 rounded-xl">{error}</p>}

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
        <h3 className="font-semibold text-white mb-2">2. Chọn số câu hỏi</h3>
        <div className="flex justify-center gap-2">
          {[5, 10, 20].map(n => (
            <button key={n} onClick={() => setNumQuestions(n)} className={`px-4 py-2 text-sm rounded-xl transition-colors ${numQuestions === n ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>{n} câu</button>
          ))}
          <button onClick={() => setNumQuestions(wordsForQuiz.length)} className={`px-4 py-2 text-sm rounded-xl transition-colors ${numQuestions === wordsForQuiz.length ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>Tất cả ({wordsForQuiz.length})</button>
        </div>
      </div>

      <button onClick={handleStartQuiz} disabled={wordsForQuiz.length === 0} className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed">
          Bắt đầu
      </button>
    </div>
  );

  const renderLoading = () => (
      <div className="text-center py-10 space-y-4">
        <Loader2 className="w-10 h-10 mx-auto animate-spin text-indigo-400" />
        <h2 className="text-xl font-bold text-white">Đang chuẩn bị câu hỏi...</h2>
        <p className="text-gray-400">Việc này có thể mất một vài giây.</p>
      </div>
  );

  const renderPlaying = () => {
    const currentQuestion = quizQuestions[currentQuestionIndex];
    if (!currentQuestion) return renderSetup();
    
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold text-white">Câu hỏi {currentQuestionIndex + 1} / {quizQuestions.length}</h2>
            <button onClick={onBack} className="text-sm text-indigo-400 hover:underline">Thoát</button>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2.5">
            <div className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}></div>
          </div>
        </div>
        
        <div className="text-center p-6 bg-slate-800/50 rounded-2xl">
          <p className="text-xl text-gray-300">{currentQuestion.question}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {currentQuestion.options.map((option, index) => {
            const isCorrect = option === currentQuestion.correctAnswer;
            const isSelected = option === selectedAnswer;
            let buttonClass = 'bg-slate-700/80 hover:bg-slate-700 hover:scale-[1.02] text-white';
            if (selectedAnswer) {
              if (isCorrect) buttonClass = 'bg-green-500 ring-2 ring-green-400 text-white scale-105';
              else if (isSelected && !isCorrect) buttonClass = 'bg-red-500 ring-2 ring-red-400 text-white';
              else buttonClass = 'bg-slate-700/50 opacity-60';
            }
            return (
              <button key={index} onClick={() => handleAnswerSelect(option)} disabled={!!selectedAnswer} className={`w-full text-center py-3 px-4 rounded-2xl font-semibold text-lg transition-all duration-300 ${buttonClass}`}>
                {option}
              </button>
            )
          })}
        </div>

        {selectedAnswer && (
          <button onClick={handleNextQuestion} className="w-full flex items-center justify-center px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98]">
            {currentQuestionIndex < quizQuestions.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}
          </button>
        )}
      </div>
    );
  };
  
  const renderContent = () => {
    switch (view) {
      case 'setup':
        return renderSetup();
      case 'loading':
        return renderLoading();
      case 'playing':
        return renderPlaying();
      case 'results':
        return <ResultsScreen />;
      default:
        return renderSetup();
    }
  };

  return <div className="animate-fade-in">{renderContent()}</div>;
};

export default Quiz;