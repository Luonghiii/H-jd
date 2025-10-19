import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useVocabulary, themeTranslationMap } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { useHistory } from '../hooks/useHistory';
import { ArrowLeft, RefreshCw, ChevronDown } from 'lucide-react';

interface WordLinkProps {
  onBack: () => void;
}

type GameState = 'setup' | 'playing' | 'results';
type Item = { id: string; content: string; type: 'word' | 'translation' };

const PAIR_COUNTS = [5, 8, 10];

const WordLink: React.FC<WordLinkProps> = ({ onBack }) => {
    const { words, getAvailableThemes } = useVocabulary();
    const { targetLanguage, recordActivity } = useSettings();
    const { addHistoryEntry } = useHistory();
    
    const [gameState, setGameState] = useState<GameState>('setup');
    const [pairCount, setPairCount] = useState(8);

    const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set(['all']));
    const availableThemes = useMemo(() => getAvailableThemes(), [getAvailableThemes]);
    const themeFilteredWords = useMemo(() => {
        if (selectedThemes.has('all')) return words;
        return words.filter(w => w.theme && selectedThemes.has(w.theme));
    }, [words, selectedThemes]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(themeFilteredWords.map(w => w.id)));
     useEffect(() => {
        setSelectedIds(new Set(themeFilteredWords.map(w => w.id)));
    }, [themeFilteredWords]);
    const wordsForGame = useMemo(() => themeFilteredWords.filter(w => selectedIds.has(w.id)), [themeFilteredWords, selectedIds]);

    const [wordItems, setWordItems] = useState<Item[]>([]);
    const [translationItems, setTranslationItems] = useState<Item[]>([]);
    const [selectedWord, setSelectedWord] = useState<Item | null>(null);
    const [correctPairs, setCorrectPairs] = useState<string[]>([]);
    const [score, setScore] = useState(0);
    const [lastGameItems, setLastGameItems] = useState<{words: Item[], translations: Item[]} | null>(null);

    const startGame = useCallback((options?: { replay?: boolean }) => {
        if (options?.replay && lastGameItems) {
            setWordItems(lastGameItems.words);
            setTranslationItems(lastGameItems.translations);
        } else {
            const shuffledWords = [...wordsForGame].sort(() => 0.5 - Math.random());
            const selected = shuffledWords.slice(0, Math.min(pairCount, wordsForGame.length));
            
            const wordsCol = selected.map(w => ({ id: w.id, content: w.word, type: 'word' as const }));
            const translationsCol = selected.map(w => ({ id: w.id, content: w.translation[targetLanguage], type: 'translation' as const }));
    
            const newWordItems = wordsCol.sort(() => Math.random() - 0.5);
            const newTranslationItems = translationsCol.sort(() => Math.random() - 0.5);

            setWordItems(newWordItems);
            setTranslationItems(newTranslationItems);
            setLastGameItems({ words: newWordItems, translations: newTranslationItems });
        }
        
        setCorrectPairs([]);
        setSelectedWord(null);
        setScore(0);
        setGameState('playing');
    }, [wordsForGame, pairCount, targetLanguage, lastGameItems]);
    
    const handleItemClick = (item: Item) => {
        if (correctPairs.includes(item.id)) return;
        
        if (item.type === 'word') {
            setSelectedWord(item);
        } else if (item.type === 'translation' && selectedWord) {
            if (item.id === selectedWord.id) {
                // Correct match
                setCorrectPairs(prev => [...prev, item.id]);
                setScore(prev => prev + 1);
                setSelectedWord(null);
            } else {
                // Incorrect match - deselect
                setSelectedWord(null);
            }
        }
    };
    
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

    const handleToggleWord = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
            return newSet;
        });
    };
    const handleSelectAll = () => setSelectedIds(new Set(themeFilteredWords.map(w => w.id)));
    const handleDeselectAll = () => setSelectedIds(new Set());

    useEffect(() => {
        if (gameState === 'playing' && wordItems.length > 0 && correctPairs.length === wordItems.length) {
            addHistoryEntry('WORD_LINK_COMPLETED', `Hoàn thành game Nối từ với ${score} điểm.`);
            recordActivity();
            setGameState('results');
        }
    }, [correctPairs, wordItems.length, gameState, score, addHistoryEntry, recordActivity]);

    if (gameState === 'setup') {
        const isStartDisabled = wordsForGame.length < pairCount;
        return (
            <div className="space-y-6 animate-fade-in">
                 <div className="flex items-center justify-between">
                    <div className="text-center sm:text-left">
                        <h2 className="text-2xl font-bold text-white">Trò chơi Nối từ</h2>
                        <p className="text-gray-400 mt-1">Nối từ với nghĩa đúng của chúng.</p>
                    </div>
                    <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 text-gray-200 font-semibold rounded-xl transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Quay lại</span>
                    </button>
                </div>
                <details className="group bg-slate-800/50 border border-slate-700 rounded-2xl">
                    <summary className="list-none p-3 cursor-pointer flex justify-between items-center">
                        <h3 className="font-semibold text-white">1. Chọn chủ đề <span className="text-gray-400 font-normal text-sm">({selectedThemes.has('all') ? 'Tất cả' : `${selectedThemes.size} đã chọn`})</span></h3>
                        <ChevronDown className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="p-3 border-t border-slate-600">
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => handleThemeToggle('all')} className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedThemes.has('all') ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-700 hover:bg-slate-600'}`}>Tất cả ({words.length})</button>
                            {availableThemes.map(theme => <button key={theme} onClick={() => handleThemeToggle(theme)} className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedThemes.has(theme) ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-700 hover:bg-slate-600'}`}>{targetLanguage === 'english' ? (themeTranslationMap[theme] || theme) : theme} ({words.filter(w => w.theme === theme).length})</button>)}
                        </div>
                    </div>
                </details>
                <div>
                    <h3 className="font-semibold text-white mb-2">2. Chọn từ ({selectedIds.size} / {themeFilteredWords.length} đã chọn)</h3>
                    <div className="flex gap-2 mb-2">
                        <button onClick={handleSelectAll} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg">Chọn tất cả</button>
                        <button onClick={handleDeselectAll} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg">Bỏ chọn tất cả</button>
                    </div>
                    <div className="max-h-[20vh] overflow-y-auto pr-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-3 space-y-2">
                        {themeFilteredWords.map(word => (
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
                    <h3 className="font-semibold text-white mb-2">3. Số cặp từ</h3>
                    <div className="flex justify-center gap-2">
                        {PAIR_COUNTS.map(n => (
                            <button key={n} onClick={() => setPairCount(n)} className={`px-4 py-2 text-sm rounded-xl transition-colors ${pairCount === n ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                {n} cặp
                            </button>
                        ))}
                    </div>
                </div>
                <button onClick={() => startGame()} disabled={isStartDisabled} className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed">
                    Bắt đầu
                </button>
                {isStartDisabled && <p className="text-center text-sm text-amber-400">Không đủ từ. Cần ít nhất {pairCount} từ.</p>}
            </div>
        );
    }
    
    if (gameState === 'results') {
        return (
            <div className="text-center py-10 space-y-4 flex flex-col items-center animate-fade-in">
                <h2 className="text-3xl font-bold text-white">Hoàn thành!</h2>
                <p className="text-gray-400">Bạn đã nối đúng tất cả {score} cặp từ.</p>
                <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full max-w-md">
                    <button onClick={() => startGame({ replay: true })} className="flex-1 px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl">
                        Chơi lại
                    </button>
                    <button onClick={() => startGame()} className="flex-1 flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">
                        <RefreshCw className="w-5 h-5 mr-2" />
                        Tiếp tục
                    </button>
                </div>
                <button onClick={onBack} className="mt-4 text-sm text-indigo-400 hover:underline">
                    Chơi game khác
                </button>
            </div>
        );
    }

    const getItemClasses = (item: Item) => {
        if (correctPairs.includes(item.id)) {
            return 'bg-green-500/20 border-green-500 text-green-300 cursor-default';
        }
        if (selectedWord === item) {
            return 'bg-indigo-500/30 border-indigo-500 text-white ring-2 ring-indigo-400';
        }
        return 'bg-slate-800 border-slate-600 hover:bg-slate-700 hover:border-slate-500';
    };

    return (
        <div className="space-y-4 animate-fade-in">
             <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Nối các cặp từ</h2>
                <button onClick={() => setGameState('setup')} className="text-sm text-indigo-400 hover:underline">Thoát</button>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-8">
                <div className="space-y-3">
                    {wordItems.map(item => (
                        <button key={item.id} onClick={() => handleItemClick(item)} disabled={correctPairs.includes(item.id)} className={`w-full p-3 text-center text-white font-medium rounded-xl border transition-all duration-200 ${getItemClasses(item)}`}>
                            {item.content}
                        </button>
                    ))}
                </div>
                 <div className="space-y-3">
                    {translationItems.map(item => (
                        <button key={item.id} onClick={() => handleItemClick(item)} disabled={correctPairs.includes(item.id)} className={`w-full p-3 text-center text-white font-medium rounded-xl border transition-all duration-200 ${getItemClasses(item)}`}>
                            {item.content}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WordLink;
