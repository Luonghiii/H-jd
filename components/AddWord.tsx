import React, { useState } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { PlusCircle, RefreshCw } from 'lucide-react';

const AddWord: React.FC = () => {
  const [german, setGerman] = useState('');
  const [translation, setTranslation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { addWord } = useVocabulary();
  const { targetLanguage } = useSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (german.trim() && translation.trim() && !isLoading) {
      setIsLoading(true);
      await addWord(german.trim(), translation.trim(), targetLanguage);
      setGerman('');
      setTranslation('');
      setIsLoading(false);
    }
  };
  
  const translationLabel = targetLanguage === 'vietnamese' ? 'Nghĩa tiếng Việt' : 'Nghĩa tiếng Anh';
  const translationPlaceholder = targetLanguage === 'vietnamese' ? 'ví dụ: quả táo' : 'e.g. the apple';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Thêm từ mới</h2>
        <p className="text-gray-400 mt-1">Xây dựng từ điển tiếng Đức cá nhân của bạn.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="german" className="block text-sm font-medium text-gray-300 mb-1">
            Từ tiếng Đức
          </label>
          <input
            id="german"
            type="text"
            value={german}
            onChange={(e) => setGerman(e.target.value)}
            placeholder="ví dụ: der Apfel"
            className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="translation" className="block text-sm font-medium text-gray-300 mb-1">
            {translationLabel}
          </label>
          <input
            id="translation"
            type="text"
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            placeholder={translationPlaceholder}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition duration-300 disabled:bg-indigo-400 disabled:cursor-not-allowed"
          disabled={!german.trim() || !translation.trim() || isLoading}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              Đang thêm...
            </>
          ) : (
            <>
              <PlusCircle className="w-5 h-5 mr-2" />
              Thêm từ
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default AddWord;