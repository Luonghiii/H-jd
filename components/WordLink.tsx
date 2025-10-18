import React, { useState, useMemo, useCallback } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { useHistory } from '../hooks/useHistory';
import { ArrowLeft, RefreshCw } from 'lucide-react';

interface WordLinkProps {
  onBack: () => void;
}

type GameState = 'setup' | 'playing' | 'results';
type Item = { id: string; content: string; type: 'word' | 'translation' };

const PAIR_COUNTS = [5, 8, 10];

const WordLink: React.FC<WordLinkProps> = ({ onBack }) => {
    const { words } = useVocabulary();
    const { targetLanguage } = useSettings();
    const { addHistoryEntry } = useHistory();
    
    const [gameState, setGameState] = useState<GameState>('setup');
    const [pairCount, setPairCount] = useState(8);
    const [wordItems, setWordItems] = useState<Item[]>([]);
    const [translationItems, setTranslationItems] = useState<Item[]>([]);
    const [selectedWord, setSelectedWord] = useState<Item | null>(null);
    const [correctPairs, setCorrectPairs] = useState<string[]>([]);
    const [incorrectPair, setIncorrectPair] = useState<[string, string] | null>(null);
    const [score, setScore] = useState(0);

    const startGame = useCallback(() => {
        const shuffledWords = [...words].sort(() => 0.5 - Math.random());
        const selected = shuffledWords.slice(0, Math.min(pairCount, words.length));
        
        const wordsCol = selected.map(w => ({ id: w.id, content: w.word, type: 'word' as const }));
        const translationsCol = selected.map(w => ({ id: w.id, content: w.translation[targetLanguage], type: 'translation' as const }));

        setWordItems(wordsCol.sort(() => Math.random() - 0.5));
        setTranslationItems(translationsCol.sort(() => Math.random() - 0.5));
        
        setCorrectPairs([]);
        setSelectedWord(null);
        setIncorrectPair(null);
        setScore(0);
        setGameState('playing');
    }, [words, pairCount, targetLanguage]);
    
    const handleItemClick = (item: Item) => {
        if (correctPairs.includes(item.id)) return;
        
        if (item.type === 'word') {
            setSelectedWord(item);
            setIncorrectPair(null);
        } else if (item.type === 'translation' && selectedWord) {
            if (item.id === selectedWord.id) {
                // Correct match
                setCorrectPairs(prev => [...prev, item.id]);
                setScore(prev => prev + 1);
                setSelectedWord(null);
                setIncorrectPair(null);
            } else {
                // Incorrect match
                setIncorrectPair([selectedWord.id, item.id]);
                setSelectedWord(null);
            }
        }
    };

    if (correctPairs.length === wordItems.length && wordItems.length > 0 && gameState === 'playing') {
        addHistoryEntry('WORD_LINK_COMPLETED', `Hoàn thành game Nối từ với ${score} điểm.`);
        setGameState('results');
    }

    if (gameState === 'setup') {
        return (
            <div className="space-y-6 animate-fade-in text-center">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Nối từ</h2>
                    <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 text-gray-200 font-semibold rounded-xl transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Quay lại</span>
                    </button>
                </div>
                <p className="text-gray-400">Nối từ với nghĩa đúng của chúng. Chọn một từ rồi chọn nghĩa tương ứng.</p>
                <div>
                    <h3 className="font-semibold text-white mb-2">Số cặp từ</h3>
                    <div className="flex justify-center gap-2">
                        {PAIR_COUNTS.map(n => (
                            <button key={n} onClick={() => setPairCount(n)} className={`px-4 py-2 text-sm rounded-xl transition-colors ${pairCount === n ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                {n} cặp
                            </button>
                        ))}
                    </div>
                </div>
                <button onClick={startGame} disabled={words.length < pairCount} className="w-full max-w-xs mx-auto flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed">
                    Bắt đầu
                </button>
                {words.length < pairCount && <p className="text-center text-sm text-amber-400">Không đủ từ. Cần ít nhất {pairCount} từ.</p>}
            </div>
        );
    }
    
    if (gameState === 'results') {
        return (
            <div className="text-center py-10 space-y-4 flex flex-col items-center animate-fade-in">
                <h2 className="text-3xl font-bold text-white">Hoàn thành!</h2>
                <p className="text-gray-400">Bạn đã nối đúng tất cả {score} cặp từ.</p>
                <div className="flex gap-4 pt-4">
                    <button onClick={onBack} className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl">Chơi game khác</button>
                    <button onClick={startGame} className="flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">
                        <RefreshCw className="w-5 h-5 mr-2" /> Chơi lại
                    </button>
                </div>
            </div>
        );
    }

    const getItemClasses = (item: Item) => {
        if (correctPairs.includes(item.id)) {
            return 'bg-green-500/20 border-green-500 text-green-300 cursor-default';
        }
        if (selectedWord?.id === item.id) {
            return 'bg-indigo-500/30 border-indigo-500 text-white ring-2 ring-indigo-400';
        }
        if (incorrectPair?.includes(item.id)) {
            return 'bg-red-500/20 border-red-500 text-red-300 animate-shake';
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
