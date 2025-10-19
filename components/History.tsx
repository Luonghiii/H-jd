import React, { useState, useMemo } from 'react';
import { useHistory } from '../hooks/useHistory';
import { HistoryEntry } from '../types';
import { useInspector } from '../hooks/useInspector';
import { useVocabulary } from '../hooks/useVocabulary';
import { LogIn, LogOut, PlusSquare, BookOpen, CheckSquare, Award, XCircle, Trash2, Link, Puzzle, Shuffle, BrainCircuit, Volume2, Wand2, Image as ImageIcon, Search, PenSquare, Layers, ChevronDown, Dices, RefreshCw, Library, MessageCircle } from 'lucide-react';

const ICONS: { [key in HistoryEntry['type']]: React.ElementType } = {
    LOGIN: LogIn,
    LOGOUT: LogOut,
    WORDS_ADDED: PlusSquare,
    STORY_GENERATED: BookOpen,
    SENTENCE_GENERATED: Wand2,
    IMAGE_OBJECT_IDENTIFIED: ImageIcon,
    QUIZ_COMPLETED: CheckSquare,
    PRACTICE_SESSION_COMPLETED: PenSquare,
    FLASHCARDS_SESSION_STARTED: Layers,
    MEMORY_MATCH_WON: Award,
    MEMORY_MATCH_LOST: XCircle,
    SENTENCE_SCRAMBLE_WON: Shuffle,
    WORD_GUESS_WON: Puzzle,
    WORD_GUESS_LOST: XCircle,
    WORD_LINK_COMPLETED: Link,
    GRAMMAR_CHECK_COMPLETED: CheckSquare,
    REVIEW_SESSION_COMPLETED: BrainCircuit,
    SPEECH_GENERATED: Volume2,
    LUCKY_WHEEL_CORRECT_ANSWER: Dices,
    AI_LESSON_GENERATED: Library,
    AI_TUTOR_SESSION_COMPLETED: MessageCircle,
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

const formatFullDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};

const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
};

const isYesterday = (date: Date) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.getDate() === yesterday.getDate() &&
           date.getMonth() === yesterday.getMonth() &&
           date.getFullYear() === yesterday.getFullYear();
};

