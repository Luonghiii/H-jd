import React, { useState, useEffect } from 'react';
import { GeneratedWord } from '../types';
import { useVocabulary } from '../hooks/useVocabulary';
import { X, AlertCircle } from 'lucide-react';

interface ReviewWord extends GeneratedWord {
    id: number;
    exists: boolean;
    selected: boolean;
}

interface AddWordsReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    generatedWords: GeneratedWord[];
    onConfirm: (wordsToAdd: GeneratedWord[]) => void;
}

const AddWordsReviewModal: React.FC<AddWordsReviewModalProps> = ({ isOpen, onClose, generatedWords, onConfirm }) => {
    const { words: existingWords } = useVocabulary();
    const [reviewWords, setReviewWords] = useState<ReviewWord[]>([]);

    useEffect(() => {
        if (isOpen) {
            const existingWordSet = new Set(existingWords.map(w => w.word.toLowerCase()));
            const initialReviewWords = generatedWords.map((word, index) => {
                const exists = existingWordSet.has(word.word.toLowerCase());
                return {
                    ...word,
                    id: index,
                    exists,
                    selected: !exists,
                };
            });
            setReviewWords(initialReviewWords);
        }
    }, [isOpen, generatedWords, existingWords]);

    const handleFieldChange = (id: number, field: keyof GeneratedWord, value: string) => {
        setReviewWords(prev =>
            prev.map(word => (word.id === id ? { ...word, [field]: value } : word))
        );
    };

    const handleToggleSelect = (id: number) => {
        setReviewWords(prev =>
            prev.map(word => (word.id === id ? { ...word, selected: !word.selected } : word))
        );
    };
    
    const handleToggleSelectAll = () => {
        const areAllSelected = reviewWords.every(w => w.selected || w.exists);
        setReviewWords(prev => prev.map(w => w.exists ? w : {...w, selected: !areAllSelected }));
    }

    const handleConfirm = () => {
        const wordsToAdd = reviewWords
            .filter(word => word.selected && !word.exists)
            .map(({ id, exists, selected, ...rest }) => rest);
        onConfirm(wordsToAdd);
    };
    
    const selectedCount = reviewWords.filter(w => w.selected && !w.exists).length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">Xem lại và Thêm từ</h2>
                    <button onClick={onClose}><X className="w-5 h-5" /></button>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-400">AI đã tìm thấy {generatedWords.length} từ. Chỉnh sửa nếu cần.</p>
                        <button onClick={handleToggleSelectAll} className="text-sm text-indigo-400 hover:underline">
                            {reviewWords.every(w => w.selected || w.exists) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </button>
                    </div>
                    <div className="space-y-3">
                        {reviewWords.map(word => (
                            <div key={word.id} className={`p-3 rounded-lg border ${word.exists ? 'bg-slate-700/50 border-slate-600 opacity-60' : 'bg-slate-900/50 border-slate-700'}`}>
                                <div className="flex items-start gap-4">
                                    <input
                                        type="checkbox"
                                        checked={word.selected}
                                        disabled={word.exists}
                                        onChange={() => handleToggleSelect(word.id)}
                                        className="mt-1.5 w-5 h-5 bg-slate-700 border-slate-500 text-indigo-500 focus:ring-indigo-600 rounded disabled:opacity-50"
                                    />
                                    <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                        <input
                                            type="text"
                                            value={word.word}
                                            onChange={e => handleFieldChange(word.id, 'word', e.target.value)}
                                            className="w-full bg-transparent border-b border-slate-600 focus:border-indigo-500 outline-none text-white font-semibold"
                                            placeholder="Từ"
                                            disabled={word.exists}
                                        />
                                        <input
                                            type="text"
                                            value={word.theme}
                                            onChange={e => handleFieldChange(word.id, 'theme', e.target.value)}
                                            className="w-full bg-transparent border-b border-slate-600 focus:border-indigo-500 outline-none text-gray-400 text-sm"
                                            placeholder="Chủ đề"
                                            disabled={word.exists}
                                        />
                                        <input
                                            type="text"
                                            value={word.translation_vi}
                                            onChange={e => handleFieldChange(word.id, 'translation_vi', e.target.value)}
                                            className="w-full bg-transparent border-b border-slate-600 focus:border-indigo-500 outline-none text-gray-300 text-sm"
                                            placeholder="Nghĩa tiếng Việt"
                                            disabled={word.exists}
                                        />
                                        <input
                                            type="text"
                                            value={word.translation_en}
                                            onChange={e => handleFieldChange(word.id, 'translation_en', e.target.value)}
                                            className="w-full bg-transparent border-b border-slate-600 focus:border-indigo-500 outline-none text-gray-300 text-sm"
                                            placeholder="Nghĩa tiếng Anh"
                                            disabled={word.exists}
                                        />
                                    </div>
                                    {word.exists && (
                                        <div className="flex-shrink-0 flex items-center gap-1 text-amber-400 text-xs mt-1">
                                            <AlertCircle className="w-4 h-4" />
                                            <span>Đã có</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 bg-slate-900/50 flex justify-end flex-shrink-0">
                    <button onClick={handleConfirm} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:bg-indigo-400 disabled:cursor-not-allowed" disabled={selectedCount === 0}>
                       Thêm {selectedCount} từ đã chọn
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddWordsReviewModal;
