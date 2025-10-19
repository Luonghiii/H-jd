

import React, { useState, useMemo } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { Trash2, Search } from 'lucide-react';
import { useInspector } from '../hooks/useInspector';

const WordList: React.FC = () => {
  const { words, deleteWord } = useVocabulary();
  // FIX: Replaced targetLanguage with uiLanguage.
  const { uiLanguage } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const { openInspector } = useInspector();

  const filteredWords = useMemo(() => {
    return words.filter(word =>
      // FIX: Changed 'word.german' to 'word.word' to match the VocabularyWord type.
      word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      word.translation[uiLanguage].toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [words, searchTerm, uiLanguage]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Danh sách từ của bạn</h2>
        <p className="text-gray-400 mt-1">Bạn đã lưu {words.length} từ.</p>
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Tìm kiếm từ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="max-h-[50vh] overflow-y-auto pr-2">
        {filteredWords.length > 0 ? (
          <ul className="space-y-3">
            {filteredWords.map(word => (
              <li 
                key={word.id} 
                className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700 transition-colors hover:bg-slate-700/50 cursor-pointer"
                onClick={() => openInspector(word)}
              >
                <div className="flex-grow">
                  {/* FIX: Changed 'word.german' to 'word.word' to match the VocabularyWord type. */}
                  <p className="font-semibold text-white">{word.word}</p>
                  <p className="text-sm text-gray-400">{word.translation[uiLanguage]}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent opening inspector when deleting
                    deleteWord(word.id);
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition duration-300"
                  // FIX: Changed 'word.german' to 'word.word' to match the VocabularyWord type.
                  aria-label={`Delete ${word.word}`}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-gray-400 py-8">
            {words.length === 0 ? "Danh sách từ của bạn trống. Hãy thêm từ để bắt đầu!" : "Không có từ nào khớp với tìm kiếm của bạn."}
          </p>
        )}
      </div>
    </div>
  );
};

export default WordList;