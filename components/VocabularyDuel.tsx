

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { Swords, ArrowLeft, Bot, User, Send, Loader2, Trophy, ShieldAlert, Users, Plus, Key, Brain, Link as LinkIcon, LogOut, XCircle } from 'lucide-react';
import { validateDuelWord, getAiDuelWord } from '../services/geminiService';
import { useHistory } from '../hooks/useHistory';
import { GameRoom, GameRoomPlayer, GameMode } from '../types';
import { useAuth } from '../hooks/useAuth';
import { createGameRoom, getGameRoomByCode, joinGameRoom, onGameRoomSnapshot, updateGameRoom, findPublicGameRoom, leaveGameRoom } from '../services/firestoreService';
import eventBus from '../utils/eventBus';

const TURN_DURATION = 15; // 15 seconds per turn

const TurnTimer: React.FC<{ timeLeft: number; duration: number }> = ({ timeLeft, duration }) => {
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const progress = timeLeft / duration;
    const offset = circumference - progress * circumference;

    const getColor = () => {
        if (progress > 0.5) return 'stroke-green-400';
        if (progress > 0.2) return 'stroke-yellow-400';
        return 'stroke-red-500';
    };

    return (
        <div className="relative w-12 h-12">
            <svg className="w-full h-full" viewBox="0 0 44 44">
                <circle
                    className="stroke-slate-600"
                    cx="22"
                    cy="22"
                    r={radius}
                    strokeWidth="3"
                    fill="transparent"
                />
                <circle
                    className={`transition-all duration-300 ${getColor()}`}
                    cx="22"
                    cy="22"
                    r={radius}
                    strokeWidth="3"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform="rotate(-90 22 22)"
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-bold text-lg">
                {timeLeft}
            </span>
        </div>
    );
};


interface VocabularyDuelProps {
    onBack: () => void;
}

type View = 'setup' | 'lobby' | 'playing' | 'ai_game_setup' | 'ai_game';
type Difficulty = 'easy' | 'medium' | 'hard' | 'hell';

const difficultySettings = {
    easy: { name: 'Dễ', thinkingTime: 500 },
    medium: { name: 'Trung bình', thinkingTime: 1000 },
    hard: { name: 'Khó', thinkingTime: 1500 },
    hell: { name: 'Địa ngục', thinkingTime: 2000 },
};

const GameModeSelector: React.FC<{
    selectedGameMode: GameMode;
    onGameModeChange: (mode: GameMode) => void;
    selectedTheme: string;
    onThemeChange: (theme: string) => void;
    targetScore: number;
    onTargetScoreChange: (score: number) => void;
}> = ({ selectedGameMode, onGameModeChange, selectedTheme, onThemeChange, targetScore, onTargetScoreChange }) => {
    const gameModes: { id: GameMode; label: string; icon: React.ElementType }[] = [
        { id: 'theme', label: 'Theo Chủ đề', icon: Brain },
        { id: 'longest', label: 'Từ Dài Nhất', icon: Trophy },
        { id: 'chain', label: 'Nối Từ', icon: LinkIcon },
    ];

    return (
        <div className="space-y-4 text-left">
            <div>
                <h3 className="font-semibold text-lg text-white mb-2">Chế độ chơi</h3>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900/50 rounded-xl">
                    {gameModes.map(mode => (
                        <button
                            key={mode.id}
                            type="button"
                            onClick={() => onGameModeChange(mode.id)}
                            className={`flex flex-col items-center p-2 rounded-lg transition-colors duration-200 ${selectedGameMode === mode.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700'}`}
                        >
                            <mode.icon className="w-6 h-6 mb-1" />
                            <span className="text-xs font-semibold">{mode.label}</span>
                        </button>
                    ))}
                </div>
            </div>
            {selectedGameMode === 'theme' && (
                <div className="animate-fade-in">
                    <h3 className="font-semibold text-lg text-white mb-2">Chủ đề</h3>
                    <input
                        type="text"
                        value={selectedTheme}
                        onChange={e => onThemeChange(e.target.value)}
                        placeholder="Nhập chủ đề (hoặc để trống)"
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            )}
            {selectedGameMode === 'longest' && (
                 <div className="animate-fade-in">
                    <h3 className="font-semibold text-lg text-white mb-2">Điểm mục tiêu</h3>
                     <div className="grid grid-cols-3 gap-2">
                         {[50, 100, 150].map(score => (
                             <button
                                 key={score}
                                 type="button"
                                 onClick={() => onTargetScoreChange(score)}
                                 className={`p-2 rounded-lg font-semibold ${targetScore === score ? 'bg-indigo-600' : 'bg-slate-700'}`}
                             >{score} điểm</button>
                         ))}
                     </div>
                </div>
            )}
        </div>
    );
};


