import React, { useMemo, useState, useEffect } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { View, VocabularyWord } from '../types';
import { PenSquare, Layers, Dices, ArrowRight, Book, Star, Gamepad2, Sparkles, Flame, RotateCcw, Calendar, BrainCircuit } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useInspector } from '../hooks/useInspector';


const QuickReview: React.FC = () => {
    const { words, updateWordSrs } = useVocabulary();
    const { targetLanguage, recordActivity } = useSettings();

    const wordsToReview = useMemo(() => {
        return words
            .filter(word => word.nextReview <= Date.now())
            .sort((a, b) => a.srsLevel - b.srsLevel || a.nextReview - b.nextReview)
            .slice(0, 5); // Take top 5
    }, [words]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        // Reset completion state if the component is re-rendered with new words to review
        if (wordsToReview.length > 0) {
            setCompleted(false);
            setCurrentIndex(0);
        }
    }, [wordsToReview]);

    if (wordsToReview.length === 0 || completed) {
        return (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center h-full">
                <BrainCircuit className="w-8 h-8 text-emerald-400 mb-2" />
                <h3 className="font-bold text-white">Ôn tập nhanh</h3>
                <p className="text-sm text-gray-400 mt-1">
                    {completed ? "Bạn đã hoàn thành phiên ôn tập nhanh!" : "Không có từ nào cần ôn tập ngay."}
                </p>
            </div>
        );
    }

    const currentWord = wordsToReview[currentIndex];

    const handlePerformance = (performance: 'hard' | 'good' | 'easy') => {
        if (!isFlipped) return;
        
        updateWordSrs(currentWord.id, performance);
        
        if (currentIndex < wordsToReview.length - 1) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
        } else {
            recordActivity();
            setCompleted(true);
        }
    };

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex flex-col h-full">
            <h3 className="font-bold text-white mb-2 text-center">Ôn tập nhanh ({currentIndex + 1}/{wordsToReview.length})</h3>
            <div className="flex-grow flex flex-col justify-center">
                <div className="[perspective:1000px]" onClick={() => setIsFlipped(!isFlipped)}>
                    <div 
                        className="relative w-full h-32 rounded-lg transition-transform duration-500 cursor-pointer [will-change:transform]"
                        style={{
                            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                            transformStyle: 'preserve-3d',
                            WebkitTransformStyle: 'preserve-3d', // For Safari/iOS
                        }}
                    >
                        <div 
                            key={currentWord.id + '-front'} 
                            className="absolute w-full h-full flex items-center justify-center p-2 bg-slate-700 rounded-lg"
                            style={{
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden', // For Safari/iOS
                            }}
                        >
                            <p className="text-xl font-bold text-white text-center">{currentWord.word}</p>
                        </div>
                        <div 
                            key={currentWord.id + '-back'} 
                            className="absolute w-full h-full flex items-center justify-center p-2 bg-indigo-500 rounded-lg"
                            style={{
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden', // For Safari/iOS
                                transform: 'rotateY(180deg)',
                                WebkitTransform: 'rotateY(180deg)', // For Safari/iOS
                            }}
                        >
                            <p className="text-xl font-bold text-white text-center">{currentWord.translation[targetLanguage]}</p>
                        </div>
                    </div>
                </div>
            </div>
            {isFlipped ? (
                 <div className="grid grid-cols-3 gap-2 mt-3 animate-fade-in">
                    <button onClick={() => handlePerformance('hard')} className="py-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 text-sm font-semibold rounded-lg">Khó</button>
                    <button onClick={() => handlePerformance('good')} className="py-2 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-sm font-semibold rounded-lg">Tốt</button>
                    <button onClick={() => handlePerformance('easy')} className="py-2 bg-green-500/20 hover:bg-green-500/40 text-green-300 text-sm font-semibold rounded-lg">Dễ</button>
                 </div>
            ) : (
                <div className="text-center h-[40px] flex items-center justify-center mt-3">
                    <p className="text-xs text-gray-500">Nhấn vào thẻ để xem đáp án.</p>
                </div>
            )}
        </div>
    );
}