const History: React.FC = () => {
    const { history, loadMoreHistory, isLoadingMore, hasMore } = useHistory();
    const { openInspector } = useInspector();
    const { words } = useVocabulary();
    const [searchTerm, setSearchTerm] = useState('');

    const groupedHistory = useMemo(() => {
        const filtered = searchTerm
            ? history.filter(entry =>
                entry.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (entry.payload?.word && typeof entry.payload.word === 'string' && entry.payload.word.toLowerCase().includes(searchTerm.toLowerCase()))
              )
            : history;

        return filtered.reduce<Record<string, HistoryEntry[]>>((acc, entry) => {
            const entryDate = new Date(entry.timestamp);
            let key = '';

            if (isToday(entryDate)) {
                key = 'Hôm nay';
            } else if (isYesterday(entryDate)) {
                key = 'Hôm qua';
            } else {
                key = entryDate.toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }

            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(entry);
            return acc;
        }, {});
    }, [history, searchTerm]);

    const sortedGroupKeys = useMemo(() => {
        const keys = Object.keys(groupedHistory);
        return keys.sort((a, b) => {
            if (a === 'Hôm nay') return -1;
            if (b === 'Hôm nay') return 1;
            if (a === 'Hôm qua') return -1;
            if (b === 'Hôm qua') return 1;
            
            const timestampA = groupedHistory[a][0]?.timestamp || 0;
            const timestampB = groupedHistory[b][0]?.timestamp || 0;
            
            return timestampB - timestampA;
        });
    }, [groupedHistory]);


    const handleEntryClick = (entry: HistoryEntry) => {
        if (entry.payload?.word) {
            const wordObject = words.find(w => w.word === entry.payload.word);
            if (wordObject) {
                openInspector(wordObject);
            }
        }
    };

    const renderPayload = (entry: HistoryEntry) => {
        if (!entry.payload) return null;

        if (entry.type === 'QUIZ_COMPLETED' && entry.payload.score) {
            return <span className="text-sm text-indigo-400">({entry.payload.score.correct}/{entry.payload.score.total})</span>
        }
        if ((entry.type === 'WORDS_ADDED' || entry.type === 'PRACTICE_SESSION_COMPLETED' || entry.type === 'FLASHCARDS_SESSION_STARTED') && entry.payload.count) {
             return <span className="text-sm text-gray-400">({entry.payload.count} từ)</span>
        }
        if (entry.type === 'MEMORY_MATCH_WON' && entry.payload.moves) {
            return <span className="text-sm text-gray-400">({entry.payload.moves} lượt)</span>
        }
        if ((entry.type === 'WORD_GUESS_WON' || entry.type === 'WORD_GUESS_LOST') && entry.payload.word) {
            return <span className="text-sm text-gray-400">(Từ: {entry.payload.word})</span>
        }
        if (entry.type === 'AI_TUTOR_SESSION_COMPLETED' && entry.payload.turnCount) {
             return <span className="text-sm text-gray-400">({entry.payload.turnCount} lượt)</span>
        }
        return null;
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white">Lịch sử hoạt động</h2>
                <p className="text-gray-400 mt-1">Xem lại các hoạt động học tập gần đây của bạn.</p>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                    type="text"
                    placeholder="Tìm kiếm trong lịch sử..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            
            <div className="max-h-[55vh] overflow-y-auto pr-2">
                {Object.keys(groupedHistory).length > 0 ? (
                    <div className="space-y-4">
                        {sortedGroupKeys.map(date => {
                            const entries = groupedHistory[date];
                            return (
                            <details key={date} className="group" open={date === 'Hôm nay'}>
                                <summary className="list-none flex items-center justify-between cursor-pointer p-3 bg-slate-800/60 rounded-xl sticky top-0 backdrop-blur-sm border-b border-slate-700">
                                    <h3 className="font-semibold text-white">{date} ({entries.length})</h3>
                                    <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform"/>
                                </summary>
                                <div className="space-y-3 mt-2">
                                    {entries.map(entry => {
                                        const Icon = ICONS[entry.type] || BookOpen;
                                        const isClickable = !!entry.payload?.word && words.some(w => w.word === entry.payload.word);
                                        return (
                                            <div 
                                                key={entry.id}
                                                onClick={() => handleEntryClick(entry)}
                                                className={`flex items-start gap-4 p-4 rounded-xl ${isClickable ? 'cursor-pointer bg-slate-800/50 hover:bg-slate-700/50 hover:scale-[1.01] transition-all duration-200' : 'bg-slate-800/50'}`}
                                            >
                                                <div className="p-2 bg-slate-700/50 rounded-full flex-shrink-0 mt-1">
                                                    <Icon className="w-5 h-5 text-gray-300" />
                                                </div>
                                                <div className="flex-grow">
                                                    <p className="font-medium text-white">{entry.details} {renderPayload(entry)}</p>
                                                    <p className="text-sm text-gray-500" title={formatFullDateTime(entry.timestamp)}>
                                                        {formatTimeAgo(entry.timestamp)}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </details>
                        )})}
                    </div>
                ) : (
                    <p className="text-center text-gray-400 py-16">
                        {history.length > 0 ? "Không tìm thấy kết quả phù hợp." : "Chưa có hoạt động nào được ghi lại."}
                    </p>
                )}
                 {history.length > 0 && !searchTerm && (
                    <div className="mt-4 text-center">
                        {hasMore ? (
                            <button onClick={loadMoreHistory} disabled={isLoadingMore} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-sm rounded-lg disabled:opacity-50">
                                {isLoadingMore ? <><RefreshCw className="w-4 h-4 inline mr-2 animate-spin"/> Đang tải...</> : 'Tải thêm'}
                            </button>
                        ) : (
                            <p className="text-sm text-gray-500">Đã tải tất cả lịch sử.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default History;