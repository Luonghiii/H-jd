import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { Swords, ArrowLeft, Bot, User, Send, Loader2, Trophy, ShieldAlert, Users, Plus, Key, Brain } from 'lucide-react';
import { validateDuelWord, getAiDuelWord } from '../services/geminiService';
import { useHistory } from '../hooks/useHistory';
import { GameRoom, GameRoomPlayer } from '../types';
import { useAuth } from '../hooks/useAuth';
import { createGameRoom, getGameRoomByCode, joinGameRoom, onGameRoomSnapshot, updateGameRoom, findPublicGameRoom } from '../services/firestoreService';
import eventBus from '../utils/eventBus';

const TURN_DURATION = 15; // 15 seconds per turn

interface VocabularyDuelProps {
    onBack: () => void;
}

type View = 'setup' | 'lobby' | 'playing' | 'ai_game';
type GameMode = 'theme' | 'longest' | 'chain';
type Difficulty = 'easy' | 'medium' | 'hard' | 'hell';
type GameHistoryItem = { by: string, word: string }; // by is UID

const difficultySettings = {
    easy: { name: 'Dễ', thinkingTime: 500 },
    medium: { name: 'Trung bình', thinkingTime: 1000 },
    hard: { name: 'Khó', thinkingTime: 1500 },
    hell: { name: 'Địa ngục', thinkingTime: 2000 },
};

