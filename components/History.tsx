import React, { useState, useMemo } from 'react';
import { useHistory } from '../hooks/useHistory';
import { HistoryEntry } from '../types';
import { useInspector } from '../hooks/useInspector';
import { useVocabulary } from '../hooks/useVocabulary';
import { LogIn, LogOut, PlusSquare, BookOpen, CheckSquare, Award, XCircle, Trash2, Link, Puzzle, Shuffle, BrainCircuit, Volume2, Wand2, Image as ImageIcon, Search } from 'lucide-react';

const ICONS: { [key in HistoryEntry['type']]: React.ElementType } = {
    LOGIN: LogIn,
    LOGOUT: LogOut,
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
    SPEECH_GENERATED: Volume2,
    SENTENCE_GENERATED: Wand2,
    IMAGE_OBJECT_IDENTIFIED: ImageIcon,
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

const History: React.FC = () => {
    const { history, clearHistory } = useHistory();
    const { openInspector } = useInspector();
    const { words } = useVocabulary();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredHistory = useMemo(() => {
        if (!searchTerm) return history;
        const lowerSearch = searchTerm.toLowerCase();
        return history.filter(entry => 
            entry.details.toLowerCase().includes(lowerSearch) ||
            entry.payload?.word?.toLowerCase().includes(lowerSearch)
        );
    }, [history, searchTerm]);

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
            <div className="flex justify-between items-center flex-wrap gap-4">
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
                {filteredHistory.length > 0 ? (
                    <ul className="space-y-3">
                        {filteredHistory.map(entry => {
                            const Icon = ICONS[entry.type] || BookOpen;
                            const isClickable = !!entry.payload?.word && words.some(w => w.word === entry.payload.word);
                            return (
                                <li 
                                    key={entry.id}
                                    onClick={() => handleEntryClick(entry)}
                                    className={`flex items-start gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700 transition-colors ${isClickable ? 'cursor-pointer hover:bg-slate-700/50 hover:border-slate-600' : ''}`}
                                >
                                    <div className="p-2 bg-slate-700/50 rounded-full">
                                        <Icon className="w-5 h-5 text-gray-300" />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-medium text-white">{entry.details} {renderPayload(entry)}</p>
                                        <p className="text-sm text-gray-500" title={formatFullDateTime(entry.timestamp)}>
                                            {formatTimeAgo(entry.timestamp)}
                                        </p>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                ) : (
                    <p className="text-center text-gray-400 py-16">
                        {history.length > 0 ? "Không tìm thấy kết quả phù hợp." : "Chưa có hoạt động nào được ghi lại."}
                    </p>
                )}
            </div>
        </div>
    );
};

export default History;