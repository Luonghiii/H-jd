import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useVocabulary, themeTranslationMap } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { useInspector } from '../hooks/useInspector';
import { useHistory } from '../hooks/useHistory';
import { VocabularyWord, StudySet } from '../types';
import { generateQuizForWord } from '../services/geminiService';
import { Check, X, Loader2, RefreshCw, ArrowLeft, ChevronDown, Sparkles } from 'lucide-react';
import AiWordSelectorModal from './AiWordSelectorModal';
import { useActivityTracker } from '../hooks/useActivityTracker';

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
type SelectionSource = 'theme' | 'studySet';

interface QuizProps {
  onBack: () => void;
}

export const Quiz: React.FC<QuizProps> = ({ onBack }) => {
  const { words, getAvailableThemes } = useVocabulary();
  const { uiLanguage, learningLanguage, addXp, studySets } = useSettings();
  const { openInspector } = useInspector();
  const { addHistoryEntry } = useHistory();
  const { logActivity } = useActivityTracker();

  const [view, setView] = useState<QuizView>('setup');
  const [numQuestions, setNumQuestions] = useState(10);
  
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [error, setError] = useState<string | null>(null);
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

  const wordsForQuiz = useMemo(() => baseWordsForSelection.filter(w => selectedIds.has(w.id)), [baseWordsForSelection, selectedIds]);

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
        generateQuizForWord(word, uiLanguage, learningLanguage).catch(err => {
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

  }, [wordsForQuiz, numQuestions, uiLanguage, learningLanguage]);
  
  const handleAnswerSelect = (answer: string) => {
    if (selectedAnswer) return;
    
    const currentQuestion = quizQuestions[currentQuestionIndex];
    const isCorrect = answer === currentQuestion.correctAnswer;
    
    if (isCorrect) {
        addXp(5); // Grant 5 XP for a correct answer
    }

    logActivity(
        'QUIZ_COMPLETED', // Reusing this type
        `Answered "${answer}" for word "${currentQuestion.word.word}". Correct: ${isCorrect}.`,
        { word: currentQuestion.word.word, correct: isCorrect }
    );

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
      addXp(25); // Grant 25 bonus XP for completing a quiz
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
                                    <p className="text-sm text-red-400 line-through">Bạn trả lời: {answer}</p>
                                    <p className="text-sm text-green-400">Đáp án đúng: {question.correctAnswer}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button onClick={onBack} className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl">Game mới</button>
                <button onClick={handleRestartQuiz} className="flex-1 flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Chơi lại
                </button>
            </div>
        </div>
    );
  };

  if (view === 'setup') {
    return (
        <>
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Trắc nghiệm</h2>
                    <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 text-gray-200 font-semibold rounded-xl transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Quay lại</span>
                    </button>
                </div>
                <p className="text-gray-400 -mt-4 text-center sm:text-left">Kiểm tra kiến thức của bạn với các câu hỏi do AI tạo ra.</p>

                <div className="flex justify-center p-1 bg-slate-800/60 rounded-full mb-4">
                    <button onClick={() => setSelectionSource('theme')} className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all ${selectionSource === 'theme' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-700'}`}>Theo Chủ đề</button>
                    <button onClick={() => setSelectionSource('studySet')} className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all ${selectionSource === 'studySet' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-700'}`}>Theo Bộ từ học</button>
                </div>

                <div>
                    <h3 className="font-semibold text-white mb-2">Lựa chọn từ</h3>
                    <button onClick={() => setIsAiModalOpen(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600/20 text-indigo-300 border border-indigo-500/50 rounded-xl hover:bg-indigo-600/40">
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
                            <div className="max-h-[20vh] overflow-y-auto pr-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-3 space-y-2">
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

                <div>
                    <h3 className="font-semibold text-white mb-2">3. Chọn số câu hỏi</h3>
                    <input type="range" min="5" max={Math.max(5, wordsForQuiz.length)} value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))} className="w-full" disabled={wordsForQuiz.length === 0} />
                    <div className="text-center font-bold text-indigo-400">{wordsForQuiz.length > 0 ? numQuestions : 0} câu</div>
                </div>

                {error && <p className="text-center text-red-400">{error}</p>}
                
                <button onClick={handleStartQuiz} disabled={wordsForQuiz.length === 0} className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed">
                    Bắt đầu
                </button>
            </div>
            <AiWordSelectorModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} availableWords={baseWordsForSelection} onConfirm={handleAiSelect} />
        </>
    );
  }
  
  if (view === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-4" />
        <p className="text-lg text-white">AI đang tạo câu hỏi...</p>
        <p className="text-gray-400">Việc này có thể mất một vài giây.</p>
      </div>
    );
  }
  
  if (view === 'results') {
    return <ResultsScreen />;
  }

  const currentQuestion = quizQuestions[currentQuestionIndex];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold text-white">Câu hỏi {currentQuestionIndex + 1} / {quizQuestions.length}</h2>
        <button onClick={onBack} className="text-sm text-indigo-400 hover:underline">Thoát</button>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2.5">
        <div className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}></div>
      </div>
      <div className="text-center p-8 bg-slate-800/50 rounded-2xl">
        <p className="text-3xl font-bold text-white cursor-pointer hover:underline" onClick={() => openInspector(currentQuestion.word)}>{currentQuestion.question}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {currentQuestion.options.map((option, i) => {
          const isCorrect = option === currentQuestion.correctAnswer;
          const isSelected = option === selectedAnswer;
          let buttonClass = 'bg-slate-700/80 hover:bg-slate-700 text-white';

          if (selectedAnswer) {
            if (isCorrect) buttonClass = 'bg-green-500 ring-2 ring-green-400 text-white scale-105';
            else if (isSelected) buttonClass = 'bg-red-500 ring-2 ring-red-400 text-white';
            else buttonClass = 'bg-slate-700/50 opacity-60';
          }

          return (
            <button key={i} onClick={() => handleAnswerSelect(option)} disabled={!!selectedAnswer} className={`w-full text-center py-3 px-4 rounded-2xl font-semibold text-lg transition-all duration-300 ${buttonClass}`}>
              {option}
            </button>
          );
        })}
      </div>
      {selectedAnswer && (
        <button onClick={handleNextQuestion} className="w-full mt-4 flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98]">
          {currentQuestionIndex >= quizQuestions.length - 1 ? 'Xem kết quả' : 'Câu tiếp theo'}
        </button>
      )}
    </div>
  );
};