const WordOfTheDay: React.FC = () => {
    const { words, isWordsLoading } = useVocabulary();
    const { stats, isSettingsLoading, setWordOfTheDay, targetLanguage } = useSettings();
    const { openInspector } = useInspector();
    const [word, setWord] = useState<VocabularyWord | null>(null);

    useEffect(() => {
        if (isWordsLoading || isSettingsLoading || words.length === 0) return;

        const today = new Date().toISOString().split('T')[0];
        
        if (stats.wordOfTheDay?.date === today) {
            const currentWord = words.find(w => w.id === stats.wordOfTheDay?.wordId);
            setWord(currentWord || null);
        } else {
            // Select a new word
            const wordsNeedingReview = words.filter(w => w.nextReview <= Date.now());
            const selectionPool = wordsNeedingReview.length > 0 ? wordsNeedingReview : words;
            const newWord = selectionPool[Math.floor(Math.random() * selectionPool.length)];
            setWord(newWord);
            setWordOfTheDay(newWord.id);
        }
    }, [words, isWordsLoading, stats.wordOfTheDay, isSettingsLoading, setWordOfTheDay]);

    if (!word) {
         return (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center h-full">
                <Calendar className="w-8 h-8 text-cyan-400 mb-2" />
                <h3 className="font-bold text-white">Từ của Ngày</h3>
                <p className="text-sm text-gray-400 mt-1">Thêm từ vựng để bắt đầu nhận từ mới mỗi ngày.</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex flex-col h-full cursor-pointer" onClick={() => openInspector(word)}>
            <h3 className="font-bold text-white mb-2 text-center">Từ của Ngày</h3>
            <div className="flex-grow flex flex-col items-center justify-center text-center">
                 {word.imageUrl && <img src={word.imageUrl} alt={word.word} className="w-full h-24 object-contain rounded-md mb-3" />}
                <p className="text-2xl font-bold text-cyan-300">{word.word}</p>
                <p className="text-gray-400">{word.translation[targetLanguage]}</p>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">Nhấn để xem chi tiết</p>
        </div>
    );
};


interface HomeProps {
  setCurrentView: (view: View) => void;
}

const Home: React.FC<HomeProps> = ({ setCurrentView }) => {
  const { words, isWordsLoading } = useVocabulary();
  const { stats, isSettingsLoading } = useSettings();

  const featureCards = [
    {
      view: View.Learn,
      icon: BrainCircuit,
      title: 'Ôn luyện',
      description: 'Củng cố kiến thức qua ôn tập thông minh, luyện viết và thẻ ghi nhớ.',
      color: 'from-blue-500 to-purple-500',
    },
    {
      view: View.Games,
      icon: Gamepad2,
      title: 'Trò chơi',
      description: 'Vừa học vừa chơi với các game tương tác như Lật thẻ, Đố vui...',
      color: 'from-rose-500 to-rose-400',
    },
    {
      view: View.AiTools,
      icon: Sparkles,
      title: 'Công cụ AI',
      description: 'Sử dụng AI để tạo truyện, câu ví dụ và nhiều hơn nữa.',
      color: 'from-amber-500 to-amber-400',
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center p-6 bg-slate-800/30 rounded-2xl">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-300 text-transparent bg-clip-text">
          Chào mừng trở lại!
        </h1>
        <p className="mt-2 text-lg text-gray-400 max-w-2xl mx-auto">
          Sẵn sàng để chinh phục thêm nhiều từ vựng mới hôm nay chưa?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
        <div className="bg-slate-800/50 p-5 rounded-2xl flex items-center gap-4 border border-slate-700">
            <div className="p-3 bg-indigo-500/20 rounded-full">
                <Book className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
                {isWordsLoading ? (
                    <div className="h-7 w-16 bg-slate-700 rounded-md animate-pulse"></div>
                ) : (
                    <div className="text-3xl font-bold">{words.length}</div>
                )}
                <div className="text-sm text-gray-400">Từ đã lưu</div>
            </div>
        </div>
        <div className="bg-slate-800/50 p-5 rounded-2xl flex items-center gap-4 border border-slate-700">
            <div className="p-3 bg-orange-500/20 rounded-full">
                <Flame className="w-7 h-7 text-orange-400" />
            </div>
            <div>
                {isSettingsLoading ? (
                    <div className="h-7 w-8 bg-slate-700 rounded-md animate-pulse"></div>
                ) : (
                    <div className="text-3xl font-bold">{stats.currentStreak}</div>
                )}
                <div className="text-sm text-gray-400">Chuỗi hiện tại</div>
            </div>
        </div>
        <div className="bg-slate-800/50 p-5 rounded-2xl flex items-center gap-4 border border-slate-700">
            <div className="p-3 bg-yellow-500/20 rounded-full">
                <Star className="w-7 h-7 text-yellow-400" />
            </div>
            <div>
                {isSettingsLoading ? (
                    <div className="h-7 w-8 bg-slate-700 rounded-md animate-pulse"></div>
                ) : (
                    <div className="text-3xl font-bold">{stats.longestStreak}</div>
                )}
                <div className="text-sm text-gray-400">Chuỗi dài nhất</div>
            </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <WordOfTheDay />
        <QuickReview />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Các chế độ học</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureCards.map((card) => (
            <div
              key={card.view}
              onClick={() => setCurrentView(card.view)}
              className="group bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col hover:border-indigo-500/50 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 cursor-pointer"
            >
              <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${card.color}`}>
                      <card.icon className="w-7 h-7 text-white" />
                  </div>
                  <ArrowRight className="w-6 h-6 text-gray-600 group-hover:text-indigo-400 transition-colors" />
              </div>
              <div className="mt-4 flex-grow">
                <h3 className="text-xl font-bold text-white">{card.title}</h3>
                <p className="mt-1 text-gray-400 text-sm">{card.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;