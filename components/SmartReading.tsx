import React, { useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useHistory } from '../hooks/useHistory';
import { findAndSummarizeArticle } from '../services/geminiService';
import { ArticleResult } from '../types';
import { ArrowLeft, Search, RefreshCw, Globe } from 'lucide-react';
import HighlightableText from './HighlightableText';
import { useVocabulary } from '../hooks/useVocabulary';
import eventBus from '../utils/eventBus';

interface SmartReadingProps {
  onBack: () => void;
}

const SmartReading: React.FC<SmartReadingProps> = ({ onBack }) => {
    const { learningLanguage, addXp } = useSettings();
    const { addHistoryEntry } = useHistory();
    const { words } = useVocabulary(); // for HighlightableText

    const [topic, setTopic] = useState('');
    const [mode, setMode] = useState<'summary' | 'full'>('summary');
    const [isLoading, setIsLoading] = useState(false);
    const [article, setArticle] = useState<ArticleResult | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim() || isLoading) return;

        setIsLoading(true);
        setArticle(null);
        eventBus.dispatch('notification', { type: 'info', message: 'AI đang tìm và xử lý bài báo...' });

        try {
            const result = await findAndSummarizeArticle(topic, learningLanguage, mode);
            if (result && result.text) {
                setArticle(result);
                addHistoryEntry('SMART_READING_COMPLETED', `Đọc bài báo về chủ đề: "${topic}"`, { topic, mode });
                addXp(15);
            } else {
                eventBus.dispatch('notification', { type: 'warning', message: 'Không tìm thấy bài báo phù hợp. Vui lòng thử một chủ đề khác.' });
            }
        } catch (error) {
            console.error("Smart Reading failed:", error);
            eventBus.dispatch('notification', { type: 'error', message: 'Đã xảy ra lỗi khi tìm kiếm bài báo.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in text-white">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Đọc Thông minh</h2>
                    <p className="text-gray-400 mt-1">Nhập chủ đề để AI tìm bài báo cho bạn đọc.</p>
                </div>
                <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 rounded-xl">
                    <ArrowLeft className="w-4 h-4" /> <span>Quay lại</span>
                </button>
            </div>
            
             <div className="flex justify-center p-1 bg-slate-800/60 rounded-full mb-4">
                <button onClick={() => setMode('summary')} className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all ${mode === 'summary' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-700'}`}>
                    Tóm tắt
                </button>
                <button onClick={() => setMode('full')} className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all ${mode === 'full' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-700'}`}>
                    Toàn bộ bài viết
                </button>
            </div>
            
            <form onSubmit={handleSearch} className="flex gap-2">
                <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Nhập chủ đề bạn quan tâm..."
                    className="flex-grow px-4 py-2 bg-slate-800 border border-slate-600 rounded-xl"
                    disabled={isLoading}
                />
                <button type="submit" disabled={!topic.trim() || isLoading} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl font-semibold disabled:bg-indigo-400">
                    {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    <span>Tìm</span>
                </button>
            </form>

            {article && (
                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-2xl space-y-4">
                    <h3 className="text-xl font-bold">Bài báo về: {topic}</h3>
                    <div className="text-gray-300 whitespace-pre-wrap leading-relaxed text-base max-h-[40vh] overflow-y-auto pr-2">
                        <HighlightableText text={article.text} words={words} />
                    </div>
                    {article.sources && article.sources.length > 0 && (
                        <div className="pt-4 border-t border-slate-600">
                            <h4 className="flex items-center gap-2 font-semibold text-white mb-2">
                                <Globe className="w-4 h-4 text-cyan-400" />
                                Nguồn
                            </h4>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                {article.sources.map((source, index) => (
                                    <li key={index}>
                                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline break-all">
                                            {source.title || new URL(source.uri).hostname}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SmartReading;