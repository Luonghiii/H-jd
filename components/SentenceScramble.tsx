import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useVocabulary, themeTranslationMap } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { useHistory } from '../hooks/useHistory';
import { generateScrambledSentence } from '../services/geminiService';
import { ArrowLeft, CheckCircle, RefreshCw, Wand2, ChevronDown } from 'lucide-react';
import { VocabularyWord } from '../types';
import { useInspector } from '../hooks/useInspector';

interface SentenceScrambleProps {
  onBack: () => void;
}

type GameState = 'setup' | 'loading' | 'playing' | 'correct';

const SentenceScramble: React.FC<SentenceScrambleProps> = ({ onBack }) => {
    const { words, getAvailableThemes } = useVocabulary();
    // FIX: Replaced 'targetLanguage' with 'uiLanguage' from settings and aliased for compatibility.
    const { learningLanguage, uiLanguage: targetLanguage, recordActivity } = useSettings();
    const { addHistoryEntry } = useHistory();
    const { openInspector } = useInspector();
    const [gameState, setGameState] = useState<GameState>('setup');
    const [originalSentence, setOriginalSentence] = useState('');
    const [scrambledWords, setScrambledWords] = useState<string[]>([]);
    const [userSentence, setUserSentence] = useState<string[]>([]);
    const [triggerWord, setTriggerWord] = useState<VocabularyWord | null>(null);

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
    
    const generateNewSentence = useCallback(async () => {
        setGameState('loading');
        setUserSentence([]);
        setScrambledWords([]);
        setOriginalSentence('');
        setTriggerWord(null);

        if (wordsForGame.length === 0) {
            alert('Không có từ nào được chọn. Vui lòng chọn ít nhất một từ.');
            setGameState('setup');
            return;
        }
        
        const randomWord = wordsForGame[Math.floor(Math.random() * wordsForGame.length)];
        setTriggerWord(randomWord);
        
        try {
            const sentence = await generateScrambledSentence(randomWord, learningLanguage);
            setOriginalSentence(sentence);
            // Simple punctuation split
            const words = sentence.replace(/[,.]/g, ' $&').split(/\s+/).filter(Boolean);
            setScrambledWords([...words].sort(() => Math.random() - 0.5));
            setGameState('playing');
        } catch (error) {
            console.error("Failed to generate sentence:", error);
            alert("Không thể tạo câu. Vui lòng thử lại.");
            setGameState('setup');
        }
    }, [wordsForGame, learningLanguage]);

    const handleWordBankClick = (word: string, index: number) => {
        setUserSentence(prev => [...prev, word]);
        setScrambledWords(prev => prev.filter((_, i) => i !== index));
    };

    const handleUserSentenceClick = (word: string, index: number) => {
        setScrambledWords(prev => [...prev, word]);
        setUserSentence(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        if (gameState !== 'playing' || scrambledWords.length > 0) return;

        const userString = userSentence.join(' ').replace(/\s+([,.])/g, '$1');
        if (userString === originalSentence) {
            setGameState('correct');
            addHistoryEntry('SENTENCE_SCRAMBLE_WON', `Sắp xếp đúng câu: "${originalSentence}"`);
            recordActivity();
        }
    }, [userSentence, scrambledWords, originalSentence, gameState, addHistoryEntry, recordActivity]);
    
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

    if (gameState === 'setup') {
        const isStartDisabled = wordsForGame.length === 0;
        return (
             <div className="space-y-6 animate-fade-in">
                 <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Sắp xếp câu</h2>
                    <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 text-gray-200 font-semibold rounded-xl transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Quay lại</span>
                    </button>
                </div>
                <p className="text-gray-400 text-center">Chọn từ để AI tạo câu cho bạn sắp xếp.</p>
                
                <details className="group bg-slate-800/50 border border-slate-700 rounded-2xl">
                    <summary className="list-none p-3 cursor-pointer flex justify-between items-center">
                        <h3 className="font-semibold text-white">1. Chọn chủ đề <span className="text-gray-400 font-normal text-sm">({selectedThemes.has('all') ? 'Tất cả' : `${selectedThemes.size} đã chọn`})</span></h3>
                        <ChevronDown className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="p-3 border-t border-slate-600">
                        <div className="flex flex-wrap gap-2 justify-center">
                            <button onClick={() => handleThemeToggle('all')} className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedThemes.has('all') ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-700 hover:bg-slate-600'}`}>{`Tất cả (${words.length})`}</button>
                            {availableThemes.map(theme => (
                              <button key={theme} onClick={() => handleThemeToggle(theme)} className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedThemes.has(theme) ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                {targetLanguage === 'english' ? (themeTranslationMap[theme] || theme) : theme} ({words.filter(w => w.theme === theme).length})
                              </button>
                            ))}
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
                        <div key={word.id} onClick={() => handleToggleWord(word.id)} className="flex items-center p-2 rounded-xl hover:bg-slate-700/50 cursor-pointer transition-colors">
                            <input 
                            type="checkbox" 
                            checked={selectedIds.has(word.id)}
                            readOnly
                            className="w-5 h-5 mr-3 bg-slate-900 border-slate-600 text-indigo-500 focus:ring-indigo-600 rounded-md pointer-events-none"
                            />
                            <div>
                                <p className="font-medium text-white hover:underline" onClick={(e) => { e.stopPropagation(); openInspector(word); }}>{word.word}</p>
                                <p className="text-sm text-gray-400">{word.translation[targetLanguage]}</p>
                            </div>
                        </div>
                        ))}
                    </div>
                </div>
                
                <button onClick={generateNewSentence} disabled={isStartDisabled} className="w-full max-w-xs mx-auto flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed">
                    Bắt đầu
                </button>
                {isStartDisabled && <p className="text-center text-sm text-amber-400">Bạn cần có ít nhất một từ để chơi.</p>}
            </div>
        );
    }
    
    if (gameState === 'loading') {
        return <div className="text-center py-10"><Wand2 className="w-10 h-10 mx-auto animate-pulse text-indigo-400" /><p className="mt-2">AI đang tạo câu...</p></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">Sắp xếp lại câu sau:</h2>
                <button onClick={() => setGameState('setup')} className="text-sm text-indigo-400 hover:underline">Thoát</button>
            </div>

            <div className="min-h-[6rem] bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex flex-wrap items-center gap-2">
                {userSentence.map((word, i) => (
                    <button key={i} onClick={() => handleUserSentenceClick(word, i)} className="px-3 py-2 bg-slate-600 rounded-lg text-lg font-medium">
                        {word}
                    </button>
                ))}
            </div>

            <div className="min-h-[6rem] p-3 flex flex-wrap items-center justify-center gap-2">
                 {scrambledWords.map((word, i) => (
                    <button key={i} onClick={() => handleWordBankClick(word, i)} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-lg font-medium transition-transform active:scale-95">
                        {word}
                    </button>
                ))}
            </div>
            
            {gameState === 'correct' && (
                <div className="text-center p-4 space-y-3 bg-green-500/10 rounded-xl animate-fade-in">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-400" />
                    <h3 className="text-xl font-bold text-white">Chính xác!</h3>
                    {triggerWord && (
                        <p className="text-gray-300">
                            Câu này được tạo từ từ: 
                            <strong 
                                className="text-cyan-300 cursor-pointer hover:underline ml-1"
                                onClick={() => openInspector(triggerWord)}
                            >
                                {triggerWord.word}
                            </strong>
                        </p>
                    )}
                     <button onClick={generateNewSentence} className="flex items-center justify-center mx-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">
                        <RefreshCw className="w-5 h-5 mr-2" />
                        Câu tiếp theo
                    </button>
                </div>
            )}
        </div>
    );
};

export default SentenceScramble;
