import React, { useState } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { generateGermanSentence } from '../services/geminiService';
import { VocabularyWord } from '../types';
import { RefreshCw, Wand2 } from 'lucide-react';

const SentenceGenerator: React.FC = () => {
    const { words } = useVocabulary();
    const { targetLanguage } = useSettings();
    const [selectedWord, setSelectedWord] = useState<VocabularyWord | null>(null);
    const [germanSentence, setGermanSentence] = useState('');
    const [translation, setTranslation] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleWordClick = async (word: VocabularyWord) => {
        if (isLoading) return;
        setSelectedWord(word);
        setIsLoading(true);
        setGermanSentence('');
        setTranslation('');

        const result = await generateGermanSentence(word, targetLanguage);
        const parts = result.split('---Translation---');
        if (parts.length === 2) {
            setGermanSentence(parts[0].trim());
            setTranslation(parts[1].trim());
        } else {
            setGermanSentence(result.trim());
            setTranslation('');
        }
        setIsLoading(false);
    };
    
    if (words.length === 0) {
      return (
        <div className="text-center py-10">
          <h2 className="text-2xl font-bold text-white">AI Tạo câu</h2>
          <p className="text-gray-400 mt-2">
            Thêm vài từ vào danh sách để bắt đầu tạo câu ví dụ.
          </p>
        </div>
      );
    }
    
    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white">AI Tạo câu</h2>
                <p className="text-gray-400 mt-1">Chọn một từ để tạo câu ví dụ.</p>
            </div>

            {isLoading && (
                 <div className="flex justify-center items-center p-6 bg-slate-800/50 rounded-lg">
                     <RefreshCw className="w-6 h-6 mr-3 animate-spin text-indigo-400" />
                     <p className="text-white">Đang tạo câu cho "{selectedWord?.german}"...</p>
                 </div>
            )}

            {germanSentence && !isLoading && (
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-4">
                    <h3 className="text-lg font-semibold text-white">Ví dụ cho <span className="text-cyan-300">{selectedWord?.german}</span></h3>
                    <div>
                        <h4 className="font-semibold text-gray-300 mb-2">Câu tiếng Đức</h4>
                        <p className="text-white text-lg whitespace-pre-wrap leading-relaxed">{germanSentence}</p>
                    </div>
                    {translation && (
                        <div className="border-t border-slate-600 pt-4 mt-4">
                            <h4 className="font-semibold text-gray-400 mb-2">Bản dịch</h4>
                            <p className="text-gray-400 whitespace-pre-wrap leading-relaxed">{translation}</p>
                        </div>
                    )}
                </div>
            )}

            <div className="pt-2">
                <h3 className="font-semibold text-white mb-3">Chọn một từ từ danh sách của bạn:</h3>
                <div className="max-h-[45vh] overflow-y-auto pr-2">
                    <ul className="space-y-3">
                        {words.map(word => (
                            <li key={word.id}>
                                <button
                                    onClick={() => handleWordClick(word)}
                                    disabled={isLoading}
                                    className={`w-full flex items-center justify-between text-left bg-slate-800/50 p-3 rounded-lg border border-slate-700 transition-all duration-200
                                    ${selectedWord?.id === word.id && !isLoading ? 'ring-2 ring-indigo-500' : 'hover:bg-slate-700/80'}
                                    disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <div>
                                        <p className="font-semibold text-white">{word.german}</p>
                                        <p className="text-sm text-gray-400">{word.translation[targetLanguage]}</p>
                                    </div>
                                    <Wand2 className="w-5 h-5 text-gray-400" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default SentenceGenerator;