import React, { useState } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { useHistory } from '../hooks/useHistory';
import { generateSentence } from '../services/geminiService';
import { VocabularyWord } from '../types';
import { RefreshCw, Wand2, ArrowLeft } from 'lucide-react';
import HighlightableText from './HighlightableText';

interface SentenceGeneratorProps {
  onBack: () => void;
}

const SentenceGenerator: React.FC<SentenceGeneratorProps> = ({ onBack }) => {
    const { words } = useVocabulary();
    const { uiLanguage, learningLanguage, recordActivity } = useSettings();
    const { addHistoryEntry } = useHistory();
    const [selectedWord, setSelectedWord] = useState<VocabularyWord | null>(null);
    const [generatedSentence, setGeneratedSentence] = useState('');
    const [translation, setTranslation] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleWordClick = async (word: VocabularyWord) => {
        if (isLoading) return;
        setSelectedWord(word);
        setIsLoading(true);
        setGeneratedSentence('');
        setTranslation('');

        const result = await generateSentence(word, uiLanguage, learningLanguage);
        addHistoryEntry('SENTENCE_GENERATED', `Tạo câu ví dụ cho từ "${word.word}".`, { word: word.word });
        recordActivity();
        const parts = result.split('---Translation---');
        if (parts.length === 2) {
            setGeneratedSentence(parts[0].trim());
            setTranslation(parts[1].trim());
        } else {
            setGeneratedSentence(result.trim());
            setTranslation('');
        }
        setIsLoading(false);
    };
    
    const languageNameMap = {
      german: 'tiếng Đức',
      english: 'tiếng Anh',
      chinese: 'tiếng Trung'
    };
    
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="text-center sm:text-left">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">AI Tạo câu</h2>
                  <p className="text-slate-500 dark:text-gray-400 mt-1">Chọn một từ để tạo câu ví dụ.</p>
              </div>
              <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-200/80 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-gray-200 font-semibold rounded-xl transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại</span>
              </button>
            </div>

            {isLoading && (
                 <div className="flex justify-center items-center p-6 bg-white dark:bg-slate-800/50 rounded-2xl">
                     <RefreshCw className="w-6 h-6 mr-3 animate-spin text-indigo-500 dark:text-indigo-400" />
                     <p className="text-slate-800 dark:text-white">Đang tạo câu cho "{selectedWord?.word}"...</p>
                 </div>
            )}

            {generatedSentence && !isLoading && selectedWord && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Ví dụ cho <span className="text-cyan-600 dark:text-cyan-300">{selectedWord.word}</span></h3>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-slate-700 dark:text-gray-300">Câu {languageNameMap[learningLanguage]}</h4>
                        </div>
                        <div className="text-slate-800 dark:text-white text-lg whitespace-pre-wrap leading-relaxed">
                            <HighlightableText text={generatedSentence} words={[selectedWord]} />
                        </div>
                    </div>
                    {translation && (
                        <div className="border-t border-slate-200 dark:border-slate-600 pt-4 mt-4">
                            <h4 className="font-semibold text-slate-500 dark:text-gray-400 mb-2">Bản dịch</h4>
                            <div className="text-slate-500 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                                <HighlightableText text={translation} words={[selectedWord]} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="pt-2">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-3">Chọn một từ từ danh sách của bạn:</h3>
                <div className="max-h-[45vh] overflow-y-auto pr-2">
                    <ul className="space-y-3">
                        {words.map(word => (
                            <li key={word.id}>
                                <button
                                    onClick={() => handleWordClick(word)}
                                    disabled={isLoading}
                                    className={`w-full flex items-center justify-between text-left bg-white dark:bg-slate-800/50 p-3 rounded-2xl border transition-all duration-200
                                    ${selectedWord?.id === word.id && !isLoading ? 'ring-2 ring-indigo-500 border-transparent' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:scale-[1.02] hover:border-slate-300 dark:hover:border-slate-600'}
                                    disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-white">{word.word}</p>
                                        <p className="text-sm text-slate-500 dark:text-gray-400">{word.translation[uiLanguage]}</p>
                                    </div>
                                    <Wand2 className="w-5 h-5 text-slate-400 dark:text-gray-400" />
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