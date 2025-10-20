import React, { useState } from 'react';
import { VocabularyWord } from '../types';
import { useSettings } from '../hooks/useSettings';
import { getAiSuggestedWords } from '../services/geminiService';
import { X, Sparkles, Send, Loader2 } from 'lucide-react';

interface AiWordSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableWords: VocabularyWord[];
    onConfirm: (selectedWords: VocabularyWord[]) => void;
}

const AiWordSelectorModal: React.FC<AiWordSelectorModalProps> = ({ isOpen, onClose, availableWords, onConfirm }) => {
    const { learningLanguage } = useSettings();
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestedWords, setSuggestedWords] = useState<VocabularyWord[] | null>(null);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isLoading) return;

        setIsLoading(true);
        setError('');
        setSuggestedWords(null);

        try {
            const result = await getAiSuggestedWords(prompt, availableWords, learningLanguage);
            if (result && result.length > 0) {
                setSuggestedWords(result);
            } else {
                setError('AI không tìm thấy từ nào phù hợp với yêu cầu của bạn. Hãy thử một yêu cầu khác.');
            }
        } catch (err) {
            console.error(err);
            setError('Đã có lỗi xảy ra khi giao tiếp với AI. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = () => {
        if (suggestedWords) {
            onConfirm(suggestedWords);
            handleClose();
        }
    };
    
    const handleClose = () => {
        setPrompt('');
        setSuggestedWords(null);
        setError('');
        onClose();
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleClose}>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-400"/> Trợ lý AI chọn từ</h2>
                    <button onClick={handleClose}><X className="w-5 h-5 text-gray-400" /></button>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto">
                    <form onSubmit={handleGenerate} className="flex gap-2 items-start">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Nhập yêu cầu của bạn, ví dụ: '10 từ về thức ăn', '5 từ khó nhất', 'các từ tôi cần ôn tập'..."
                            className="flex-grow px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-sm text-white resize-none"
                            rows={2}
                            disabled={isLoading}
                        />
                         <button type="submit" disabled={!prompt.trim() || isLoading} className="p-3 bg-indigo-600 rounded-lg text-white disabled:bg-indigo-400">
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5"/>}
                        </button>
                    </form>

                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                    
                    {suggestedWords && (
                        <div className="p-3 bg-slate-900/50 rounded-xl animate-fade-in">
                            <h3 className="font-semibold text-white mb-2">AI đề xuất {suggestedWords.length} từ:</h3>
                            <div className="max-h-60 overflow-y-auto pr-2 space-y-1">
                                {suggestedWords.map(word => (
                                    <div key={word.id} className="text-sm text-gray-300 p-1.5 bg-slate-700/50 rounded-md">{word.word}</div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-900/50 flex justify-end flex-shrink-0">
                    <button 
                        onClick={handleConfirm} 
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:bg-indigo-400 disabled:cursor-not-allowed" 
                        disabled={!suggestedWords || isLoading}
                    >
                       Sử dụng bộ từ này
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AiWordSelectorModal;
