import React, { useState, useMemo } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { useHistory as useActivityHistory } from '../hooks/useHistory';
import { generateSentence } from '../services/geminiService';
import { VocabularyWord, AiSentenceHistoryEntry } from '../types';
import { RefreshCw, Wand2, ArrowLeft, Search, Clock, ChevronDown, Trash2 } from 'lucide-react';
import HighlightableText from './HighlightableText';
import eventBus from '../utils/eventBus';

interface SentenceGeneratorProps {
  onBack: () => void;
}

const SentenceGenerator: React.FC<SentenceGeneratorProps> = ({ onBack }) => {
    const { words } = useVocabulary();
    const { uiLanguage, learningLanguage, addXp, aiSentenceHistory, saveSentence, clearSentenceHistory } = useSettings();
    const { addHistoryEntry } = useActivityHistory();
    const [selectedWord, setSelectedWord] = useState<VocabularyWord | null>(null);
    const [generatedSentence, setGeneratedSentence] = useState('');
    const [translation, setTranslation] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredWords = useMemo(() => {
        return words.filter(word =>
            word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
            word.translation[uiLanguage].toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [words, searchTerm, uiLanguage]);

    const handleWordClick = async (word: VocabularyWord) => {
        if (isLoading) return;
        setSelectedWord(word);
        setIsLoading(true);
        setGeneratedSentence('');
        setTranslation('');

        const result = await generateSentence(word, uiLanguage, learningLanguage);
        addHistoryEntry('SENTENCE_GENERATED', `Tạo câu ví dụ cho từ "${word.word}".`, { word: word.word });
        const parts = result.split('---Translation---');
        const sentenceText = parts[0].trim();
        const translationText = parts.length > 1 ? parts[1].trim() : '';

        setGeneratedSentence(sentenceText);
        setTranslation(translationText);
        
        await saveSentence({ word: word.word, sentence: sentenceText, translation: translationText });
        
        addXp(5); // Grant 5 XP for generating a sentence
        setIsLoading(false);
    };
    
    const handleRestoreFromHistory = (item: AiSentenceHistoryEntry) => {
        const wordObject = words.find(w => w.word === item.word);
        if (wordObject) {
            setSelectedWord(wordObject);
            setGeneratedSentence(item.sentence);
            setTranslation(item.translation);
            eventBus.dispatch('notification', { type: 'info', message: 'Đã khôi phục câu từ lịch sử.' });
        }
    };
    
    const languageNameMap = {
      german: 'tiếng Đức',
      english: 'tiếng Anh',
      chinese: 'tiếng Trung'
    };
    
    return (
        <div className="space-y-6 animate-fade-in text-white">
            <div className="flex items-center justify-between">
              <div className="text-center sm:text-left">
                  <h2 className="text-2xl font-bold text-white">AI Tạo câu</h2>
                  <p className="text-gray-400 mt-1">Chọn một từ để tạo câu ví dụ.</p>
              </div>
              <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 text-gray-200 font-semibold rounded-xl transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại</span>
              </button>
            </div>

            {isLoading && (
                 <div className="flex justify-center items-center p-6 bg-slate-800/50 rounded-2xl">
                     <RefreshCw className="w-6 h-6 mr-3 animate-spin text-indigo-400" />
                     <p>Đang tạo câu cho "{selectedWord?.word}"...</p>
                 </div>
            )}

            {generatedSentence && !isLoading && selectedWord && (
                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-4">
                    <h3 className="text-lg font-semibold">Ví dụ cho <span className="text-cyan-300">{selectedWord.word}</span></h3>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-300">Câu {languageNameMap[learningLanguage]}</h4>
                        </div>
                        <div className="text-gray-200 text-lg whitespace-pre-wrap leading-relaxed">
                            <HighlightableText text={generatedSentence} words={[selectedWord]} />
                        </div>
                    </div>
                    {translation && (
                        <div className="border-t border-slate-600 pt-4 mt-4">
                            <h4 className="font-semibold text-gray-400 mb-2">Bản dịch</h4>
                            <div className="text-gray-400 whitespace-pre-wrap leading-relaxed">
                                <HighlightableText text={translation} words={[selectedWord]} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="pt-2">
                <h3 className="font-semibold text-white mb-3">Chọn một từ từ danh sách của bạn:</h3>
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm từ..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="max-h-[45vh] overflow-y-auto pr-2">
                    <ul className="space-y-3">
                        {filteredWords.map(word => (
                            <li key={word.id}>
                                <button
                                    onClick={() => handleWordClick(word)}
                                    disabled={isLoading}
                                    className={`w-full flex items-center justify-between text-left bg-slate-800/50 p-3 rounded-lg border transition-all duration-200
                                    ${selectedWord?.id === word.id && !isLoading ? 'ring-2 ring-indigo-500 border-transparent' : 'border-slate-700 hover:bg-slate-700/50 hover:scale-[1.01] hover:border-slate-600'}
                                    disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <div>
                                        <p className="font-semibold text-white">{word.word}</p>
                                        <p className="text-sm text-gray-400">{word.translation[uiLanguage]}</p>
                                    </div>
                                    <Wand2 className="w-5 h-5 text-gray-500" />
                                </button>
                            </li>
                        ))}
                    </ul>
                    {filteredWords.length === 0 && (
                        <p className="text-center text-gray-400 py-8">Không tìm thấy từ nào.</p>
                    )}
                </div>
            </div>

            {aiSentenceHistory.length > 0 && (
                <div className="pt-6 mt-6 border-t border-slate-700">
                    <details className="group">
                        <summary className="cursor-pointer font-semibold text-white flex justify-between items-center list-none">
                            <span className="flex items-center gap-2"><Clock className="w-5 h-5 text-gray-400"/> Lịch sử câu ({aiSentenceHistory.length})</span>
                            <ChevronDown className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="mt-4 max-h-60 overflow-y-auto space-y-2 pr-2">
                            {aiSentenceHistory.map(item => (
                                <div key={item.id} onClick={() => handleRestoreFromHistory(item)} className="p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700">
                                    <p className="font-semibold text-sm truncate text-gray-200">Câu cho từ: <span className="text-cyan-300">{item.word}</span></p>
                                    <p className="text-xs text-gray-400 mt-1">{new Date(item.timestamp).toLocaleString('vi-VN')}</p>
                                </div>
                            ))}
                        </div>
                        <button onClick={clearSentenceHistory} className="flex items-center gap-1 text-xs text-red-400 hover:underline mt-2">
                            <Trash2 className="w-3 h-3"/> Xóa lịch sử
                        </button>
                    </details>
                </div>
            )}
        </div>
    );
};

export default SentenceGenerator;