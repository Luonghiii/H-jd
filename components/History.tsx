
import React from 'react';
import { useHistory } from '../hooks/useHistory';
import { HistoryEntry } from '../types';
import { LogIn, PlusSquare, BookOpen, CheckSquare, Award, XCircle, Trash2, Link, Puzzle, Shuffle, BrainCircuit, Volume2 } from 'lucide-react';

const ICONS: { [key in HistoryEntry['type']]: React.ElementType } = {
    LOGIN: LogIn,
    WORDS_ADDED: PlusSquare,
    STORY_GENERATED: BookOpen,
    QUIZ_COMPLETED: CheckSquare,
    MEMORY_MATCH_WON: Award,
    MEMORY_MATCH_LOST: XCircle,
    SENTENCE_SCRAMBLE_WON: Shuffle,
    WORD_GUESS_WON: Puzzle,
    WORD_GUESS_LOST: XCircle,
    WORD_LINK_COMPLETED: Link,
    GRAMMAR_CHECK_COMPLETED: CheckSquare,
    REVIEW_SESSION_COMPLETED: BrainCircuit,
    // FIX: Add missing SPEECH_GENERATED icon type
    SPEECH_GENERATED: Volume2,
};

const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "vài giây trước";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày trước`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} tháng trước`;
    const years = Math.floor(months / 12);
    return `${years} năm trước`;
};

const History: React.FC = () => {
    const { history, clearHistory } = useHistory();

    const renderPayload = (entry: HistoryEntry) => {
        if (!entry.payload) return null;

        if (entry.type === 'QUIZ_COMPLETED' && entry.payload.score) {
            return <span className="text-sm text-indigo-400">({entry.payload.score.correct}/{entry.payload.score.total})</span>
        }
        if (entry.type === 'WORDS_ADDED' && entry.payload.wordCount) {
             return <span className="text-sm text-gray-400">({entry.payload.wordCount} từ)</span>
        }
        if (entry.type === 'MEMORY_MATCH_WON' && entry.payload.moves) {
            return <span className="text-sm text-gray-400">({entry.payload.moves} lượt)</span>
        }
        if ((entry.type === 'WORD_GUESS_WON' || entry.type === 'WORD_GUESS_LOST') && entry.payload.word) {
            return <span className="text-sm text-gray-400">(Từ: {entry.payload.word})</span>
        }
        return null;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="text-center sm:text-left">
                    <h2 className="text-2xl font-bold text-white">Lịch sử hoạt động</h2>
                    <p className="text-gray-400 mt-1">Xem lại các hoạt động học tập gần đây của bạn.</p>
                </div>
                <button 
                    onClick={clearHistory}
                    disabled={history.length === 0}
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-red-600/20 hover:bg-red-600/40 text-red-400 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa lịch sử</span>
                </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto pr-2">
                {history.length > 0 ? (
                    <ul className="space-y-3">
                        {history.map(entry => {
                            const Icon = ICONS[entry.type] || BookOpen;
                            return (
                                <li key={entry.id} className="flex items-start gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                    <div className="p-2 bg-slate-700/50 rounded-full">
                                        <Icon className="w-5 h-5 text-gray-300" />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-medium text-white">{entry.details} {renderPayload(entry)}</p>
                                        <p className="text-sm text-gray-500">
                                            {formatTimeAgo(entry.timestamp)}
                                        </p>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                ) : (
                    <p className="text-center text-gray-400 py-16">Chưa có hoạt động nào được ghi lại.</p>
                )}
            </div>
        </div>
    );
};

export default History;