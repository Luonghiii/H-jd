import React, { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useHistory as useActivityHistory } from '../hooks/useHistory';
import { checkGrammar, generateWritingPrompt } from '../services/geminiService';
import { ArrowLeft, CheckCircle, RefreshCw, Sparkles, Wand2, Clock, ChevronDown, Trash2 } from 'lucide-react';
import eventBus from '../utils/eventBus';
import { AiGrammarHistoryEntry } from '../types';

interface GrammarCheckerProps {
  onBack: () => void;
}

type Feedback = {
    correctedText: string;
    feedback: { error: string; correction: string; explanation: string }[];
} | null;

const GrammarChecker: React.FC<GrammarCheckerProps> = ({ onBack }) => {
    const { learningLanguage, uiLanguage, addXp, aiGrammarHistory, saveGrammarCheck, clearGrammarHistory } = useSettings();
    const { addHistoryEntry } = useActivityHistory();
    const [text, setText] = useState('');
    const [feedback, setFeedback] = useState<Feedback>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [isPromptLoading, setIsPromptLoading] = useState(false);

    const handleGeneratePrompt = async () => {
        setIsPromptLoading(true);
        try {
            const newPrompt = await generateWritingPrompt(uiLanguage);
            setPrompt(newPrompt);
        } catch (error) {
            console.error("Failed to generate prompt:", error);
            setPrompt("Gợi ý: Sở thích của bạn là gì?");
        }
        setIsPromptLoading(false);
    };
    
    useEffect(() => {
        handleGeneratePrompt();
    }, []);

    const handleCheck = async () => {
        if (!text.trim() || isLoading) return;
        setIsLoading(true);
        setFeedback(null);
        eventBus.dispatch('notification', { type: 'info', message: 'AI đang kiểm tra ngữ pháp...' });
        try {
            const result = await checkGrammar(text, learningLanguage, uiLanguage);
            if (result) {
                setFeedback(result);
                await saveGrammarCheck({ originalText: text, correctedText: result.correctedText, feedback: result.feedback });
                addHistoryEntry('GRAMMAR_CHECK_COMPLETED', 'Đã sử dụng công cụ kiểm tra ngữ pháp.');
                addXp(10); // Grant 10 XP for using the grammar checker
            } else {
                 eventBus.dispatch('notification', { type: 'error', message: 'Không nhận được phản hồi hợp lệ từ AI.' });
            }
        } catch (error) {
            console.error(error);
            alert('Đã xảy ra lỗi khi kiểm tra ngữ pháp.');
        }
        setIsLoading(false);
    };
    
    const handleRestoreFromHistory = (item: AiGrammarHistoryEntry) => {
        setText(item.originalText);
        setFeedback({ correctedText: item.correctedText, feedback: item.feedback });
        eventBus.dispatch('notification', { type: 'info', message: 'Đã khôi phục từ lịch sử.' });
    };

    const langName = learningLanguage === 'german' ? 'tiếng Đức' : learningLanguage === 'english' ? 'tiếng Anh' : 'tiếng Trung';

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="text-center sm:text-left">
                    <h2 className="text-2xl font-bold text-white">AI Sửa lỗi Ngữ pháp</h2>
                    <p className="text-gray-400 mt-1">Để AI giúp bạn cải thiện kỹ năng viết.</p>
                </div>
                <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 text-gray-200 font-semibold rounded-xl transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay lại</span>
                </button>
            </div>
            
            <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 flex items-center justify-between gap-2">
                <p className="text-sm text-gray-300 flex-grow">
                    <strong>Chủ đề:</strong> {isPromptLoading ? '...' : prompt}
                </p>
                <button onClick={handleGeneratePrompt} disabled={isPromptLoading} className="p-2 text-indigo-400 hover:bg-slate-700 rounded-full disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 ${isPromptLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            
            <div className="space-y-4">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={`Viết bài của bạn bằng ${langName} ở đây...`}
                    className="w-full p-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={6}
                    disabled={isLoading}
                />
                <button
                    onClick={handleCheck}
                    disabled={!text.trim() || isLoading}
                    className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                            Đang kiểm tra...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-5 h-5 mr-2" />
                            Kiểm tra với AI
                        </>
                    )}
                </button>
            </div>
            
            {feedback && (
                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-4 animate-fade-in">
                     <div className="flex items-center">
                        <CheckCircle className="w-6 h-6 mr-3 text-green-400" />
                        <h3 className="text-lg font-semibold text-white">Văn bản đã sửa</h3>
                    </div>
                    <div className="p-3 bg-slate-700/50 rounded-lg text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {feedback.correctedText}
                    </div>

                    {feedback.feedback.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-white mb-2">Giải thích chi tiết:</h4>
                            <div className="space-y-2">
                                {feedback.feedback.map((item, index) => (
                                    <div key={index} className="p-3 border-l-4 border-amber-500 bg-slate-900/50 rounded-r-lg">
                                        <p><span className="text-red-400 line-through">{item.error}</span> → <span className="text-green-400 font-medium">{item.correction}</span></p>
                                        <p className="text-sm text-gray-400 mt-1">{item.explanation}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {aiGrammarHistory.length > 0 && (
                <div className="pt-6 mt-6 border-t border-slate-700">
                    <details className="group">
                        <summary className="cursor-pointer font-semibold text-white flex justify-between items-center list-none">
                            <span className="flex items-center gap-2"><Clock className="w-5 h-5 text-gray-400"/> Lịch sử kiểm tra ({aiGrammarHistory.length})</span>
                            <ChevronDown className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="mt-4 max-h-60 overflow-y-auto space-y-2 pr-2">
                            {aiGrammarHistory.map(item => (
                                <div key={item.id} onClick={() => handleRestoreFromHistory(item)} className="p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700">
                                    <p className="font-semibold text-sm truncate text-gray-200">{item.originalText}</p>
                                    <p className="text-xs text-gray-400 mt-1">{new Date(item.timestamp).toLocaleString('vi-VN')}</p>
                                </div>
                            ))}
                        </div>
                        <button onClick={clearGrammarHistory} className="flex items-center gap-1 text-xs text-red-400 hover:underline mt-2">
                            <Trash2 className="w-3 h-3"/> Xóa lịch sử
                        </button>
                    </details>
                </div>
            )}
        </div>
    );
};

export default GrammarChecker;