import React, { useState } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { useHistory } from '../hooks/useHistory';
import { generateStory } from '../services/geminiService';
import { VocabularyWord } from '../types';
import { Sparkles, RefreshCw, CheckCircle, BookText, ArrowLeft } from 'lucide-react';
import HighlightableText from './HighlightableText';

interface StoryGeneratorProps {
  onBack: () => void;
}

const StoryGenerator: React.FC<StoryGeneratorProps> = ({ onBack }) => {
  const { words } = useVocabulary();
  const { targetLanguage, learningLanguage } = useSettings();
  const { addHistoryEntry } = useHistory();
  const [selectedWords, setSelectedWords] = useState<VocabularyWord[]>([]);
  const [germanStory, setGermanStory] = useState('');
  const [translation, setTranslation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleWord = (word: VocabularyWord) => {
    setGermanStory('');
    setTranslation('');
    setSelectedWords(prevSelected => {
        const isSelected = prevSelected.some(w => w.id === word.id);
        if (isSelected) {
            return prevSelected.filter(w => w.id !== word.id);
        } else {
            return [...prevSelected, word];
        }
    });
  };

  const handleGenerate = async () => {
    if (selectedWords.length === 0 || isLoading) return;
    setIsLoading(true);
    setGermanStory('');
    setTranslation('');
    const wordsForStory = selectedWords.map(w => w.word);
    const aiStory = await generateStory(wordsForStory, targetLanguage, learningLanguage);
    
    const parts = aiStory.split('---Translation---');
    if (parts.length === 2) {
        setGermanStory(parts[0].trim());
        setTranslation(parts[1].trim());
    } else {
        setGermanStory(aiStory.trim());
        setTranslation('');
    }

    addHistoryEntry('STORY_GENERATED', `Đã tạo truyện với ${selectedWords.length} từ.`);
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">AI Tạo truyện</h2>
          <p className="text-slate-500 dark:text-gray-400 mt-1">Chọn từ để đưa vào truyện.</p>
        </div>
        <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-200/80 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-gray-200 font-semibold rounded-xl transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>
      </div>

      <div>
        <h3 className="font-semibold text-slate-800 dark:text-white mb-2">1. Chọn từ của bạn:</h3>
        <div className="max-h-[25vh] overflow-y-auto pr-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 space-y-2">
            {words.map(word => {
                const isSelected = selectedWords.some(w => w.id === word.id);
                return (
                    <button
                        key={word.id}
                        onClick={() => handleToggleWord(word)}
                        className={`w-full flex items-center justify-between text-left p-2 rounded-lg transition-colors duration-200 ${
                            isSelected ? 'bg-indigo-500/20 dark:bg-indigo-600/30 ring-2 ring-indigo-500' : 'bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600/50'
                        }`}
                    >
                        <div>
                            <p className="font-medium text-slate-800 dark:text-white">{word.word}</p>
                            <p className="text-sm text-slate-500 dark:text-gray-400">{word.translation[targetLanguage]}</p>
                        </div>
                        {isSelected && <CheckCircle className="w-5 h-5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />}
                    </button>
                )
            })}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-slate-800 dark:text-white mb-2">2. Các từ cho câu chuyện:</h3>
        <div className="flex flex-wrap gap-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl min-h-[44px]">
          {selectedWords.length > 0 ? selectedWords.map(word => (
            <span key={word.id} className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-cyan-800 dark:text-cyan-300 text-sm font-medium rounded-full">
              {word.word}
            </span>
          )) : <p className="text-sm text-slate-500 dark:text-gray-500">Chưa có từ nào được chọn.</p>}
        </div>
      </div>

      <button
        onClick={handleGenerate}
        className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed"
        disabled={selectedWords.length === 0 || isLoading}
      >
        {isLoading ? (
          <>
            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            Đang tạo...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            Tạo truyện
          </>
        )}
      </button>
      
      {germanStory && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BookText className="w-6 h-6 mr-3 text-indigo-500 dark:text-indigo-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Truyện được tạo bởi AI của bạn</h3>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-cyan-700 dark:text-cyan-300 mb-2">{languageNameMap[learningLanguage]}</h4>
            <div className="text-slate-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
              <HighlightableText text={germanStory} words={selectedWords} />
            </div>
          </div>
          {translation && (
            <div className="border-t border-slate-200 dark:border-slate-600 pt-4 mt-4">
              <h4 className="font-semibold text-slate-500 dark:text-gray-400 mb-2">Bản dịch</h4>
              <div className="text-slate-500 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                 <HighlightableText text={translation} words={selectedWords} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StoryGenerator;