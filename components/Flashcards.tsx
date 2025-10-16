import React, { useState, useMemo, useCallback } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { VocabularyWord } from '../types';
import { ArrowLeftRight, Check, X, Shuffle, ArrowLeft, ArrowRight } from 'lucide-react';

const Flashcards: React.FC = () => {
    const { words } = useVocabulary();
    const { targetLanguage } = useSettings();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(words.map(w => w.id)));
    const [deck, setDeck] = useState<VocabularyWord[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [direction, setDirection] = useState<'de_to_trans' | 'trans_to_de'>('de_to_trans');
    const [sessionActive, setSessionActive] = useState(false);
    const [isRandomMode, setIsRandomMode] = useState(false);

    const handleToggleWord = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => setSelectedIds(new Set(words.map(w => w.id)));
    const handleDeselectAll = () => setSelectedIds(new Set());

    const startSession = useCallback(() => {
        const selectedWords = words.filter(w => selectedIds.has(w.id));
        if (selectedWords.length === 0) return;
        
        const shuffled = [...selectedWords].sort(() => 0.5 - Math.random());
        setDeck(shuffled);
        setCurrentIndex(0);
        setIsFlipped(false);
        setSessionActive(true);
    }, [selectedIds, words]);

    const handleNext = () => {
        setIsFlipped(false);
        setTimeout(() => {
            if (isRandomMode) {
                if (deck.length <= 1) return;
                let newIndex;
                do {
                    newIndex = Math.floor(Math.random() * deck.length);
                } while (newIndex === currentIndex);
                setCurrentIndex(newIndex);
            } else {
                setCurrentIndex(p => Math.min(deck.length - 1, p + 1));
            }
        }, 150);
    };

    const handlePrev = () => {
        setIsFlipped(false);
        setTimeout(() => {
            if (!isRandomMode) {
                 setCurrentIndex(p => Math.max(0, p - 1));
            }
        }, 150);
    };


    const currentCard = sessionActive ? deck[currentIndex] : null;

    if (words.length === 0) {
        return (
            <div className="text-center py-10">
                <h2 className="text-2xl font-bold text-white">Thẻ ghi nhớ</h2>
                <p className="text-gray-400 mt-2">Thêm vài từ vào danh sách để bắt đầu luyện tập với thẻ ghi nhớ.</p>
            </div>
        );
    }
    
    if (sessionActive && currentCard) {
        const frontText = direction === 'de_to_trans' ? currentCard.german : currentCard.translation[targetLanguage];
        const backText = direction === 'de_to_trans' ? currentCard.translation[targetLanguage] : currentCard.german;

        return (
            <div className="space-y-6 flex flex-col items-center">
                 <h2 className="text-2xl font-bold text-white">Buổi học với thẻ ghi nhớ</h2>
                 {!isRandomMode && <p className="text-gray-400 -mt-4">Thẻ {currentIndex + 1} trên {deck.length}</p>}

                <div className="w-full max-w-md h-64 [perspective:1000px]">
                    <div 
                        className={`relative w-full h-full [transform-style:preserve-3d] transition-transform duration-500 cursor-pointer ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
                        onClick={() => setIsFlipped(!isFlipped)}
                    >
                        {/* Front of card */}
                        <div className="absolute w-full h-full [backface-visibility:hidden] flex items-center justify-center p-4 text-center bg-slate-800 rounded-xl border border-slate-600">
                            <p className="text-3xl font-bold text-cyan-300">{frontText}</p>
                        </div>
                        {/* Back of card */}
                        <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center p-4 text-center bg-indigo-800 rounded-xl border border-indigo-600">
                            <p className="text-3xl font-bold text-white">{backText}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-4 w-full max-w-md">
                    <button 
                        onClick={handlePrev}
                        disabled={isRandomMode || currentIndex === 0}
                        className="p-4 bg-slate-700/50 rounded-full hover:bg-slate-600/50 disabled:opacity-50 transition-colors"
                        aria-label="Previous card"
                    >
                        <ArrowLeft className="w-6 h-6 text-white"/>
                    </button>
                    <button 
                        onClick={handleNext}
                        disabled={!isRandomMode && currentIndex === deck.length - 1}
                        className="p-4 bg-slate-700/50 rounded-full hover:bg-slate-600/50 disabled:opacity-50 transition-colors"
                        aria-label="Next card"
                    >
                        <ArrowRight className="w-6 h-6 text-white"/>
                    </button>
                </div>

                <button onClick={() => setSessionActive(false)} className="mt-4 text-sm text-indigo-400 hover:underline">
                    Kết thúc & Chọn từ mới
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white">Thẻ ghi nhớ</h2>
                <p className="text-gray-400 mt-1">Chọn từ và cài đặt cho buổi luyện tập của bạn.</p>
            </div>
            
            <div>
                <h3 className="font-semibold text-white mb-2">1. Chọn từ ({selectedIds.size} đã chọn)</h3>
                <div className="flex gap-2 mb-2">
                    <button onClick={handleSelectAll} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded">Chọn tất cả</button>
                    <button onClick={handleDeselectAll} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded">Bỏ chọn tất cả</button>
                </div>
                <div className="max-h-[30vh] overflow-y-auto pr-2 bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-2">
                    {words.map(word => (
                        <div key={word.id} onClick={() => handleToggleWord(word.id)} className="flex items-center p-2 rounded-md hover:bg-slate-700/50 cursor-pointer">
                            <input type="checkbox" checked={selectedIds.has(word.id)} readOnly className="w-5 h-5 mr-3 bg-slate-900 border-slate-600 text-indigo-500 focus:ring-indigo-600 rounded pointer-events-none" />
                            <div>
                                <p className="font-medium text-white">{word.german}</p>
                                <p className="text-sm text-gray-400">{word.translation[targetLanguage]}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="font-semibold text-white mb-2">2. Chiều luyện tập</h3>
                <div className="flex gap-2">
                     <button onClick={() => setDirection('de_to_trans')} className={`flex-1 p-3 text-sm rounded-md transition-colors ${direction === 'de_to_trans' ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>Tiếng Đức {'->'} Bản dịch</button>
                     <button onClick={() => setDirection('trans_to_de')} className={`flex-1 p-3 text-sm rounded-md transition-colors ${direction === 'trans_to_de' ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>Bản dịch {'->'} Tiếng Đức</button>
                </div>
            </div>

            <div>
                <h3 className="font-semibold text-white mb-2">3. Chế độ luyện tập</h3>
                <div className="flex items-center justify-center gap-3 text-sm text-gray-300 bg-slate-800/50 border border-slate-700 rounded-lg p-3">
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

            <button onClick={startSession} disabled={selectedIds.size === 0} className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition duration-300 disabled:bg-indigo-400 disabled:cursor-not-allowed">
                Bắt đầu buổi học
            </button>
        </div>
    );
};

export default Flashcards;