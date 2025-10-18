import React, { useState, useMemo, useCallback } from 'react';
import { useVocabulary, themeTranslationMap } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { VocabularyWord } from '../types';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useInspector } from '../hooks/useInspector';

const Flashcards: React.FC = () => {
    const { words, getAvailableThemes } = useVocabulary();
    const { targetLanguage, learningLanguage } = useSettings();
    const { openInspector } = useInspector();
    
    const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set(['all']));
    const availableThemes = getAvailableThemes();

    const filteredWords = useMemo(() => {
        if (selectedThemes.has('all')) return words;
        return words.filter(w => w.theme && selectedThemes.has(w.theme));
    }, [words, selectedThemes]);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(filteredWords.map(w => w.id)));
    const [deck, setDeck] = useState<VocabularyWord[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [direction, setDirection] = useState<'de_to_trans' | 'trans_to_de'>('de_to_trans');
    const [sessionActive, setSessionActive] = useState(false);
    const [isRandomMode, setIsRandomMode] = useState(false);
    
    // Resync selections when filter changes
    React.useEffect(() => {
      setSelectedIds(new Set(filteredWords.map(w => w.id)));
    }, [filteredWords]);
    
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

    const handleSelectAll = () => setSelectedIds(new Set(filteredWords.map(w => w.id)));
    const handleDeselectAll = () => setSelectedIds(new Set());

    const startSession = useCallback(() => {
        const selectedWords = words.filter(w => selectedIds.has(w.id));
        if (selectedWords.length === 0) return;
        
        const starredWords = selectedWords.filter(w => w.isStarred);
        const weightedDeck = [...selectedWords, ...starredWords]; // Starred words appear twice
        
        const shuffled = weightedDeck.sort(() => 0.5 - Math.random());
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

    const handleCardTextClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentCard) {
            openInspector(currentCard);
        }
    }


    const currentCard = sessionActive ? deck[currentIndex] : null;
    
    const languageNameMap = {
      german: 'tiếng Đức',
      english: 'tiếng Anh',
      chinese: 'tiếng Trung'
    };

    if (words.length === 0) {
        return (
            <div className="text-center py-10">
                <h2 className="text-2xl font-bold text-white">Thẻ ghi nhớ</h2>
                <p className="text-gray-400 mt-2">Thêm vài từ vào danh sách để bắt đầu luyện tập với thẻ ghi nhớ.</p>
            </div>
        );
    }
    
    if (sessionActive && currentCard) {
        const frontText = direction === 'de_to_trans' ? currentCard.word : currentCard.translation[targetLanguage];
        const backText = direction === 'de_to_trans' ? currentCard.translation[targetLanguage] : currentCard.word;

        return (
            <div className="space-y-6 flex flex-col items-center">
                 <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-white">Buổi học với thẻ ghi nhớ</h2>
                 </div>
                 {!isRandomMode && <p className="text-gray-400 -mt-4">Thẻ {currentIndex + 1} trên {deck.length}</p>}

                <div className="w-full max-w-md h-80 [perspective:1000px] group">
                    <div 
                        className={`relative w-full h-full [transform-style:preserve-3d] transition-transform duration-500 cursor-pointer ${isFlipped ? '[transform:rotateY(180deg)]' : ''} group-hover:scale-105 group-hover:-translate-y-2`}
                        onClick={() => setIsFlipped(!isFlipped)}
                    >
                        {/* Front of card */}
                        <div className="absolute w-full h-full [backface-visibility:hidden] flex flex-col items-center justify-center p-4 text-center bg-slate-800 rounded-2xl border border-slate-600">
                             {currentCard.imageUrl && <img src={currentCard.imageUrl} alt="" className="max-h-36 mb-4 rounded-lg object-contain" />}
                            <p className="text-3xl font-bold text-cyan-300 hover:underline" onClick={handleCardTextClick}>{frontText}</p>
                        </div>
                        {/* Back of card */}
                        <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col items-center justify-center p-4 text-center bg-indigo-800 rounded-2xl border border-indigo-600">
                             {currentCard.imageUrl && <img src={currentCard.imageUrl} alt="" className="max-h-36 mb-4 rounded-lg object-contain" />}
                             <p className="text-3xl font-bold text-white hover:underline" onClick={handleCardTextClick}>{backText}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-4 w-full max-w-md">
                    <button 
                        onClick={handlePrev}
                        disabled={isRandomMode || currentIndex === 0}
                        className="p-4 bg-slate-700/50 rounded-full hover:bg-slate-600/50 disabled:opacity-50 transition-transform duration-200 active:scale-90"
                        aria-label="Previous card"
                    >
                        <ArrowLeft className="w-6 h-6 text-white"/>
                    </button>
                    <button 
                        onClick={handleNext}
                        disabled={!isRandomMode && currentIndex === deck.length - 1}
                        className="p-4 bg-slate-700/50 rounded-full hover:bg-slate-600/50 disabled:opacity-50 transition-transform duration-200 active:scale-90"
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
                <h3 className="font-semibold text-white mb-2">1. Chọn chủ đề</h3>
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
                <h3 className="font-semibold text-white mb-2">2. Chọn từ ({selectedIds.size} / {filteredWords.length} đã chọn)</h3>
                <div className="flex gap-2 mb-2">
                    <button onClick={handleSelectAll} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg">Chọn tất cả</button>
                    <button onClick={handleDeselectAll} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg">Bỏ chọn tất cả</button>
                </div>
                <div className="max-h-[30vh] overflow-y-auto pr-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-3 space-y-2">
                    {filteredWords.map(word => (
                        <div key={word.id} onClick={() => handleToggleWord(word.id)} className="flex items-center p-2 rounded-xl hover:bg-slate-700/50 cursor-pointer">
                            <input type="checkbox" checked={selectedIds.has(word.id)} readOnly className="w-5 h-5 mr-3 bg-slate-900 border-slate-600 text-indigo-500 focus:ring-indigo-600 rounded-md pointer-events-none" />
                            <div>
                                <p className="font-medium text-white">{word.word}</p>
                                <p className="text-sm text-gray-400">{word.translation[targetLanguage]}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="font-semibold text-white mb-2">3. Chiều luyện tập</h3>
                <div className="flex gap-2">
                     <button onClick={() => setDirection('de_to_trans')} className={`flex-1 p-3 text-sm rounded-xl transition-colors ${direction === 'de_to_trans' ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>{languageNameMap[learningLanguage]} {'->'} Bản dịch</button>
                     <button onClick={() => setDirection('trans_to_de')} className={`flex-1 p-3 text-sm rounded-xl transition-colors ${direction === 'trans_to_de' ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>Bản dịch {'->'} {languageNameMap[learningLanguage]}</button>
                </div>
            </div>

            <div>
                <h3 className="font-semibold text-white mb-2">4. Chế độ luyện tập</h3>
                <div className="flex items-center justify-center gap-3 text-sm text-gray-300 bg-slate-800/50 border border-slate-700 rounded-xl p-3">
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

            <button onClick={startSession} disabled={selectedIds.size === 0} className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed">
                Bắt đầu buổi học
            </button>
        </div>
    );
};

export default Flashcards;