import React, { useState, useMemo } from 'react';
import { useVocabulary, themeTranslationMap } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { Trash2, Search, ImageIcon, Sparkles, Star } from 'lucide-react';
import { VocabularyWord } from '../types';
import ImageEditModal from './ImageEditModal';
import { generateImageForWord } from '../services/geminiService';
import { useInspector } from '../hooks/useInspector';

const WordList: React.FC = () => {
  const { words, deleteWord, updateWordImage, toggleWordStar, lastDeletedWord, undoDelete } = useVocabulary();
  const { targetLanguage } = useSettings();
  const { openInspector } = useInspector();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingWord, setEditingWord] = useState<VocabularyWord | null>(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  const filteredWords = useMemo(() => {
    return words.filter(word =>
      word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      word.translation[targetLanguage].toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => (b.isStarred ? 1 : 0) - (a.isStarred ? 1 : 0) || b.createdAt - a.createdAt);
  }, [words, searchTerm, targetLanguage]);
  
  const wordsWithoutImages = useMemo(() => words.filter(w => !w.imageUrl), [words]);

  const handleGenerateAllImages = async () => {
    if (wordsWithoutImages.length === 0 || isBatchGenerating) return;

    setIsBatchGenerating(true);
    setBatchProgress({ current: 0, total: wordsWithoutImages.length });

    let current = 0;
    for (const word of wordsWithoutImages) {
        try {
            await new Promise(resolve => setTimeout(resolve, 500)); 
            const imageUrl = await generateImageForWord(word.word);
            updateWordImage(word.id, imageUrl);
        } catch (error) {
            console.error(`Failed to generate image for "${word.word}":`, error);
        }
        current++;
        setBatchProgress(prev => ({ ...prev, current }));
    }

    setIsBatchGenerating(false);
  };

  const handleSaveImage = (wordId: string, imageUrl: string) => {
    updateWordImage(wordId, imageUrl);
    setEditingWord(null);
  };
  
  const handleRemoveImage = (wordId: string) => {
    updateWordImage(wordId, null);
    setEditingWord(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Danh sách từ của bạn</h2>
        <p className="text-gray-400 mt-1">Bạn đã lưu {words.length} từ.</p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Tìm kiếm từ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
            onClick={handleGenerateAllImages}
            disabled={isBatchGenerating || wordsWithoutImages.length === 0}
            className="flex-shrink-0 flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed"
            title={isBatchGenerating ? 'Đang trong tiến trình...' : 'Tạo ảnh cho tất cả các từ còn thiếu'}
        >
            <Sparkles className={`w-4 h-4 mr-2 ${isBatchGenerating ? 'animate-spin' : ''}`} />
            <span>Tạo ảnh còn thiếu ({wordsWithoutImages.length})</span>
        </button>
      </div>

      {isBatchGenerating && (
        <div className="text-center text-gray-300">
            <p>Đang tạo ảnh... ({batchProgress.current} / {batchProgress.total})</p>
            <div className="w-full bg-slate-700 rounded-full h-2.5 mt-2 overflow-hidden">
                <div 
                    className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%` }}
                ></div>
            </div>
        </div>
      )}

      <div className="max-h-[50vh] overflow-y-auto pr-2">
        {filteredWords.length > 0 ? (
          <ul className="space-y-3">
            {filteredWords.map(word => (
              <li key={word.id} className={`flex items-center bg-slate-800/50 p-3 rounded-2xl border transition-all duration-200 hover:border-slate-600 hover:scale-[1.02] ${word.isStarred ? 'border-yellow-500/50' : 'border-slate-700'}`}>
                <div 
                  className="flex items-center gap-4 flex-grow cursor-pointer"
                  onClick={() => openInspector(word)}
                >
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingWord(word); }}
                    className="w-16 h-16 flex-shrink-0 bg-slate-700/50 rounded-xl flex items-center justify-center text-gray-500 hover:bg-slate-700 transition-colors"
                    aria-label={`Edit image for ${word.word}`}
                  >
                    {word.imageUrl ? (
                      <img src={word.imageUrl} alt={word.word} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <ImageIcon className="w-8 h-8" />
                    )}
                  </button>
                  <div>
                    <p className="font-semibold text-white">{word.word}</p>
                    <p className="text-sm text-gray-400">{word.translation[targetLanguage]}</p>
                    {word.theme && (
                      <span className="mt-1 inline-block px-2 py-0.5 text-xs bg-cyan-800/70 text-cyan-200 rounded-full font-medium">
                        {targetLanguage === 'english' ? (themeTranslationMap[word.theme] || word.theme) : word.theme}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center flex-shrink-0 ml-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleWordStar(word.id); }}
                      className={`p-2 rounded-full transition duration-300 ${word.isStarred ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10'}`}
                      aria-label={`Star ${word.word}`}
                    >
                      <Star className="w-5 h-5" fill={word.isStarred ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteWord(word.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition duration-300 flex-shrink-0"
                      aria-label={`Delete ${word.word}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-gray-400 py-8">
            {words.length === 0 ? "Danh sách từ của bạn trống. Hãy thêm từ để bắt đầu!" : "Không có từ nào khớp với tìm kiếm của bạn."}
          </p>
        )}
      </div>

      {lastDeletedWord && (
        <div className="bg-slate-700 text-white rounded-xl shadow-lg flex items-center justify-between p-3 animate-fade-in-up">
            <span>Đã xóa từ <strong>"{lastDeletedWord.word.word}"</strong></span>
            <button
                onClick={undoDelete}
                className="font-semibold text-indigo-300 hover:underline px-3 py-1 rounded-md hover:bg-slate-600/50"
            >
                Hoàn tác
            </button>
        </div>
      )}

       {editingWord && (
        <ImageEditModal 
            isOpen={!!editingWord}
            word={editingWord}
            onClose={() => setEditingWord(null)}
            onSave={handleSaveImage}
            onRemove={handleRemoveImage}
        />
      )}
    </div>
  );
};

export default WordList;