const VocabularyDuel: React.FC<VocabularyDuelProps> = ({ onBack }) => {
    const { currentUser } = useAuth();
    const { profile, learningLanguage, recordActivity, addXp, incrementDuelWins } = useSettings();
    const { addHistoryEntry } = useHistory();

    const [view, setView] = useState<View>('setup');
    
    // Multiplayer State
    const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
    const [joinCode, setJoinCode] = useState('');
    const [isFindingMatch, setIsFindingMatch] = useState(false);
    const [playerInput, setPlayerInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [timeLeft, setTimeLeft] = useState(TURN_DURATION);
    const timerRef = useRef<number | null>(null);

    // AI Game State (for single player)
    const [aiDifficulty, setAiDifficulty] = useState<Difficulty>('medium');
    const [aiGameHistory, setAiGameHistory] = useState<{by: 'player'|'ai', word: string}[]>([]);
    
    const stopTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
    }, []);

    useEffect(() => {
        if (!gameRoom || !currentUser) return;

        const unsubscribe = onGameRoomSnapshot(gameRoom.id, (room) => {
            if (room) {
                setGameRoom(room);
                if (room.status === 'playing' && room.gameState.currentPlayerUid === currentUser.uid) {
                    startTimer();
                } else {
                    stopTimer();
                }
            } else {
                eventBus.dispatch('notification', { type: 'info', message: 'Phòng chơi đã bị hủy.' });
                setGameRoom(null);
                setView('setup');
            }
        });

        return () => unsubscribe();
    }, [gameRoom?.id, currentUser]);
    
    const startTimer = useCallback(() => {
        stopTimer();
        setTimeLeft(TURN_DURATION);
        timerRef.current = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    stopTimer();
                    // Handle timeout on Firestore
                    if (gameRoom && gameRoom.gameState.currentPlayerUid === currentUser?.uid) {
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


    const handleCreateRoom = async (isPublic: boolean) => {
        if (!currentUser) return;
        
        const player: GameRoomPlayer = { uid: currentUser.uid, displayName: profile.displayName || 'Player 1', photoURL: profile.photoURL };

        const newRoomData: Omit<GameRoom, 'id'|'code'|'createdAt'> = {
            status: 'waiting',
            players: [player],
            hostUid: currentUser.uid,
            gameMode: 'theme', // Default, can be changed in lobby
            settings: { difficulty: 'medium' },
            gameState: {
                history: [],
                usedWords: [],
                currentPlayerUid: '',
                turnStartTime: 0,
                gameOverReason: '',
            },
            isPublic
        };
        
        const room = await createGameRoom(newRoomData);
        setGameRoom(room);
        setView('lobby');
    };
    
    const handleJoinRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinCode.trim() || !currentUser) return;
        
        const room = await getGameRoomByCode(joinCode);
        if (room) {
            const player: GameRoomPlayer = { uid: currentUser.uid, displayName: profile.displayName || 'Player 2', photoURL: profile.photoURL };
            await joinGameRoom(room.id, player);
            setGameRoom(room);
            setView('lobby');
        } else {
            eventBus.dispatch('notification', { type: 'error', message: 'Không tìm thấy phòng với mã này.' });
        }
    };
    
    const handleFindMatch = async () => {
        if (!currentUser) return;
        setIsFindingMatch(true);

        const publicRoom = await findPublicGameRoom();
        if (publicRoom) {
            const player: GameRoomPlayer = { uid: currentUser.uid, displayName: profile.displayName || 'Player 2', photoURL: profile.photoURL };
            await joinGameRoom(publicRoom.id, player);
            // The listener will pick up the new player. The host's client will start the game.
        } else {
            // No room found, create a new public one and wait
            await handleCreateRoom(true);
        }
        setIsFindingMatch(false);
    };

    const handleStartGame = () => {
        if (!gameRoom || gameRoom.hostUid !== currentUser?.uid || gameRoom.players.length < 2) return;
        
        updateGameRoom(gameRoom.id, {
            status: 'playing',
            'gameState.currentPlayerUid': gameRoom.players[0].uid,
            'gameState.turnStartTime': Date.now(),
        });
    };

    // Auto-start for matchmaking
    useEffect(() => {
        if (gameRoom?.status === 'waiting' && gameRoom.isPublic && gameRoom.players.length === 2 && gameRoom.hostUid === currentUser?.uid) {
            handleStartGame();
        }
    }, [gameRoom, currentUser]);


    const handleMultiplayerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const word = playerInput.trim().toLowerCase();
        if (!word || isProcessing || !gameRoom || gameRoom.gameState.currentPlayerUid !== currentUser?.uid) return;
        
        stopTimer();
        setIsProcessing(true);
        
        const { isValid, reason } = await validateDuelWord(word, gameRoom.gameState.usedWords, learningLanguage, { mode: 'theme', theme: 'any' });

        if (isValid) {
            const nextPlayer = gameRoom.players.find(p => p.uid !== currentUser.uid)!;
            const newHistory = [...gameRoom.gameState.history, { by: currentUser.uid, word }];
            const newUsedWords = [...gameRoom.gameState.usedWords, word];
            
            await updateGameRoom(gameRoom.id, {
                "gameState.history": newHistory,
                "gameState.usedWords": newUsedWords,
                "gameState.currentPlayerUid": nextPlayer.uid,
                "gameState.turnStartTime": Date.now(),
            });
        } else {
            const winner = gameRoom.players.find(p => p.uid !== currentUser.uid)!;
            await updateGameRoom(gameRoom.id, {
                status: 'finished',
                "gameState.gameOverReason": reason || "Từ không hợp lệ.",
                "gameState.winnerUid": winner.uid,
            });
        }
        
        setPlayerInput('');
        setIsProcessing(false);
    };
    
    if (view === 'setup') {
        return (
            <div className="space-y-6 text-center animate-fade-in text-white">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Đấu Từ vựng</h2>
                     <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 rounded-xl">
                        <ArrowLeft className="w-4 h-4" /> <span>Quay lại</span>
                    </button>
                </div>
                
                <div className="p-4 bg-slate-800/50 rounded-xl space-y-4">
                     <button onClick={() => setView('ai_game')} className="w-full py-3 bg-slate-700 rounded-lg font-semibold flex items-center justify-center gap-2"><Bot className="w-5 h-5"/> Chơi với AI</button>
                     <h3 className="font-semibold text-lg">Chơi nhiều người</h3>
                     <button onClick={() => handleCreateRoom(false)} className="w-full py-3 bg-slate-700 rounded-lg font-semibold flex items-center justify-center gap-2"><Plus className="w-5 h-5"/> Tạo phòng riêng</button>
                     <form onSubmit={handleJoinRoom} className="flex gap-2">
                        <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Nhập mã phòng..." maxLength={6} className="flex-grow px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg"/>
                        <button type="submit" className="px-4 py-2 bg-slate-700 rounded-lg"><Key className="w-5 h-5"/></button>
                     </form>
                      <button onClick={handleFindMatch} disabled={isFindingMatch} className="w-full py-3 bg-indigo-600 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:bg-indigo-400">
                        {isFindingMatch ? <Loader2 className="w-5 h-5 animate-spin"/> : <Users className="w-5 h-5"/>}
                        {isFindingMatch ? 'Đang tìm...' : 'Tìm trận nhanh'}
                    </button>
                </div>
            </div>
        )
    }
    
    if (view === 'ai_game') {
        // Render single player vs AI game here...
        return <div><button onClick={() => setView('setup')}>Back</button> Single player mode is under construction.</div>;
    }
    
    if (view === 'lobby' && gameRoom) {
        const isHost = gameRoom.hostUid === currentUser?.uid;
        return (
            <div className="space-y-4 text-center text-white">
                <h2 className="text-2xl font-bold">Phòng chờ</h2>
                <p>Chia sẻ mã này cho bạn bè:</p>
                <div className="p-3 bg-slate-900/50 rounded-lg text-3xl font-bold tracking-widest">{gameRoom.code}</div>
                <h3 className="font-semibold pt-4">Người chơi đã tham gia ({gameRoom.players.length}/2)</h3>
                <div className="space-y-2">
                    {gameRoom.players.map(p => (
                        <div key={p.uid} className="flex items-center gap-3 p-2 bg-slate-700 rounded-lg">
                            <img src={p.photoURL || undefined} className="w-8 h-8 rounded-full bg-slate-500" />
                            <span>{p.displayName}</span>
                        </div>
                    ))}
                </div>
                {isHost ? (
                    <button onClick={handleStartGame} disabled={gameRoom.players.length < 2} className="w-full py-3 bg-indigo-600 rounded-lg font-semibold disabled:bg-indigo-400">Bắt đầu</button>
                ) : (
                    <p>Đang chờ chủ phòng bắt đầu...</p>
                )}
            </div>
        );
    }
    
    if (gameRoom && (gameRoom.status === 'playing' || gameRoom.status === 'finished')) {
        const player1 = gameRoom.players[0];
        const player2 = gameRoom.players[1];
        const isMyTurn = gameRoom.gameState.currentPlayerUid === currentUser?.uid;

        if (gameRoom.status === 'finished') {
             const winner = gameRoom.players.find(p => p.uid === gameRoom.gameState.winnerUid);
             const playerWon = winner?.uid === currentUser?.uid;
             return (
                 <div className="text-center py-10 space-y-4 flex flex-col items-center animate-fade-in text-white">
                    {winner ? (playerWon ? <Trophy className="w-16 h-16 text-yellow-400" /> : <ShieldAlert className="w-16 h-16 text-red-400" />) : <Brain className="w-16 h-16 text-gray-400" />}
                    <h2 className="text-3xl font-bold">{winner ? (playerWon ? 'Bạn đã thắng!' : `${winner.displayName} thắng!`) : 'Hòa!'}</h2>
                    <p className="text-gray-400">{gameRoom.gameState.gameOverReason}</p>
                    <button onClick={() => { setGameRoom(null); setView('setup'); }} className="px-6 py-3 bg-slate-600 hover:bg-slate-700 font-semibold rounded-xl">Quay lại</button>
                 </div>
            );
        }

        return (
             <div className="flex flex-col h-full max-h-[75vh] space-y-4 animate-fade-in text-white">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <img src={player1.photoURL || undefined} className={`w-8 h-8 rounded-full border-2 ${gameRoom.gameState.currentPlayerUid === player1.uid ? 'border-cyan-400' : 'border-transparent'}`} />
                        <span>{player1.displayName}</span>
                    </div>
                     <span className="font-bold">VS</span>
                    <div className="flex items-center gap-2">
                         <span>{player2.displayName}</span>
                         <img src={player2.photoURL || undefined} className={`w-8 h-8 rounded-full border-2 ${gameRoom.gameState.currentPlayerUid === player2.uid ? 'border-cyan-400' : 'border-transparent'}`} />
                    </div>
                </div>
                {isMyTurn && <div className="relative h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                    <div className="absolute top-0 left-0 h-full bg-cyan-400" style={{ width: `${(timeLeft / TURN_DURATION) * 100}%`, transition: 'width 1s linear' }} />
                </div>}
                <div className="flex-grow p-4 bg-slate-800/50 rounded-xl overflow-y-auto space-y-4">
                   {gameRoom.gameState.history.map((item, index) => {
                        const player = gameRoom.players.find(p => p.uid === item.by);
                        const isSelf = player?.uid === currentUser?.uid;
                        return (
                             <div key={index} className={`flex items-start gap-3 ${isSelf ? 'justify-end' : ''}`}>
                                {!isSelf && <img src={player?.photoURL || undefined} className="w-8 h-8 rounded-full bg-indigo-500"/>}
                                <div className={`px-4 py-2 rounded-2xl max-w-xs break-words ${isSelf ? 'bg-slate-600 rounded-br-none' : 'bg-indigo-900/80 rounded-bl-none'}`}>
                                    {item.word}
                                </div>
                                {isSelf && <img src={player?.photoURL || undefined} className="w-8 h-8 rounded-full bg-slate-500" />}
                            </div>
                        )
                   })}
                </div>
                <form onSubmit={handleMultiplayerSubmit} className="flex gap-2">
                     <input
                        type="text"
                        value={playerInput}
                        onChange={e => setPlayerInput(e.target.value)}
                        placeholder={isMyTurn ? "Đến lượt bạn..." : `Chờ ${gameRoom.players.find(p => p.uid !== currentUser?.uid)?.displayName}...`}
                        disabled={!isMyTurn || isProcessing}
                        className="flex-grow w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                    />
                    <button type="submit" disabled={!isMyTurn || isProcessing || !playerInput} className="p-3 bg-indigo-600 rounded-full disabled:bg-indigo-400">
                        {isProcessing ? <Loader2 className="w-6 h-6 animate-spin"/> : <Send className="w-6 h-6"/>}
                    </button>
                </form>
             </div>
        )
    }

    return <div><button onClick={onBack}>Back</button>...Loading</div>;
};

export default VocabularyDuel;