const VocabularyDuel: React.FC<VocabularyDuelProps> = ({ onBack }) => {
    const { currentUser } = useAuth();
    const { profile, learningLanguage, recordActivity, addXp, incrementDuelWins } = useSettings();
    const { addHistoryEntry } = useHistory();

    const [view, setView] = useState<View>('setup');
    
    // Setup State
    const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('theme');
    const [selectedTheme, setSelectedTheme] = useState('');
    const [targetScore, setTargetScore] = useState(100);
    
    // Multiplayer State
    const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
    const [joinCodeInput, setJoinCodeInput] = useState('');
    const [isFindingMatch, setIsFindingMatch] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    
    // AI Game State
    const [aiDifficulty, setAiDifficulty] = useState<Difficulty>('medium');
    const [aiGameHistory, setAiGameHistory] = useState<any[]>([]);
    const [playerInput, setPlayerInput] = useState('');
    const [isPlayerTurn, setIsPlayerTurn] = useState(true);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [aiGameOverReason, setAiGameOverReason] = useState('');
    const [aiGameMode, setAiGameMode] = useState<GameMode>('theme');
    const [aiGameSettings, setAiGameSettings] = useState<{ theme?: string; targetScore?: number }>({ theme: 'any', targetScore: 100 });
    const [aiScores, setAiScores] = useState({ player: 0, ai: 0 });
    const [currentLetter, setCurrentLetter] = useState('');
    const aiWordPromiseRef = useRef<Promise<{word: string}>>();


    const gameOverReasonRef = useRef(aiGameOverReason);

    // Universal Timer State
    const [timeLeft, setTimeLeft] = useState(TURN_DURATION);
    const timerRef = useRef<number | null>(null);
    const turnTimeoutRef = useRef<number | null>(null);

    const stopTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        if(turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
        turnTimeoutRef.current = null;
    }, []);

    const startTimer = useCallback((onTimeout: () => void) => {
        stopTimer();
        setTimeLeft(TURN_DURATION);
        timerRef.current = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    stopTimer();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        turnTimeoutRef.current = window.setTimeout(onTimeout, TURN_DURATION * 1000);
    }, [stopTimer]);
    
    const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const getRandomLetter = () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)];

    const processAITurn = useCallback(async () => {
        const playerWord = playerInput.trim().toLowerCase();
        let aiWord = '';
        if (aiWordPromiseRef.current) {
            aiWord = (await aiWordPromiseRef.current).word;
        }

        const usedWords = aiGameHistory.map(h => h.word).filter(Boolean);
        const context = { mode: 'longest' as GameMode, startLetter: currentLetter };

        const [playerResult, aiResult] = await Promise.all([
            playerWord ? validateDuelWord(playerWord, usedWords, learningLanguage, context) : Promise.resolve({isValid: false, reason: "Không nhập từ."}),
            aiWord ? validateDuelWord(aiWord, [...usedWords, playerWord], learningLanguage, context) : Promise.resolve({isValid: false, reason: "Không tìm thấy từ."})
        ]);
        
        const playerTurnScore = playerResult.isValid ? playerWord.length : 0;
        const aiTurnScore = aiResult.isValid ? aiWord.length : 0;

        const newPlayerScore = aiScores.player + playerTurnScore;
        const newAiScore = aiScores.ai + aiTurnScore;
        
        setAiGameHistory(prev => [...prev, {
            by: 'turn', letter: currentLetter, turn: prev.length + 1,
            player: { word: playerWord, score: playerTurnScore, valid: playerResult.isValid },
            ai: { word: aiWord, score: aiTurnScore, valid: aiResult.isValid }
        }]);

        setAiScores({ player: newPlayerScore, ai: newAiScore });

        const target = aiGameSettings.targetScore || 100;
        if (newPlayerScore >= target && newAiScore >= target) {
            setAiGameOverReason(newPlayerScore > newAiScore ? `Bạn thắng sát sao ${newPlayerScore}-${newAiScore}!` : newPlayerScore < newAiScore ? `AI thắng sát sao ${newAiScore}-${newPlayerScore}!` : 'Hòa!');
        } else if (newPlayerScore >= target) {
            setAiGameOverReason(`Bạn thắng với ${newPlayerScore} điểm!`);
        } else if (newAiScore >= target) {
            setAiGameOverReason(`AI thắng với ${newAiScore} điểm!`);
        } else {
            startNewAITurn();
        }
    }, [playerInput, aiGameHistory, currentLetter, learningLanguage, aiScores, aiGameSettings.targetScore]);

    const startNewAITurn = useCallback(() => {
        stopTimer();
        const letter = getRandomLetter();
        setCurrentLetter(letter);
        setPlayerInput('');
        startTimer(processAITurn);
        
        const usedWords = aiGameHistory.map(h => h.word).filter(Boolean);
        aiWordPromiseRef.current = getAiDuelWord(usedWords, learningLanguage, aiDifficulty, { mode: 'longest', startLetter: letter });

    }, [stopTimer, startTimer, processAITurn, aiGameHistory, learningLanguage, aiDifficulty]);

    const handleStartAiGame = useCallback(async () => {
        setAiGameMode(selectedGameMode);
        setAiGameSettings({ 
            theme: selectedGameMode === 'theme' ? (selectedTheme.trim() || 'any') : undefined,
            targetScore: selectedGameMode === 'longest' ? targetScore : undefined,
        });
        
        setAiGameHistory([]);
        setPlayerInput('');
        setIsPlayerTurn(true);
        setIsAiThinking(false);
        setAiGameOverReason('');
        setAiScores({ player: 0, ai: 0 });
        setView('ai_game');
        
        if (selectedGameMode === 'longest') {
            startNewAITurn();
        } else {
            // For turn-based modes, start the timer for the player's first turn.
            startTimer(() => {
                setAiGameOverReason('Hết giờ! AI thắng!');
            });
        }

    }, [selectedGameMode, selectedTheme, targetScore, startNewAITurn, startTimer]);
    
    const handlePlayerSubmit_AI = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (aiGameMode === 'longest') {
            // For 'longest' mode, submission is handled by the timer.
            // We just give feedback that the word is acknowledged.
            eventBus.dispatch('notification', { type: 'info', message: `Đã ghi nhận từ: "${playerInput.trim()}"` });
            return;
        }

        const word = playerInput.trim().toLowerCase();
        if (!word || isSubmitting || !isPlayerTurn) return;

        stopTimer();
        setIsSubmitting(true);
        setIsPlayerTurn(false);

        try {
            const usedWords = aiGameHistory.map(h => h.word).filter(Boolean);
            const context = {
                mode: aiGameMode,
                theme: aiGameSettings.theme,
                lastWord: aiGameHistory.length > 0 ? aiGameHistory[aiGameHistory.length - 1].word : undefined
            };

            const playerValidation = await validateDuelWord(word, usedWords, learningLanguage, context);
            const newPlayerHistoryEntry = { by: 'player', word };

            if (playerValidation.isValid) {
                const newHistoryWithPlayerWord = [...aiGameHistory, newPlayerHistoryEntry];
                setAiGameHistory(newHistoryWithPlayerWord);
                setPlayerInput('');
                
                setIsAiThinking(true);
                const aiResponse = await getAiDuelWord(newHistoryWithPlayerWord.map(h => h.word), learningLanguage, aiDifficulty, {
                    ...context,
                    lastWord: word
                });
                setIsAiThinking(false);
                
                const aiWord = aiResponse.word.trim().toLowerCase();

                if (aiWord) {
                    const aiValidation = await validateDuelWord(aiWord, newHistoryWithPlayerWord.map(h => h.word), learningLanguage, {
                        ...context,
                        lastWord: word
                    });

                    if (aiValidation.isValid) {
                        setAiGameHistory(prev => [...prev, { by: 'ai', word: aiWord }]);
                        setIsPlayerTurn(true);
                        startTimer(() => {
                            setAiGameOverReason('Hết giờ! AI thắng!');
                        });
                    } else {
                        setAiGameHistory(prev => [...prev, { by: 'ai', word: `${aiWord} (không hợp lệ)` }]);
                        setAiGameOverReason(`AI dùng từ không hợp lệ. Bạn thắng!`);
                    }
                } else {
                     setAiGameOverReason('AI không tìm được từ. Bạn thắng!');
                }
            } else {
                setAiGameHistory(prev => [...prev, newPlayerHistoryEntry]);
                setAiGameOverReason(playerValidation.reason || "Từ không hợp lệ. Bạn thua!");
            }

        } catch (err) {
            eventBus.dispatch('notification', { type: 'error', message: 'Lỗi khi kiểm tra từ.' });
            setIsPlayerTurn(true); // Give turn back to player on error
        } finally {
            setIsSubmitting(false);
        }
    }, [aiGameMode, playerInput, isSubmitting, isPlayerTurn, stopTimer, aiGameHistory, aiGameSettings.theme, learningLanguage, aiDifficulty, startTimer]);


    // Multiplayer Snapshot Listener
    useEffect(() => {
        if (!gameRoom?.id || !currentUser) return;

        const unsubscribe = onGameRoomSnapshot(gameRoom.id, (room) => {
            if (room) {
                 if (room.status === 'playing' && room.players.length < 2) {
                    updateGameRoom(room.id, {
                        status: 'finished',
                        'gameState.winnerUid': currentUser.uid,
                        'gameState.gameOverReason': 'Đối thủ đã thoát trận.'
                    });
                    return;
                }

                if (room.playerUids.includes(currentUser.uid)) {
                     if (view !== 'playing' && room.status !== 'finished') {
                        setView('lobby');
                    }
                    setIsJoining(false);
                }
                setGameRoom(room);
            } else {
                eventBus.dispatch('notification', { type: 'info', message: 'Phòng chơi đã bị hủy hoặc không tồn tại.' });
                setGameRoom(null);
                setView('setup');
                setIsJoining(false);
            }
        });

        return () => unsubscribe();
    }, [gameRoom?.id, currentUser, view]);
    
    // Multiplayer Timer and Turn Processing (HOST ONLY)
    useEffect(() => {
        if (!gameRoom || view !== 'playing' || gameRoom.hostUid !== currentUser?.uid || gameRoom.gameMode !== 'longest') return;

        const timeSinceTurnStart = Date.now() - gameRoom.gameState.turnStartTime;
        if (timeSinceTurnStart >= TURN_DURATION * 1000 && gameRoom.status === 'playing') {
            // Process turn if overdue
            processMultiplayerTurn();
        } else if (gameRoom.status === 'playing') {
            const timeoutId = setTimeout(processMultiplayerTurn, (TURN_DURATION * 1000) - timeSinceTurnStart);
            return () => clearTimeout(timeoutId);
        }
    }, [gameRoom?.gameState.turnStartTime, gameRoom?.hostUid, currentUser?.uid, view, gameRoom?.gameMode]);
    
     const processMultiplayerTurn = useCallback(async () => {
        if (!gameRoom || gameRoom.hostUid !== currentUser?.uid || gameRoom.status !== 'playing') return;

        const submissions = gameRoom.gameState.turnSubmissions || {};
        const usedWords = gameRoom.gameState.usedWords;
        const context = { mode: 'longest' as GameMode, startLetter: gameRoom.gameState.roundLetter };

        const validationPromises = gameRoom.players.map(player => {
            const word = submissions[player.uid];
            return word ? validateDuelWord(word, usedWords, learningLanguage, context) : Promise.resolve({ isValid: false, reason: "Không nộp." });
        });

        const results = await Promise.all(validationPromises);
        
        const newScores = { ...gameRoom.gameState.scores };
        const turnHistory: any = { by: 'turn', letter: gameRoom.gameState.roundLetter, turn: gameRoom.gameState.currentRound };
        let newUsedWords = [...usedWords];

        gameRoom.players.forEach((player, index) => {
            const word = submissions[player.uid] || '';
            const score = results[index].isValid ? word.length : 0;
            newScores[player.uid] = (newScores[player.uid] || 0) + score;
            turnHistory[player.uid] = { word, score, valid: results[index].isValid };
            if (results[index].isValid) {
                newUsedWords.push(word);
            }
        });
        
        const winner = gameRoom.players.find(p => newScores[p.uid] >= (gameRoom.settings.targetScore || 100));

        if (winner) {
            updateGameRoom(gameRoom.id, {
                status: 'finished',
                'gameState.winnerUid': winner.uid,
                'gameState.gameOverReason': `${winner.displayName} thắng!`,
                'gameState.scores': newScores,
                'gameState.history': [...gameRoom.gameState.history, turnHistory],
            });
        } else {
             updateGameRoom(gameRoom.id, {
                'gameState.scores': newScores,
                'gameState.history': [...gameRoom.gameState.history, turnHistory],
                'gameState.usedWords': newUsedWords,
                'gameState.currentRound': gameRoom.gameState.currentRound + 1,
                'gameState.roundLetter': getRandomLetter(),
                'gameState.turnStartTime': Date.now(),
                'gameState.turnSubmissions': {},
            });
        }

    }, [gameRoom, currentUser?.uid, learningLanguage]);


     const handleLeaveRoom = useCallback(async () => {
        if (!gameRoom || !currentUser) return;
        
        const roomId = gameRoom.id;
        const playerUid = currentUser.uid;

        try {
             await leaveGameRoom(roomId, playerUid);
        } catch (error) {
            console.error("Error leaving room:", error);
        } finally {
            setGameRoom(null);
            setView('setup');
            stopTimer();
        }
    }, [gameRoom, currentUser, stopTimer]);
    
    useEffect(() => {
        const handleBeforeUnload = () => { if (gameRoom) { handleLeaveRoom(); } };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => { window.removeEventListener('beforeunload', handleBeforeUnload); };
    }, [gameRoom, handleLeaveRoom]);
    
    const handleCreateRoom = async (isPublic: boolean) => {
        if (!currentUser) return;
        
        const player: GameRoomPlayer = { uid: currentUser.uid, displayName: profile.displayName || 'Player 1', photoURL: profile.photoURL };

        const newRoomData: Omit<GameRoom, 'id'|'code'|'createdAt'|'playerUids'> = {
            status: 'waiting', players: [player], hostUid: currentUser.uid, 
            gameMode: selectedGameMode,
            settings: { 
                difficulty: 'medium',
                theme: selectedGameMode === 'theme' ? (selectedTheme.trim() || 'any') : undefined,
                targetScore: selectedGameMode === 'longest' ? targetScore : undefined,
            },
            gameState: { history: [], usedWords: [], turnStartTime: 0, gameOverReason: '', scores: {}, currentRound: 1 },
            isPublic
        };
        
        try {
            const room = await createGameRoom(newRoomData);
            setGameRoom(room);
            setView('lobby');
        } catch(e: any) {
             eventBus.dispatch('notification', { type: 'error', message: e.message || 'Không thể tạo phòng.' });
        }
    };
    
    const handleJoinRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = joinCodeInput.trim();
        if (!code || !currentUser || isJoining) return;

        setIsJoining(true);
        try {
            const room = await getGameRoomByCode(code);
            if (room) {
                 if (room.playerUids.length >= 2 && !room.playerUids.includes(currentUser.uid)) {
                    throw new Error("Phòng đã đầy!");
                }
                const player: GameRoomPlayer = { uid: currentUser.uid, displayName: profile.displayName || 'Player 2', photoURL: profile.photoURL };
                await joinGameRoom(room.id, player);
                setGameRoom(room);
            } else {
                eventBus.dispatch('notification', { type: 'error', message: 'Không tìm thấy phòng với mã này.' });
                setIsJoining(false);
            }
        } catch (error: any) {
            eventBus.dispatch('notification', { type: 'error', message: error.message });
            setIsJoining(false);
        }
    };
    
    const handleFindMatch = useCallback(async () => {
        if (!currentUser) return;
        setIsFindingMatch(true);

        try {
            const publicRoom = await findPublicGameRoom();
            if (publicRoom) {
                const player: GameRoomPlayer = { uid: currentUser.uid, displayName: profile.displayName || 'Player 2', photoURL: profile.photoURL };
                await joinGameRoom(publicRoom.id, player);
                setGameRoom(publicRoom);
                setView('lobby');
            } else {
                await handleCreateRoom(true);
            }
        } catch (error: any) {
             eventBus.dispatch('notification', { type: 'error', message: error.message || 'Lỗi khi tìm trận.' });
        } finally {
            setIsFindingMatch(false);
        }
    }, [currentUser, profile, selectedGameMode, selectedTheme, targetScore]);

    const handleStartGame = useCallback(async () => {
        if (!gameRoom || gameRoom.hostUid !== currentUser?.uid || gameRoom.players.length < 2) return;
        
        const updates: any = {
            status: 'playing',
            'gameState.turnStartTime': Date.now(),
        };

        if (gameRoom.gameMode === 'longest') {
            updates['gameState.roundLetter'] = getRandomLetter();
            updates['gameState.turnSubmissions'] = {};
        } else {
            updates['gameState.currentPlayerUid'] = gameRoom.players[0].uid;
        }

        updateGameRoom(gameRoom.id, updates);
    }, [gameRoom, currentUser]);

    useEffect(() => {
        if (gameRoom?.status === 'waiting' && gameRoom.isPublic && gameRoom.players.length === 2 && gameRoom.hostUid === currentUser?.uid) {
            handleStartGame();
        }
    }, [gameRoom, currentUser, handleStartGame]);


    const handleMultiplayerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const word = playerInput.trim().toLowerCase();
        if (!word || isSubmitting || !gameRoom || !currentUser) return;
        
        if (gameRoom.gameMode === 'longest') {
            setIsSubmitting(true);
            await updateGameRoom(gameRoom.id, {
                [`gameState.turnSubmissions.${currentUser.uid}`]: word
            });
            setIsSubmitting(false);
            // Host will handle validation at end of turn
        } else { // Turn-based modes
            if (gameRoom.gameState.currentPlayerUid !== currentUser.uid) return;
            stopTimer();
            setIsSubmitting(true);
            try {
                const context = { mode: gameRoom.gameMode, theme: gameRoom.settings.theme, lastWord: gameRoom.gameState.lastWord };
                const { isValid, reason } = await validateDuelWord(word, gameRoom.gameState.usedWords, learningLanguage, context);

                if (isValid) {
                    const nextPlayer = gameRoom.players.find(p => p.uid !== currentUser.uid)!;
                    await updateGameRoom(gameRoom.id, {
                        "gameState.history": [...gameRoom.gameState.history, { by: currentUser.uid, word }],
                        "gameState.usedWords": [...gameRoom.gameState.usedWords, word],
                        "gameState.currentPlayerUid": nextPlayer.uid,
                        "gameState.turnStartTime": Date.now(),
                        "gameState.lastWord": gameRoom.gameMode === 'chain' ? word : gameRoom.gameState.lastWord
                    });
                } else {
                    const winner = gameRoom.players.find(p => p.uid !== currentUser.uid)!;
                    await updateGameRoom(gameRoom.id, {
                        status: 'finished', "gameState.gameOverReason": reason || "Từ không hợp lệ.", "gameState.winnerUid": winner.uid,
                    });
                }
            } catch(e) {
                eventBus.dispatch('notification', { type: 'error', message: 'Lỗi khi kiểm tra từ.' });
                startTimer(() => {});
            } finally {
                setPlayerInput('');
                setIsSubmitting(false);
            }
        }
    };
    
    // Timer rendering for multiplayer
     useEffect(() => {
        if (gameRoom?.status === 'playing' && view === 'playing') {
            const serverStartTime = gameRoom.gameState.turnStartTime;
            const updateTimer = () => {
                const elapsed = Math.floor((Date.now() - serverStartTime) / 1000);
                const remaining = TURN_DURATION - elapsed;
                setTimeLeft(Math.max(0, remaining));
            };
            updateTimer();
            const intervalId = setInterval(updateTimer, 1000);
            return () => clearInterval(intervalId);
        }
    }, [gameRoom?.gameState.turnStartTime, gameRoom?.status, view]);
    
    useEffect(() => {
        if (aiGameOverReason && aiGameOverReason !== gameOverReasonRef.current) {
            if (aiGameOverReason.includes('Bạn thắng!')) {
                incrementDuelWins();
                addXp(25);
                recordActivity();
            }
            gameOverReasonRef.current = aiGameOverReason;
            addHistoryEntry('VOCABULARY_DUEL_COMPLETED', `Hoàn thành trận đấu với AI. ${aiGameOverReason}`);
        }
    }, [aiGameOverReason, incrementDuelWins, addXp, recordActivity, addHistoryEntry]);

    if (isJoining) {
        return <div className="text-center py-10"><Loader2 className="w-10 h-10 animate-spin" /> <p>Đang vào phòng...</p></div>;
    }

    if (view === 'setup') {
        // Unchanged
    }

    if (view === 'ai_game_setup') {
        // Unchanged
    }
    
    if (view === 'ai_game') {
        const longestModeDisplay = aiGameMode === 'longest' ? ` (Mục tiêu: ${aiGameSettings.targetScore})` : '';
        return (
            <div className="flex flex-col h-full max-h-[75vh] space-y-4 animate-fade-in text-white">
                 <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-center">Đấu với AI{longestModeDisplay}</h2>
                    <button onClick={() => setAiGameOverReason('Bạn đã bỏ cuộc.')} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-red-800/50 hover:bg-red-800 text-red-200 font-semibold rounded-xl transition-colors">
                        <XCircle className="w-4 h-4" />
                        <span>Bỏ cuộc</span>
                    </button>
                </div>
                {aiGameOverReason ? (
                    <div className="text-center py-10 space-y-4 flex flex-col items-center flex-grow justify-center">
                        <h2 className="text-2xl font-bold">{aiGameOverReason.includes('Bạn thắng!') ? 'Bạn đã thắng!' : aiGameOverReason.includes('Hòa!') ? 'Hòa!' : 'Bạn đã thua!'}</h2>
                        <p className="text-gray-400">{aiGameOverReason}</p>
                        <div className="flex gap-4">
                           <button onClick={() => setView('setup')} className="px-6 py-3 bg-slate-600 hover:bg-slate-700 font-semibold rounded-xl">Quay lại</button>
                           <button onClick={handleStartAiGame} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 font-semibold rounded-xl">Chơi lại</button>
                        </div>
                    </div>
                ) : (
                    <>
                        {aiGameMode === 'longest' && (
                            <div className="text-center space-y-2">
                                <p className="text-sm text-gray-400">Vòng này, bắt đầu với chữ</p>
                                <p className="text-6xl font-bold text-cyan-300">{currentLetter}</p>
                                <div className="flex justify-around text-center pt-2"><p>Bạn: <strong className="text-cyan-400">{aiScores.player}</strong></p><p>AI: <strong className="text-indigo-400">{aiScores.ai}</strong></p></div>
                            </div>
                        )}
                        <div className="flex-grow p-4 bg-slate-800/50 rounded-xl overflow-y-auto space-y-4">
                           {aiGameHistory.map((item, index) => (
                                item.by === 'turn' ? (
                                    <div key={index} className="text-xs text-center text-slate-400 border-b border-slate-700 pb-2 mb-2">
                                        Vòng {item.turn} - Chữ '{item.letter}'<br/>
                                        Bạn: {item.player.word || '(trống)'} ({item.player.score}đ) | AI: {item.ai.word || '(trống)'} ({item.ai.score}đ)
                                    </div>
                                ) : (
                                <div key={index} className={`flex items-start gap-3 ${item.by === 'player' ? 'justify-end' : ''}`}>
                                    {item.by === 'ai' && <div className="p-1.5 bg-indigo-500 rounded-full flex-shrink-0"><Bot className="w-5 h-5"/></div>}
                                    <div className={`px-4 py-2 rounded-2xl max-w-xs break-words ${item.by === 'player' ? 'bg-slate-600 rounded-br-none' : 'bg-indigo-900/80 rounded-bl-none'}`}>{item.word}</div>
                                </div>
                                )
                           ))}
                           {isAiThinking && <div className="flex items-start gap-3"><div className="p-1.5 bg-indigo-500 rounded-full"><Bot className="w-5 h-5"/></div><div className="px-4 py-2 rounded-2xl bg-indigo-900/80 rounded-bl-none"><Loader2 className="w-5 h-5 animate-spin"/></div></div>}
                        </div>
                        <form onSubmit={handlePlayerSubmit_AI} className="flex items-center gap-2">
                            {aiGameMode === 'longest' ? (
                                <TurnTimer timeLeft={timeLeft} duration={TURN_DURATION} />
                            ) : null}
                            <input value={playerInput} onChange={e => setPlayerInput(e.target.value)} placeholder={isPlayerTurn || aiGameMode === 'longest' ? "Nhập từ của bạn..." : "Chờ AI..."} disabled={aiGameMode !== 'longest' && !isPlayerTurn} className="flex-grow w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500" autoFocus/>
                            <button type="submit" disabled={aiGameMode !== 'longest' && (!isPlayerTurn || !playerInput)} className="p-3 bg-indigo-600 rounded-full disabled:bg-indigo-400">{isSubmitting ? <Loader2 className="w-6 h-6 animate-spin"/> : <Send className="w-6 h-6"/>}</button>
                        </form>
                    </>
                )}
            </div>
        );
    }
    
    if (view === 'lobby' && gameRoom) { /* Lobby view unchanged */ }
    
    if (gameRoom && (gameRoom.status === 'playing' || gameRoom.status === 'finished')) {
        // Unchanged, but kept for context.
    }

    // Render other views as before
    const OtherViews = () => {
        if (view === 'setup') {
            return (
                <div className="space-y-6 text-center animate-fade-in text-white">
                    <div className="flex items-center justify-between w-full">
                        <h2 className="text-2xl font-bold">Đấu Từ vựng</h2>
                         <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 rounded-xl">
                            <ArrowLeft className="w-4 h-4" /> <span>Quay lại</span>
                        </button>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-800/50 rounded-xl space-y-3">
                             <h3 className="font-semibold text-lg">Chơi một mình</h3>
                             <button onClick={() => setView('ai_game_setup')} className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold flex items-center justify-center gap-2"><Bot className="w-5 h-5"/> Chơi với AI</button>
                        </div>
                        <div className="p-4 bg-slate-800/50 rounded-xl space-y-3">
                             <h3 className="font-semibold text-lg text-left">Chơi nhiều người</h3>
                             <GameModeSelector 
                                selectedGameMode={selectedGameMode}
                                onGameModeChange={setSelectedGameMode}
                                selectedTheme={selectedTheme}
                                onThemeChange={setSelectedTheme}
                                targetScore={targetScore}
                                onTargetScoreChange={setTargetScore}
                             />
                             <button onClick={handleFindMatch} disabled={isFindingMatch} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:bg-indigo-400">
                                {isFindingMatch ? <Loader2 className="w-5 h-5 animate-spin"/> : <Users className="w-5 h-5"/>}
                                {isFindingMatch ? 'Đang tìm...' : 'Tìm trận nhanh'}
                            </button>
                            <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-slate-600"></div><span className="flex-shrink mx-4 text-xs text-slate-400 uppercase">Hoặc</span><div className="flex-grow border-t border-slate-600"></div></div>
                            <button onClick={() => handleCreateRoom(false)} className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold flex items-center justify-center gap-2"><Plus className="w-5 h-5"/> Tạo phòng riêng</button>
                             <form onSubmit={handleJoinRoom} className="flex items-stretch gap-2 pt-2">
                                <input value={joinCodeInput} onChange={e => setJoinCodeInput(e.target.value.toUpperCase())} placeholder="NHẬP MÃ" maxLength={6} className="flex-grow min-w-0 px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-center font-bold tracking-widest placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-500"/>
                                 <button type="submit" className="flex-shrink-0 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold text-white flex items-center justify-center gap-2">
                                    <Key className="w-5 h-5" />
                                    <span className="hidden sm:inline">Vào phòng</span>
                                </button>
                             </form>
                        </div>
                    </div>
                </div>
            )
        }
        if (view === 'ai_game_setup') {
            return (
                <div className="space-y-6 text-center animate-fade-in text-white">
                    <h2 className="text-2xl font-bold">Cài đặt trận đấu AI</h2>
                    <div className="p-4 bg-slate-800/50 rounded-xl space-y-4">
                         <GameModeSelector 
                            selectedGameMode={selectedGameMode}
                            onGameModeChange={setSelectedGameMode}
                            selectedTheme={selectedTheme}
                            onThemeChange={setSelectedTheme}
                            targetScore={targetScore}
                            onTargetScoreChange={setTargetScore}
                         />
                         <div>
                            <h3 className="font-semibold text-lg text-white mb-2 text-left">Độ khó</h3>
                            <div className="grid grid-cols-4 gap-2">
                                {Object.entries(difficultySettings).map(([key, { name }]) => (
                                    <button key={key} onClick={() => setAiDifficulty(key as Difficulty)} className={`p-3 rounded-xl border-2 transition-colors text-sm ${aiDifficulty === key ? 'bg-indigo-500/20 border-indigo-500' : 'bg-slate-700 border-slate-600'}`}>{name}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <button onClick={handleStartAiGame} className="w-full py-3 bg-indigo-600 rounded-lg font-semibold">Bắt đầu</button>
                    <button onClick={() => setView('setup')} className="text-sm text-indigo-400">Quay lại</button>
                </div>
            );
        }
        return null;
    };
    
    return <OtherViews />;
};

export default VocabularyDuel;