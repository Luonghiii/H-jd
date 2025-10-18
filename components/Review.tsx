import React, { useState, useMemo } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { useHistory } from '../hooks/useHistory';
import { BrainCircuit, RotateCcw } from 'lucide-react';

const Review: React.FC = () => {
    const { words, updateWordSrs } = useVocabulary();
    const { targetLanguage } = useSettings();
    const { addHistoryEntry } = useHistory();
    const [isSessionActive, setIsSessionActive] = useState(false);
    
    const wordsToReview = useMemo(() => {
        return words
            .filter(word => word.nextReview <= Date.now())
            .sort((a, b) => a.srsLevel - b.srsLevel || a.nextReview - b.nextReview);
    }, [words]);

    const [sessionWords, setSessionWords] = useState<typeof wordsToReview>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [sessionStats, setSessionStats] = useState({ hard: 0, good: 0, easy: 0 });

    const startSession = () => {
        setSessionWords(wordsToReview);
        setCurrentIndex(0);
        setIsFlipped(false);
        setSessionStats({ hard: 0, good: 0, easy: 0 });
        setIsSessionActive(true);
    };
    
    const endSession = () => {
        addHistoryEntry('REVIEW_SESSION_COMPLETED', `Hoàn thành phiên ôn tập với ${sessionWords.length} từ.`);
        setIsSessionActive(false);
    };

    const handlePerformance = (performance: 'hard' | 'good' | 'easy') => {
        if (!isFlipped) return;
        
        const currentWord = sessionWords[currentIndex];
        updateWordSrs(currentWord.id, performance);
        
        setSessionStats(prev => ({ ...prev, [performance]: prev[performance] + 1 }));

        if (currentIndex < sessionWords.length - 1) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
        } else {
            endSession();
        }
    };

    if (!isSessionActive) {
        return (
            <div className="text-center space-y-6 animate-fade-in">
                 <div className="inline-block p-3 bg-emerald-500/10 rounded-full mb-3">
                    <BrainCircuit className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Ôn tập Thông minh</h2>
                {wordsToReview.length > 0 ? (
                    <>
                        <p className="text-gray-400">Bạn có <strong className="text-white">{wordsToReview.length}</strong> từ cần ôn tập hôm nay.</p>
                        <button onClick={startSession} className="w-full max-w-xs mx-auto flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98]">
                            Bắt đầu ôn tập
                        </button>
                    </>
                ) : (
                    <p className="text-gray-400">Tuyệt vời! Bạn đã hoàn thành tất cả các từ cần ôn tập.</p>
                )}
            </div>
        );
    }
    
    if (sessionWords.length === 0) {
        return <div>Đang tải...</div>;
    }
    
    const currentWord = sessionWords[currentIndex];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">Ôn tập: {currentIndex + 1} / {sessionWords.length}</h2>
                <button onClick={endSession} className="text-sm text-indigo-400 hover:underline">Kết thúc</button>
            </div>

            <div className="[perspective:1000px]" onClick={() => setIsFlipped(!isFlipped)}>
                <div 
                  className="relative w-full h-64 rounded-2xl shadow-xl [transform-style:preserve-3d] transition-transform duration-500 cursor-pointer"
                  style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'}}
                >
                  <div className="absolute w-full h-full [backface-visibility:hidden] flex items-center justify-center p-4 bg-slate-700 rounded-2xl border border-slate-600">
                    <p className="text-3xl font-bold text-white text-center">{currentWord.word}</p>
                  </div>
                  <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center p-4 bg-indigo-500 rounded-2xl">
                    <p className="text-3xl font-bold text-white text-center">{currentWord.translation[targetLanguage]}</p>
                  </div>
                </div>
            </div>

            {isFlipped ? (
                 <div className="grid grid-cols-3 gap-3 animate-fade-in">
                    <button onClick={() => handlePerformance('hard')} className="p-4 bg-red-500/20 hover:bg-red-500/40 text-red-300 font-semibold rounded-xl">Khó</button>
                    <button onClick={() => handlePerformance('good')} className="p-4 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 font-semibold rounded-xl">Tốt</button>
                    <button onClick={() => handlePerformance('easy')} className="p-4 bg-green-500/20 hover:bg-green-500/40 text-green-300 font-semibold rounded-xl">Dễ</button>
                 </div>
            ) : (
                <div className="text-center h-[68px] flex items-center justify-center">
                    <p className="text-gray-400">Nhấn vào thẻ để xem đáp án.</p>
                </div>
            )}
        </div>
    );
};

export default Review;
