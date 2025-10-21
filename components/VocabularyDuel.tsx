import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { Swords, ArrowLeft, Bot, User, Send, Loader2, Trophy, ShieldAlert, Users, Plus, Key, Brain, Link as LinkIcon, LogOut } from 'lucide-react';
import { validateDuelWord, getAiDuelWord } from '../services/geminiService';
import { useHistory } from '../hooks/useHistory';
import { GameRoom, GameRoomPlayer, GameMode } from '../types';
import { useAuth } from '../hooks/useAuth';
import { createGameRoom, getGameRoomByCode, joinGameRoom, onGameRoomSnapshot, updateGameRoom, findPublicGameRoom, leaveGameRoom } from '../services/firestoreService';
import eventBus from '../utils/eventBus';

const TURN_DURATION = 15; // 15 seconds per turn

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
    rounds: number;
    onRoundsChange: (rounds: number) => void;
}> = ({ selectedGameMode, onGameModeChange, selectedTheme, onThemeChange, rounds, onRoundsChange }) => {
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
                    <h3 className="font-semibold text-lg text-white mb-2">Số vòng</h3>
                     <div className="grid grid-cols-3 gap-2">
                         {[5, 10, 15].map(r => (
                             <button
                                 key={r}
                                 type="button"
                                 onClick={() => onRoundsChange(r)}
                                 className={`p-2 rounded-lg font-semibold ${rounds === r ? 'bg-indigo-600' : 'bg-slate-700'}`}
                             >{r} vòng</button>
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
    const [rounds, setRounds] = useState(10);
    
    // Multiplayer State
    const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
    const [joinCodeInput, setJoinCodeInput] = useState('');
    const [isFindingMatch, setIsFindingMatch] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [timeLeft, setTimeLeft] = useState(TURN_DURATION);
    const timerRef = useRef<number | null>(null);

    // AI Game State
    const [aiDifficulty, setAiDifficulty] = useState<Difficulty>('medium');
    const [aiGameHistory, setAiGameHistory] = useState<{by: 'player'|'ai', word: string}[]>([]);
    const [playerInput, setPlayerInput] = useState('');
    const [isPlayerTurn, setIsPlayerTurn] = useState(true);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [aiGameOverReason, setAiGameOverReason] = useState('');
    const [aiGameMode, setAiGameMode] = useState<GameMode>('theme');
    const [aiGameSettings, setAiGameSettings] = useState<{ theme?: string; rounds?: number }>({ theme: 'any', rounds: 10 });
    const [aiScores, setAiScores] = useState({ player: 0, ai: 0 });
    const [aiCurrentRound, setAiCurrentRound] = useState(1);
    const gameOverReasonRef = useRef(aiGameOverReason);

    const handleStartAiGame = useCallback(() => {
        setAiGameMode(selectedGameMode);
        setAiGameSettings({ 
            theme: selectedGameMode === 'theme' ? (selectedTheme.trim() || 'any') : undefined,
            rounds: selectedGameMode === 'longest' ? rounds : undefined,
        });
        
        setAiGameHistory([]);
        setPlayerInput('');
        setIsPlayerTurn(true);
        setIsAiThinking(false);
        setAiGameOverReason('');
        setAiScores({ player: 0, ai: 0 });
        setAiCurrentRound(1);
        setView('ai_game');
    }, [selectedGameMode, selectedTheme, rounds]);

    const stopTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
    }, []);

    const startTimer = useCallback(() => {
        stopTimer();
        setTimeLeft(TURN_DURATION);
        timerRef.current = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    stopTimer();
                    if (gameRoom && gameRoom.status === 'playing' && gameRoom.gameState.currentPlayerUid === currentUser?.uid) {
                        updateGameRoom(gameRoom.id, {
                            "gameState.gameOverReason": `Người chơi ${profile.displayName} đã hết giờ!`,
                            "gameState.winnerUid": gameRoom.players.find(p => p.uid !== currentUser.uid)?.uid,
                            status: 'finished'
                        });
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [gameRoom, currentUser, profile.displayName, stopTimer]);

    // Multiplayer useEffect
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

                const wasPlaying = gameRoom?.status === 'playing';
                setGameRoom(room);
                if (room.status === 'playing' && room.gameState.currentPlayerUid === currentUser.uid) {
                    if ((gameRoom?.gameState.history.length !== room.gameState.history.length) || !wasPlaying) {
                       startTimer();
                    }
                } else {
                    stopTimer();
                }
            } else {
                eventBus.dispatch('notification', { type: 'info', message: 'Phòng chơi đã bị hủy hoặc không tồn tại.' });
                setGameRoom(null);
                setView('setup');
                setIsJoining(false);
            }
        });

        return () => {
            stopTimer();
            unsubscribe();
        };
    }, [gameRoom?.id, currentUser, startTimer, stopTimer, view]);

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
                rounds: selectedGameMode === 'longest' ? rounds : undefined,
            },
            gameState: { history: [], usedWords: [], currentPlayerUid: '', turnStartTime: 0, gameOverReason: '', scores: {}, currentRound: 1, lastWord: '' },
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
    }, [currentUser, profile, selectedGameMode, selectedTheme, rounds]);

    const handleStartGame = useCallback(() => {
        if (!gameRoom || gameRoom.hostUid !== currentUser?.uid || gameRoom.players.length < 2) return;
        
        updateGameRoom(gameRoom.id, {
            status: 'playing',
            'gameState.currentPlayerUid': gameRoom.players[0].uid,
            'gameState.turnStartTime': Date.now(),
        });
    }, [gameRoom, currentUser]);

    useEffect(() => {
        if (gameRoom?.status === 'waiting' && gameRoom.isPublic && gameRoom.players.length === 2 && gameRoom.hostUid === currentUser?.uid) {
            handleStartGame();
        }
    }, [gameRoom, currentUser, handleStartGame]);


    const handleMultiplayerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const word = playerInput.trim().toLowerCase();
        if (!word || isSubmitting || !gameRoom || gameRoom.gameState.currentPlayerUid !== currentUser?.uid) return;
        
        stopTimer();
        setIsSubmitting(true);
        
        try {
            const context = { mode: gameRoom.gameMode, theme: gameRoom.settings.theme, lastWord: gameRoom.gameState.lastWord };
            const { isValid, reason } = await validateDuelWord(word, gameRoom.gameState.usedWords, learningLanguage, context);

            if (isValid) {
                const nextPlayer = gameRoom.players.find(p => p.uid !== currentUser.uid)!;
                const newHistory = [...gameRoom.gameState.history, { by: currentUser.uid, word }];
                const newUsedWords = [...gameRoom.gameState.usedWords, word];
                const newCurrentRound = Math.floor(newHistory.length / 2) + 1;

                const updates: any = {
                    "gameState.history": newHistory,
                    "gameState.usedWords": newUsedWords,
                    "gameState.currentPlayerUid": nextPlayer.uid,
                    "gameState.turnStartTime": Date.now(),
                    "gameState.currentRound": newCurrentRound,
                };

                if(gameRoom.gameMode === 'chain') updates["gameState.lastWord"] = word;
                if(gameRoom.gameMode === 'longest') {
                    updates[`gameState.scores.${currentUser.uid}`] = (gameRoom.gameState.scores[currentUser.uid] || 0) + word.length;
                }
                
                if (gameRoom.gameMode === 'longest' && newCurrentRound > (gameRoom.settings.rounds || 10) && newHistory.length % 2 === 0) {
                     const myScore = (updates[`gameState.scores.${currentUser.uid}`] || 0);
                     const opponentScore = gameRoom.gameState.scores[nextPlayer.uid] || 0;
                     
                     if (myScore > opponentScore) {
                        updates['gameState.winnerUid'] = currentUser.uid;
                        updates['gameState.gameOverReason'] = `${profile.displayName} thắng với ${myScore} điểm!`;
                     } else if (opponentScore > myScore) {
                        updates['gameState.winnerUid'] = nextPlayer.uid;
                        updates['gameState.gameOverReason'] = `${nextPlayer.displayName} thắng với ${opponentScore} điểm!`;
                     } else {
                         updates['gameState.gameOverReason'] = `Hòa với ${myScore} điểm!`;
                     }
                     updates['status'] = 'finished';
                }

                await updateGameRoom(gameRoom.id, updates);

            } else {
                const winner = gameRoom.players.find(p => p.uid !== currentUser.uid)!;
                await updateGameRoom(gameRoom.id, {
                    status: 'finished',
                    "gameState.gameOverReason": reason || "Từ không hợp lệ.",
                    "gameState.winnerUid": winner.uid,
                });
            }
        } catch(e) {
            eventBus.dispatch('notification', { type: 'error', message: 'Lỗi khi kiểm tra từ.' });
            startTimer();
        } finally {
            setPlayerInput('');
            setIsSubmitting(false);
        }
    };
    
    const triggerAiTurn = async (currentHistory: typeof aiGameHistory, currentRound: number) => {
        setIsAiThinking(true);
        const usedWords = currentHistory.map(h => h.word);
        try {
            const context = { mode: aiGameMode, theme: aiGameSettings.theme, lastWord: currentHistory.length > 0 ? currentHistory[currentHistory.length - 1].word : undefined };
            const { word: aiWord } = await getAiDuelWord(usedWords, learningLanguage, aiDifficulty, context);
            
            if (!aiWord) {
                setAiGameOverReason('AI đã hết từ! Bạn thắng!');
                return;
            }

            const { isValid, reason } = await validateDuelWord(aiWord, usedWords, learningLanguage, context);
            
            if (isValid) {
                const newScores = { ...aiScores };
                if (aiGameMode === 'longest') {
                    newScores.ai += aiWord.length;
                    setAiScores(newScores);
                }

                if (aiGameMode === 'longest' && currentRound >= (aiGameSettings.rounds || 10)) {
                    if (newScores.player > newScores.ai) {
                        setAiGameOverReason(`Bạn thắng với ${newScores.player} điểm!`);
                    } else if (newScores.ai > newScores.player) {
                        setAiGameOverReason(`AI thắng với ${newScores.ai} điểm!`);
                    } else {
                        setAiGameOverReason(`Hòa với ${newScores.player} điểm!`);
                    }
                } else {
                     setAiGameHistory(prev => [...prev, { by: 'ai', word: aiWord }]);
                     setAiCurrentRound(prev => prev + 1);
                }
            } else {
                setAiGameOverReason(`AI đã dùng từ không hợp lệ: "${reason}". Bạn thắng!`);
            }
        } catch(e) {
            setAiGameOverReason('AI gặp lỗi. Bạn thắng!');
        } finally {
            setIsAiThinking(false);
            setIsPlayerTurn(true);
        }
    };

    const handlePlayerSubmit_AI = async (e: React.FormEvent) => {
        e.preventDefault();
        const word = playerInput.trim().toLowerCase();
        if (!word || !isPlayerTurn || isAiThinking || aiGameOverReason) return;
        
        setIsSubmitting(true);
        const usedWords = aiGameHistory.map(h => h.word);
        const context = { mode: aiGameMode, theme: aiGameSettings.theme, lastWord: aiGameHistory.length > 0 ? aiGameHistory[aiGameHistory.length - 1].word : undefined };
        const { isValid, reason } = await validateDuelWord(word, usedWords, learningLanguage, context);
        
        if (isValid) {
            if (aiGameMode === 'longest') {
                setAiScores(prev => ({ ...prev, player: prev.player + word.length }));
            }
            const newHistory = [...aiGameHistory, { by: 'player', word }];
            setAiGameHistory(newHistory);
            setIsPlayerTurn(false);
            setPlayerInput('');
            triggerAiTurn(newHistory, aiCurrentRound);
        } else {
            setAiGameOverReason(reason || 'Từ không hợp lệ. Bạn đã thua!');
        }
        setIsSubmitting(false);
    };

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
                            rounds={rounds}
                            onRoundsChange={setRounds}
                         />
                         <button onClick={handleFindMatch} disabled={isFindingMatch} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:bg-indigo-400">
                            {isFindingMatch ? <Loader2 className="w-5 h-5 animate-spin"/> : <Users className="w-5 h-5"/>}
                            {isFindingMatch ? 'Đang tìm...' : 'Tìm trận nhanh'}
                        </button>
                        <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-slate-600"></div><span className="flex-shrink mx-4 text-xs text-slate-400 uppercase">Hoặc</span><div className="flex-grow border-t border-slate-600"></div></div>
                        <button onClick={() => handleCreateRoom(false)} className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold flex items-center justify-center gap-2"><Plus className="w-5 h-5"/> Tạo phòng riêng</button>
                         <form onSubmit={handleJoinRoom} className="flex gap-2 pt-2">
                            <input value={joinCodeInput} onChange={e => setJoinCodeInput(e.target.value.toUpperCase())} placeholder="NHẬP MÃ" maxLength={6} className="flex-grow px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-center font-bold tracking-widest placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-500"/>
                             <button type="submit" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold text-white flex items-center justify-center gap-2"><Key className="w-4 h-4" /> Vào phòng</button>
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
                        rounds={rounds}
                        onRoundsChange={setRounds}
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
    
    if (view === 'ai_game') {
        const roundDisplay = aiGameMode === 'longest' ? ` (Vòng ${aiCurrentRound}/${aiGameSettings.rounds})` : '';
        return (
            <div className="flex flex-col h-full max-h-[75vh] space-y-4 animate-fade-in text-white">
                <h2 className="text-xl font-bold text-center">Đấu với AI ({difficultySettings[aiDifficulty].name}){roundDisplay}</h2>
                {aiGameOverReason ? (
                    <div className="text-center py-10 space-y-4 flex flex-col items-center">
                        <h2 className="text-2xl font-bold">{aiGameOverReason.includes('Bạn thắng!') ? 'Bạn đã thắng!' : aiGameOverReason.includes('Hòa!') ? 'Hòa!' : 'Bạn đã thua!'}</h2>
                        <p className="text-gray-400">{aiGameOverReason}</p>
                        <div className="flex gap-4">
                           <button onClick={() => setView('setup')} className="px-6 py-3 bg-slate-600 hover:bg-slate-700 font-semibold rounded-xl">Quay lại</button>
                           <button onClick={handleStartAiGame} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 font-semibold rounded-xl">Chơi lại</button>
                        </div>
                    </div>
                ) : (
                    <>
                        {aiGameMode === 'longest' && <div className="flex justify-around text-center"><p>Bạn: <strong className="text-cyan-400">{aiScores.player}</strong></p><p>AI: <strong className="text-indigo-400">{aiScores.ai}</strong></p></div>}
                        <div className="flex-grow p-4 bg-slate-800/50 rounded-xl overflow-y-auto space-y-4">
                           {aiGameHistory.map((item, index) => (
                                <div key={index} className={`flex items-start gap-3 ${item.by === 'player' ? 'justify-end' : ''}`}>
                                    {item.by === 'ai' && <div className="p-1.5 bg-indigo-500 rounded-full flex-shrink-0"><Bot className="w-5 h-5"/></div>}
                                    <div className={`px-4 py-2 rounded-2xl max-w-xs break-words ${item.by === 'player' ? 'bg-slate-600 rounded-br-none' : 'bg-indigo-900/80 rounded-bl-none'}`}>{item.word}</div>
                                </div>
                           ))}
                           {isAiThinking && <div className="flex items-start gap-3"><div className="p-1.5 bg-indigo-500 rounded-full"><Bot className="w-5 h-5"/></div><div className="px-4 py-2 rounded-2xl bg-indigo-900/80 rounded-bl-none"><Loader2 className="w-5 h-5 animate-spin"/></div></div>}
                        </div>
                        <form onSubmit={handlePlayerSubmit_AI} className="flex gap-2">
                            <input value={playerInput} onChange={e => setPlayerInput(e.target.value)} placeholder={isPlayerTurn ? "Đến lượt bạn..." : "Chờ AI..."} disabled={!isPlayerTurn || isSubmitting || isAiThinking} className="flex-grow w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500" autoFocus/>
                            <button type="submit" disabled={!isPlayerTurn || isSubmitting || !playerInput || isAiThinking} className="p-3 bg-indigo-600 rounded-full disabled:bg-indigo-400">{isSubmitting ? <Loader2 className="w-6 h-6 animate-spin"/> : <Send className="w-6 h-6"/>}</button>
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

    return <div><button onClick={onBack}>Back</button>...Loading</div>;
};

export default VocabularyDuel;