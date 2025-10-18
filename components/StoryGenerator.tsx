import React, { useState } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { generateStory } from '../services/geminiService';
import { VocabularyWord } from '../types';
import { Sparkles, RefreshCw, CheckCircle, BookText } from 'lucide-react';
import HighlightableText from './HighlightableText';

const StoryGenerator: React.FC = () => {
  const { words } = useVocabulary();
  const { targetLanguage, learningLanguage } = useSettings();
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

    setIsLoading(false);
  };
  
  const languageNameMap = {
      german: 'tiếng Đức',
      english: 'tiếng Anh',
      chinese: 'tiếng Trung'
  };

  if (words.length === 0) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold text-white">AI Tạo truyện</h2>
        <p className="text-gray-400 mt-2">
          Thêm vài từ vào danh sách để bắt đầu tạo truyện.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">AI Tạo truyện</h2>
        <p className="text-gray-400 mt-1">Chọn các từ trong danh sách của bạn để đưa vào truyện.</p>
      </div>

      <div>
        <h3 className="font-semibold text-white mb-2">1. Chọn từ của bạn:</h3>
        <div className="max-h-[25vh] overflow-y-auto pr-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-3 space-y-2">
            {words.map(word => {
                const isSelected = selectedWords.some(w => w.id === word.id);
                return (
                    <button
                        key={word.id}
                        onClick={() => handleToggleWord(word)}
                        className={`w-full flex items-center justify-between text-left p-2 rounded-lg transition-colors duration-200 ${
                            isSelected ? 'bg-indigo-600/30 ring-2 ring-indigo-500' : 'bg-slate-700/50 hover:bg-slate-600/50'
                        }`}
                    >
                        <div>
                            <p className="font-medium text-white">{word.word}</p>
                            <p className="text-sm text-gray-400">{word.translation[targetLanguage]}</p>
                        </div>
                        {isSelected && <CheckCircle className="w-5 h-5 text-indigo-400 flex-shrink-0" />}
                    </button>
                )
            })}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-white mb-2">2. Các từ cho câu chuyện:</h3>
        <div className="flex flex-wrap gap-2 p-3 bg-slate-800 rounded-xl min-h-[44px]">
          {selectedWords.length > 0 ? selectedWords.map(word => (
            <span key={word.id} className="px-3 py-1 bg-slate-700 text-cyan-300 text-sm font-medium rounded-full">
              {word.word}
            </span>
          )) : <p className="text-sm text-gray-500">Chưa có từ nào được chọn.</p>}
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
        <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BookText className="w-6 h-6 mr-3 text-indigo-400" />
              <h3 className="text-lg font-semibold text-white">Truyện được tạo bởi AI của bạn</h3>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-cyan-300 mb-2">{languageNameMap[learningLanguage]}</h4>
            <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
              <HighlightableText text={germanStory} words={selectedWords} />
            </p>
          </div>
          {translation && (
            <div className="border-t border-slate-600 pt-4 mt-4">
              <h4 className="font-semibold text-gray-400 mb-2">Bản dịch</h4>
              <p className="text-gray-400 whitespace-pre-wrap leading-relaxed">
                 <HighlightableText text={translation} words={selectedWords} />
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StoryGenerator;