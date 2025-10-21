import React, { useState, useEffect } from 'react';
import { CommunityDeck, CommunityDeckWord } from '../types';
import { X, Check } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

interface CommunityDeckPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    deck: CommunityDeck | null;
    onConfirm: (wordsToAdd: CommunityDeckWord[]) => void;
}

const CommunityDeckPreviewModal: React.FC<CommunityDeckPreviewModalProps> = ({ isOpen, onClose, deck, onConfirm }) => {
    const { t } = useI18n();
    const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (deck) {
            setSelectedWords(new Set(deck.words.map(w => w.word)));
        }
    }, [deck]);

    if (!isOpen || !deck) return null;

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
    
    const handleToggleSelectAll = () => {
        if (selectedWords.size === deck.words.length) {
            setSelectedWords(new Set());
        } else {
            setSelectedWords(new Set(deck.words.map(w => w.word)));
        }
    }

    const handleConfirm = () => {
        const wordsToAdd = deck.words.filter(w => selectedWords.has(w.word));
        onConfirm(wordsToAdd);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white/90 backdrop-blur-lg border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 flex items-start justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{deck.title}</h2>
                        <p className="text-sm text-slate-600">{deck.description}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:bg-black/10 rounded-full"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-4 space-y-3 overflow-y-auto">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-500">Chọn từ để thêm:</p>
                        <button onClick={handleToggleSelectAll} className="text-sm font-medium text-indigo-600 hover:underline">
                            {selectedWords.size === deck.words.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {deck.words.map(word => (
                             <div 
                                key={word.word}
                                onClick={() => handleToggleWord(word.word)}
                                className={`p-2 rounded-lg flex items-start gap-2 cursor-pointer transition-colors ${selectedWords.has(word.word) ? 'bg-indigo-100' : 'bg-slate-100 hover:bg-slate-200'}`}
                             >
                                <div className={`mt-1 flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center border-2 ${selectedWords.has(word.word) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'}`}>
                                    {selectedWords.has(word.word) && <Check className="w-4 h-4 text-white" />}
                                </div>
                                <div>
                                    <p className="font-medium text-slate-800">{word.word}</p>
                                    <p className="text-xs text-slate-500">{word.translation_vi}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 bg-slate-100/50 border-t border-slate-200 flex justify-end flex-shrink-0">
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

export default CommunityDeckPreviewModal;