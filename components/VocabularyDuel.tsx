import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { Swords, ArrowLeft, Bot, User, Send, Loader2, Trophy, ShieldAlert, Brain, Scaling, Link as LinkIcon, Edit } from 'lucide-react';
import { validateDuelWord, getAiDuelWord } from '../services/geminiService';

const TURN_DURATION = 15; // 15 seconds per turn

interface VocabularyDuelProps {
    onBack: () => void;
}

type GameState = 'setup' | 'playing' | 'gameOver';
type GameMode = 'theme' | 'longest' | 'chain';
type Difficulty = 'easy' | 'medium' | 'hard' | 'hell';
type Turn = 'player' | 'ai';
type GameHistoryItem = { by: Turn, word: string };

const difficultySettings = {
    easy: { name: 'Dễ', thinkingTime: 500 },
    medium: { name: 'Trung bình', thinkingTime: 1000 },
    hard: { name: 'Khó', thinkingTime: 1500 },
    hell: { name: 'Địa ngục', thinkingTime: 2000 },
};

const VocabularyDuel: React.FC<VocabularyDuelProps> = ({ onBack }) => {
    const [gameState, setGameState] = useState<GameState>('setup');
    const [gameMode, setGameMode] = useState<GameMode>('theme');
    const [difficulty, setDifficulty] = useState<Difficulty>('medium');
    
    // Mode-specific settings
    const [theme, setTheme] = useState('any');
    const [rounds, setRounds] = useState(5);

    // Game state
    const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);
    const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
    const [turn, setTurn] = useState<Turn>('player');
    const [timeLeft, setTimeLeft] = useState(TURN_DURATION);
    const [gameOverReason, setGameOverReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [playerInput, setPlayerInput] = useState('');
    
    // Mode-specific game state
    const [playerScore, setPlayerScore] = useState(0);
    const [aiScore, setAiScore] = useState(0);
    const [currentRound, setCurrentRound] = useState(1);
    const [roundLetter, setRoundLetter] = useState('');
    const [lastWord, setLastWord] = useState('');

    const { getAvailableThemes } = useVocabulary();
    const { learningLanguage } = useSettings();
    const timerRef = useRef<number | null>(null);
    const gameHistoryRef = useRef<HTMLDivElement>(null);

    const availableThemes = useMemo(() => ['any', ...getAvailableThemes()], [getAvailableThemes]);
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');

    const stopTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const startTimer = () => {
        stopTimer();
        setTimeLeft(TURN_DURATION);
        timerRef.current = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    stopTimer();
                    if (gameMode === 'longest') {
                        setAiScore(s => s + 1); // Player ran out of time, AI gets a point
                        // Check if it's the last round
                        if (currentRound >= rounds) {
                            setGameState('gameOver');
                        } else {
                            // Move to next round
                            handleNextRound();
                        }
                    } else {
                        setGameOverReason(`Bạn đã hết thời gian!`);
                        setGameState('gameOver');
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => () => stopTimer(), []);
    useEffect(() => {
        if (gameHistoryRef.current) gameHistoryRef.current.scrollTop = gameHistoryRef.current.scrollHeight;
    }, [gameHistory, isProcessing]);

    const startGame = async () => {
        setGameHistory([]);
        setUsedWords(new Set());
        setTurn('player');
        setIsProcessing(false);
        setGameOverReason('');
        setPlayerScore(0);
        setAiScore(0);
        setCurrentRound(1);
        setLastWord('');
        setGameState('playing');

        if (gameMode === 'longest') {
            setRoundLetter(alphabet[Math.floor(Math.random() * alphabet.length)]);
            startTimer();
        } else if (gameMode === 'chain') {
            setIsProcessing(true);
            const { word } = await getAiDuelWord([], learningLanguage, difficulty, { mode: 'first', theme: 'any' });
            setLastWord(word);
            setGameHistory([{ by: 'ai', word }]);
            setUsedWords(new Set([word.toLowerCase()]));
            setIsProcessing(false);
            startTimer();
        } else { // theme
            startTimer();
        }
    };

    const handleNextRound = () => {
        setRoundLetter(alphabet[Math.floor(Math.random() * alphabet.length)]);
        setCurrentRound(r => r + 1);
        setTurn('player');
        setIsProcessing(false);
        startTimer();
    };

    const handlePlayerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const word = playerInput.trim().toLowerCase();
        if (!word || isProcessing || turn !== 'player') return;

        stopTimer();
        setIsProcessing(true);
        setPlayerInput('');
        
        const context = gameMode === 'theme' ? { mode: 'theme' as const, theme }
                      : gameMode === 'longest' ? { mode: 'longest' as const, startingLetter: roundLetter }
                      : { mode: 'chain' as const, lastWord };

        const { isValid, reason } = await validateDuelWord(word, Array.from(usedWords), learningLanguage, context);

        if (isValid) {
            setGameHistory(prev => [...prev, { by: 'player', word }]);
            setUsedWords(prev => new Set(prev).add(word));
            if (gameMode === 'theme' || gameMode === 'chain') {
                 setLastWord(word);
                 setTurn('ai');
            } else { // longest word mode
                setTurn('ai'); // AI will now find its word
            }
        } else {
            if (gameMode === 'longest') {
                setAiScore(s => s + 1);
                if (currentRound >= rounds) setGameState('gameOver');
                else handleNextRound();
            } else {
                setGameOverReason(reason || "Từ không hợp lệ.");
                setGameState('gameOver');
            }
        }
    };
    
    // AI Turn Logic
    useEffect(() => {
        if (turn === 'ai' && gameState === 'playing') {
            setIsProcessing(true);
            const thinkingTime = difficultySettings[difficulty].thinkingTime;
            
            setTimeout(async () => {
                const context = gameMode === 'theme' ? { mode: 'theme' as const, theme }
                              : gameMode === 'longest' ? { mode: 'longest' as const, startingLetter: roundLetter }
                              : { mode: 'chain' as const, lastWord };

                const { word: aiWord } = await getAiDuelWord(Array.from(usedWords), learningLanguage, difficulty, context);
                
                if (aiWord && !usedWords.has(aiWord.toLowerCase())) {
                    setGameHistory(prev => [...prev, { by: 'ai', word: aiWord }]);
                    setUsedWords(prev => new Set(prev).add(aiWord.toLowerCase()));

                    if (gameMode === 'longest') {
                        const playerWord = gameHistory[gameHistory.length - 1].word;
                        if (playerWord.length > aiWord.length) setPlayerScore(s => s + 1);
                        else if (aiWord.length > playerWord.length) setAiScore(s => s + 1);
                        // else it's a tie, no points

                        if (currentRound >= rounds) {
                            setGameState('gameOver');
                        } else {
                            handleNextRound();
                        }
                    } else { // theme or chain
                        setLastWord(aiWord);
                        setTurn('player');
                        setIsProcessing(false);
                        startTimer();
                    }
                } else {
                    if (gameMode === 'longest') {
                        setPlayerScore(s => s + 1); // AI failed, player gets point
                        if (currentRound >= rounds) setGameState('gameOver');
                        else handleNextRound();
                    } else {
                        setGameOverReason(aiWord ? "AI đã dùng từ bị lặp!" : "AI không thể nghĩ ra từ nào! Bạn thắng!");
                        setGameState('gameOver');
                    }
                }
            }, thinkingTime);
        }
    }, [turn, gameState, difficulty, theme, usedWords, learningLanguage, lastWord, roundLetter]);

    if (gameState === 'setup') {
        return (
             <div className="space-y-4 text-center animate-fade-in text-white">
                <h2 className="text-2xl font-bold">Đấu Từ vựng</h2>
                
                <div className="p-4 bg-slate-800/50 rounded-xl space-y-4">
                     <h3 className="font-semibold">Chọn chế độ chơi</h3>
                     <div className="flex justify-center p-1 bg-slate-700 rounded-full">
                        <button onClick={() => setGameMode('theme')} className={`flex-1 px-3 py-1.5 text-sm rounded-full flex items-center justify-center gap-2 ${gameMode === 'theme' ? 'bg-indigo-600' : ''}`}><Edit className="w-4 h-4"/> Chủ đề</button>
                        <button onClick={() => setGameMode('longest')} className={`flex-1 px-3 py-1.5 text-sm rounded-full flex items-center justify-center gap-2 ${gameMode === 'longest' ? 'bg-indigo-600' : ''}`}><Scaling className="w-4 h-4"/> Từ dài nhất</button>
                        <button onClick={() => setGameMode('chain')} className={`flex-1 px-3 py-1.5 text-sm rounded-full flex items-center justify-center gap-2 ${gameMode === 'chain' ? 'bg-indigo-600' : ''}`}><LinkIcon className="w-4 h-4"/> Nối từ</button>
                     </div>

                    {gameMode === 'theme' && (
                        <div>
                            <label className="text-sm text-gray-400 block mb-2">Chủ đề</label>
                            <select value={theme} onChange={e => setTheme(e.target.value)} className="w-full p-2 bg-slate-700 rounded-md">
                                {availableThemes.map(t => <option key={t} value={t}>{t === 'any' ? 'Chủ đề bất kỳ' : t}</option>)}
                            </select>
                        </div>
                    )}
                     {gameMode === 'longest' && (
                        <div>
                            <label className="text-sm text-gray-400 block mb-2">Số vòng</label>
                            <div className="flex justify-center gap-2">
                                {[5, 7, 10].map(r => <button key={r} onClick={() => setRounds(r)} className={`px-4 py-1 text-sm rounded-full ${rounds === r ? 'bg-indigo-600' : 'bg-slate-700'}`}>{r}</button>)}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-sm text-gray-400 block mb-2">Độ khó của AI</label>
                        <div className="flex justify-center gap-2">
                            {Object.keys(difficultySettings).map(d => (
                                <button key={d} onClick={() => setDifficulty(d as Difficulty)} className={`px-3 py-1 text-xs rounded-full ${difficulty === d ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                                    {difficultySettings[d as Difficulty].name}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button onClick={startGame} className="w-full py-2 bg-indigo-600 rounded-lg font-semibold">Bắt đầu</button>
                </div>
                <button onClick={onBack} className="text-sm text-indigo-400 hover:underline">Quay lại</button>
            </div>
        );
    }
    
    if (gameState === 'gameOver') {
        const playerWon = gameMode === 'longest' ? playerScore > aiScore : turn === 'ai';
        const isTie = gameMode === 'longest' && playerScore === aiScore;

        return (
             <div className="text-center py-10 space-y-4 flex flex-col items-center animate-fade-in text-white">
                {isTie ? <Swords className="w-16 h-16 text-gray-400" /> : playerWon ? <Trophy className="w-16 h-16 text-yellow-400" /> : <ShieldAlert className="w-16 h-16 text-red-400" />}
                <h2 className="text-3xl font-bold">{isTie ? "Hòa!" : playerWon ? 'Bạn đã thắng!' : 'Bạn đã thua!'}</h2>
                {gameMode === 'longest' && <p className="text-xl">Tỉ số: {playerScore} - {aiScore}</p>}
                <p className="text-gray-400">{gameOverReason}</p>
                <div className="flex gap-4">
                    <button onClick={onBack} className="px-6 py-3 bg-slate-600 hover:bg-slate-700 font-semibold rounded-xl">Chơi ván mới</button>
                    <button onClick={startGame} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 font-semibold rounded-xl">Chơi lại</button>
                </div>
            </div>
        );
    }

    const renderGameStatus = () => {
        if (gameMode === 'theme') return <p className="text-sm text-gray-400">Chủ đề: {theme === 'any' ? 'Bất kỳ' : theme}</p>;
        if (gameMode === 'longest') return <p className="text-sm text-gray-400">Vòng {currentRound}/{rounds} - Bắt đầu bằng chữ: <strong className="text-lg text-cyan-300 uppercase">{roundLetter}</strong></p>;
        if (gameMode === 'chain') return <p className="text-sm text-gray-400">Tiếp theo từ: <strong className="text-white">{lastWord}</strong></p>;
    }

    return (
        <div className="flex flex-col h-full max-h-[75vh] space-y-4 animate-fade-in text-white">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-xl font-bold">Đấu Từ vựng</h2>
                    {renderGameStatus()}
                </div>
                {gameMode === 'longest' && (
                    <div className="text-right">
                        <p className="font-bold">Tỉ số</p>
                        <p className="text-sm">Bạn: {playerScore} - AI: {aiScore}</p>
                    </div>
                )}
            </div>

            <div className="relative h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-cyan-400" style={{ width: `${(timeLeft / TURN_DURATION) * 100}%`, transition: turn === 'player' ? 'width 1s linear' : 'none' }} />
            </div>

            <div ref={gameHistoryRef} className="flex-grow p-4 bg-slate-800/50 rounded-xl overflow-y-auto space-y-4">
                {gameHistory.map((item, index) => (
                    <div key={index} className={`flex items-start gap-3 ${item.by === 'player' ? 'justify-end' : ''}`}>
                        {item.by === 'ai' && <div className="w-8 h-8 flex-shrink-0 bg-indigo-500 rounded-full flex items-center justify-center"><Bot className="w-5 h-5"/></div>}
                        <div className={`px-4 py-2 rounded-2xl max-w-xs break-words ${item.by === 'player' ? 'bg-slate-600 rounded-br-none' : 'bg-indigo-900/80 rounded-bl-none'}`}>
                            {item.word}
                        </div>
                        {item.by === 'player' && <div className="w-8 h-8 flex-shrink-0 bg-slate-500 rounded-full flex items-center justify-center"><User className="w-5 h-5"/></div>}
                    </div>
                ))}
                 {isProcessing && turn === 'ai' && (
                    <div className="flex items-start gap-3">
                         <div className="w-8 h-8 flex-shrink-0 bg-indigo-500 rounded-full flex items-center justify-center"><Bot className="w-5 h-5"/></div>
                         <div className="px-4 py-2 rounded-2xl bg-indigo-900/80 rounded-bl-none">
                            <Loader2 className="w-5 h-5 animate-spin" />
                         </div>
                    </div>
                 )}
            </div>

            <form onSubmit={handlePlayerSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={playerInput}
                    onChange={e => setPlayerInput(e.target.value)}
                    placeholder={turn === 'player' ? "Đến lượt bạn..." : "Lượt của AI..."}
                    disabled={turn !== 'player' || isProcessing}
                    className="flex-grow w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                />
                <button type="submit" disabled={turn !== 'player' || isProcessing || !playerInput} className="p-3 bg-indigo-600 rounded-full disabled:bg-indigo-400">
                    {isProcessing && turn === 'player' ? <Loader2 className="w-6 h-6 animate-spin"/> : <Send className="w-6 h-6"/>}
                </button>
            </form>
        </div>
    );
};

export default VocabularyDuel;