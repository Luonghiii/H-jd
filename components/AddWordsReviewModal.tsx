import React, { useState, useEffect } from 'react';
import { GeneratedWord } from '../types';
import { X, Check } from 'lucide-react';

interface AddWordsReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    generatedWords: GeneratedWord[];
    onConfirm: (wordsToAdd: GeneratedWord[]) => void;
}

const AddWordsReviewModal: React.FC<AddWordsReviewModalProps> = ({ isOpen, onClose, generatedWords, onConfirm }) => {
    const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (generatedWords) {
            setSelectedWords(new Set(generatedWords.map(w => w.word)));
        }
    }, [generatedWords]);

    if (!isOpen) return null;

    const handleToggleWord = (word: string) => {
        setSelectedWords(prev => {
            const newSet = new Set(prev);
            if (newSet.has(word)) {
                newSet.delete(word);
            } else {
                newSet.add(word);
            }
            return newSet;
        });
    };

    const handleConfirm = () => {
        const wordsToAdd = generatedWords.filter(w => selectedWords.has(w.word));
        onConfirm(wordsToAdd);
    };

    const handleToggleSelectAll = () => {
        if (selectedWords.size === generatedWords.length) {
            setSelectedWords(new Set());
        } else {
            setSelectedWords(new Set(generatedWords.map(w => w.word)));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">Xem lại từ do AI tạo</h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
                </div>

                <div className="p-4 space-y-3 overflow-y-auto">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-400">Chọn các từ bạn muốn thêm:</p>
                        <button onClick={handleToggleSelectAll} className="text-sm font-medium text-indigo-400 hover:underline">
                            {selectedWords.size === generatedWords.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {generatedWords.map(word => (
                             <div 
                                key={word.word}
                                onClick={() => handleToggleWord(word.word)}
                                className={`p-2 rounded-lg flex items-start gap-2 cursor-pointer transition-colors ${selectedWords.has(word.word) ? 'bg-indigo-900/50' : 'bg-slate-700/50 hover:bg-slate-700'}`}
                             >
                                <div className={`mt-1 flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center border-2 ${selectedWords.has(word.word) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500'}`}>
                                    {selectedWords.has(word.word) && <Check className="w-4 h-4 text-white" />}
                                </div>
                                <div>
                                    <p className="font-medium text-white">{word.word}</p>
                                    <p className="text-xs text-gray-400">{word.translation_vi}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-slate-900/50 flex justify-end flex-shrink-0">
                    <button 
                        onClick={handleConfirm}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:bg-indigo-400"
                        disabled={selectedWords.size === 0}
                    >
                       Thêm {selectedWords.size} từ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddWordsReviewModal;