import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useVocabulary, themeTranslationMap } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { useHistory } from '../hooks/useHistory';
import { VocabularyWord } from '../types';
import { generateSpeech } from '../services/geminiService';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { ArrowLeft, RefreshCw, Volume2, Check, X, Loader2, ChevronDown, Sparkles } from 'lucide-react';
import { useInspector } from '../hooks/useInspector';
import AiWordSelectorModal from './AiWordSelectorModal';

interface ListeningPracticeProps {
    onBack: () => void;
}

type GameState = 'setup' | 'playing' | 'results';

const ListeningPractice: React.FC<ListeningPracticeProps> = ({ onBack }) => {
    const { words, getAvailableThemes, updateWordSpeechAudio } = useVocabulary();
    const { learningLanguage, recordActivity, uiLanguage } = useSettings();
    const { openInspector } = useInspector();
    const { addHistoryEntry } = useHistory();
    const { play, isPlaying } = useAudioPlayer();

    const [gameState, setGameState] = useState<GameState>('setup');
    const [numWords, setNumWords] = useState(10);
    const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set(['all']));
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    
    const [practiceWords, setPracticeWords] = useState<VocabularyWord[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [results, setResults] = useState<{ word: VocabularyWord; isCorrect: boolean }[]>([]);
    const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
    const [isSpeechLoading, setIsSpeechLoading] = useState(false);

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


    const handlePlaySound = async () => {
        if (isPlaying || isSpeechLoading || !practiceWords[currentIndex]) return;

        const word = practiceWords[currentIndex];
        if (word.speechAudio) {
            await play(word.speechAudio);
            return;
        }

        setIsSpeechLoading(true);
        try {
            const audioB64 = await generateSpeech(word.word, learningLanguage);
            updateWordSpeechAudio(word.id, audioB64);
            await play(audioB64);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSpeechLoading(false);
        }
    };

    const startGame = useCallback(() => {
        const shuffled = [...wordsForGame].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, Math.min(numWords, wordsForGame.length));
        setPracticeWords(selected);
        setCurrentIndex(0);
        setResults([]);
        setUserAnswer('');
        setFeedback('idle');
        setGameState('playing');
    }, [wordsForGame, numWords]);
    
    useEffect(() => {
      if (gameState === 'playing' && practiceWords.length > 0) {
        handlePlaySound();
      }
    }, [gameState, currentIndex, practiceWords]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (feedback !== 'idle' || !userAnswer.trim()) return;

        const currentWord = practiceWords[currentIndex];
        const isCorrect = userAnswer.trim().toLowerCase() === currentWord.word.toLowerCase();
        
        setResults(prev => [...prev, { word: currentWord, isCorrect }]);
        setFeedback(isCorrect ? 'correct' : 'incorrect');

        setTimeout(() => {
            if (currentIndex < practiceWords.length - 1) {
                setCurrentIndex(prev => prev + 1);
                setUserAnswer('');
                setFeedback('idle');
            } else {
                addHistoryEntry('PRACTICE_SESSION_COMPLETED', `Hoàn thành luyện nghe ${practiceWords.length} từ.`);
                recordActivity();
                setGameState('results');
            }
        }, 1500);
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

    const handleAiSelect = (aiWords: VocabularyWord[]) => {
      const newIds = new Set(aiWords.map(w => w.id));
      setSelectedIds(newIds);
      setIsAiModalOpen(false);
    };

    if (gameState === 'setup') {
        return (
            <>
              <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-white">Luyện Nghe</h2>
                      <button onClick={onBack} className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 rounded-xl"><ArrowLeft className="w-4 h-4"/> Quay lại</button>
                  </div>

                  <div>
                      <h3 className="font-semibold text-white mb-2">Lựa chọn từ</h3>
                      <button 
                          onClick={() => setIsAiModalOpen(true)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600/20 text-indigo-300 border border-indigo-500/50 rounded-xl hover:bg-indigo-600/40"
                      >
                          <Sparkles className="w-5 h-5" />
                          Nhờ AI chọn giúp
                      </button>
                  </div>

                  <details className="group bg-slate-800/50 border border-slate-700 rounded-2xl">
                      <summary className="list-none p-3 cursor-pointer flex justify-between items-center">
                          <h3 className="font-semibold text-white">Hoặc, chọn thủ công...</h3>
                          <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180"/>
                      </summary>
                      <div className="p-3 border-t border-slate-600 space-y-4">
                        <div>
                            <h3 className="font-semibold text-white">1. Chọn chủ đề ({selectedThemes.has('all') ? 'Tất cả' : `${selectedThemes.size} đã chọn`})</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <button onClick={() => handleThemeToggle('all')} className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedThemes.has('all') ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-700 text-gray-200 hover:bg-slate-600'}`}>Tất cả ({words.length})</button>
                                {availableThemes.map(theme => <button key={theme} onClick={() => handleThemeToggle(theme)} className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedThemes.has(theme) ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-700 text-gray-200 hover:bg-slate-600'}`}>{themeTranslationMap[theme] || theme} ({words.filter(w => w.theme === theme).length})</button>)}
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold text-white mb-2">2. Chọn từ ({selectedIds.size} / {themeFilteredWords.length} đã chọn)</h3>
                            <div className="flex gap-2 mb-2">
                                <button onClick={handleSelectAll} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg text-gray-200">Chọn tất cả</button>
                                <button onClick={handleDeselectAll} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg text-gray-200">Bỏ chọn tất cả</button>
                            </div>
                            <div className="max-h-[20vh] overflow-y-auto pr-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-3 space-y-2">
                                {themeFilteredWords.map(word => (
                                <div key={word.id} onClick={() => handleToggleWord(word.id)} className="flex items-center p-2 rounded-xl hover:bg-slate-700/50 cursor-pointer transition-colors">
                                    <input type="checkbox" checked={selectedIds.has(word.id)} readOnly className="w-5 h-5 mr-3 bg-slate-900 border-slate-600 text-indigo-500 focus:ring-indigo-600 rounded-md pointer-events-none"/>
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
                      <h3 className="font-semibold text-white mb-2">3. Số từ</h3>
                      <input type="range" min="5" max={Math.max(5, wordsForGame.length)} value={numWords} onChange={e => setNumWords(Number(e.target.value))} className="w-full" />
                      <div className="text-center font-bold text-indigo-400">{numWords} từ</div>
                  </div>
                  <button onClick={startGame} disabled={wordsForGame.length < 1} className="w-full py-3 bg-indigo-600 rounded-xl font-semibold disabled:bg-indigo-400">Bắt đầu</button>
              </div>
              <AiWordSelectorModal 
                isOpen={isAiModalOpen}
                onClose={() => setIsAiModalOpen(false)}
                availableWords={themeFilteredWords}
                onConfirm={handleAiSelect}
              />
            </>
        );
    }
    
    if (gameState === 'results') {
        const correctCount = results.filter(r => r.isCorrect).length;
        return (
             <div className="space-y-6 text-center animate-fade-in">
                <h2 className="text-3xl font-bold text-white">Kết quả</h2>
                <p className="text-xl text-gray-300">Đúng: {correctCount} / {results.length}</p>
                <div className="flex gap-4">
                    <button onClick={onBack} className="px-6 py-3 bg-slate-600 rounded-xl">Game mới</button>
                    <button onClick={startGame} className="flex items-center px-6 py-3 bg-indigo-600 rounded-xl"><RefreshCw className="w-5 h-5 mr-2"/> Chơi lại</button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-white">Từ {currentIndex + 1} / {practiceWords.length}</h2>
                <button onClick={onBack} className="text-sm text-indigo-400 hover:underline">Thoát</button>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: `${((currentIndex + 1) / practiceWords.length) * 100}%` }}></div>
            </div>

            <div className="text-center">
                <button onClick={handlePlaySound} disabled={isPlaying || isSpeechLoading} className="p-6 bg-slate-700 rounded-full text-indigo-400 disabled:opacity-50">
                    {isSpeechLoading ? <Loader2 className="w-10 h-10 animate-spin"/> : <Volume2 className="w-10 h-10" />}
                </button>
                <p className="text-sm text-gray-400 mt-2">Nghe và gõ lại từ bạn nghe được</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="relative">
                    <input 
                        type="text" 
                        value={userAnswer}
                        onChange={e => setUserAnswer(e.target.value)}
                        className={`w-full px-4 py-3 text-center bg-slate-800 border rounded-xl text-white text-lg ${feedback === 'correct' ? 'border-green-500' : feedback === 'incorrect' ? 'border-red-500' : 'border-slate-600'}`}
                        placeholder="Gõ ở đây..."
                        autoFocus
                    />
                    {feedback === 'correct' && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-green-500" />}
                    {feedback === 'incorrect' && <X className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-red-500" />}
                </div>
                 {feedback === 'incorrect' && <p className="text-center text-green-400 mt-2">Đáp án đúng: <strong>{practiceWords[currentIndex].word}</strong></p>}
                 <button type="submit" className="w-full mt-4 py-3 bg-indigo-600 rounded-xl font-semibold" disabled={feedback !== 'idle'}>Kiểm tra</button>
            </form>
        </div>
    );
};

export default ListeningPractice;