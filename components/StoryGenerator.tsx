import React, { useState, useMemo } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { useHistory } from '../hooks/useHistory';
import { generateStory, generateSpeech } from '../services/geminiService';
import { VocabularyWord } from '../types';
import { Sparkles, RefreshCw, CheckCircle, BookText, ArrowLeft, Search, Volume2, Loader2 } from 'lucide-react';
import HighlightableText from './HighlightableText';
import eventBus from '../utils/eventBus';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

interface StoryGeneratorProps {
  onBack: () => void;
}

const StoryGenerator: React.FC<StoryGeneratorProps> = ({ onBack }) => {
  const { words } = useVocabulary();
  const { uiLanguage, learningLanguage, recordActivity, incrementAchievementCounter, addXp } = useSettings();
  const { addHistoryEntry } = useHistory();
  const { play, isPlaying } = useAudioPlayer();

  const [selectedWords, setSelectedWords] = useState<VocabularyWord[]>([]);
  const [generatedStory, setGeneratedStory] = useState('');
  const [translation, setTranslation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeechLoading, setIsSpeechLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredWords = useMemo(() => {
    return words.filter(word =>
        word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.translation[uiLanguage].toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [words, searchTerm, uiLanguage]);

  const handleToggleWord = (word: VocabularyWord) => {
    setGeneratedStory('');
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
    setGeneratedStory('');
    setTranslation('');
    eventBus.dispatch('notification', { type: 'info', message: 'AI đang viết truyện...' });
    const wordsForStory = selectedWords.map(w => w.word);
    const aiStory = await generateStory(wordsForStory, uiLanguage, learningLanguage);
    
    const parts = aiStory.split('---Translation---');
    if (parts.length === 2) {
        setGeneratedStory(parts[0].trim());
        setTranslation(parts[1].trim());
    } else {
        setGeneratedStory(aiStory.trim());
        setTranslation('');
    }

    addHistoryEntry('STORY_GENERATED', `Đã tạo truyện với ${selectedWords.length} từ.`, { wordCount: selectedWords.length });
    incrementAchievementCounter('STORY_GENERATED');
    recordActivity();
    addXp(20); // Grant 20 XP for generating a story
    setIsLoading(false);
  };

  const handlePlayStory = async () => {
    if (!generatedStory || isSpeechLoading || isPlaying) return;
    setIsSpeechLoading(true);
    try {
        const audioB64 = await generateSpeech(generatedStory, learningLanguage);
        await play(audioB64);
    } catch (error) {
        console.error("Failed to generate/play story audio", error);
        eventBus.dispatch('notification', { type: 'error', message: 'Không thể tạo âm thanh cho truyện.' });
    }
    setIsSpeechLoading(false);
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
          <h2 className="text-2xl font-bold text-white">AI Tạo truyện</h2>
          <p className="text-gray-400 mt-1">Chọn từ để đưa vào truyện.</p>
        </div>
        <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 text-gray-200 font-semibold rounded-xl transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>
      </div>

      <div>
        <h3 className="font-semibold text-white mb-2">1. Chọn từ của bạn:</h3>
        <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Tìm kiếm từ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
        </div>
        <div className="max-h-[25vh] overflow-y-auto pr-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-3 space-y-2">
            {filteredWords.length > 0 ? filteredWords.map(word => {
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
                            <p className="text-sm text-gray-400">{word.translation[uiLanguage]}</p>
                        </div>
                        {isSelected && <CheckCircle className="w-5 h-5 text-indigo-400 flex-shrink-0" />}
                    </button>
                )
            }) : <p className="text-center text-gray-500">Không tìm thấy từ nào.</p>}
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
      
      {generatedStory && (
        <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BookText className="w-6 h-6 mr-3 text-indigo-400" />
              <h3 className="text-lg font-semibold text-white">Truyện được tạo bởi AI của bạn</h3>
            </div>
            <button 
              onClick={handlePlayStory} 
              disabled={isSpeechLoading || isPlaying}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg text-white disabled:opacity-50"
            >
              {isSpeechLoading || isPlaying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
              <span>Nghe truyện</span>
            </button>
          </div>
          <div>
            <h4 className="font-semibold text-cyan-300 mb-2">{languageNameMap[learningLanguage]}</h4>
            <div className="text-gray-200 whitespace-pre-wrap leading-relaxed">
              <HighlightableText text={generatedStory} words={selectedWords} />
            </div>
          </div>
          {translation && (
            <div className="border-t border-slate-600 pt-4 mt-4">
              <h4 className="font-semibold text-gray-400 mb-2">Bản dịch</h4>
              <div className="text-gray-400 whitespace-pre-wrap leading-relaxed">
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
