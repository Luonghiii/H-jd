import React, { useState, useRef } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { useHistory } from '../hooks/useHistory';
import { PlusCircle, RefreshCw, Sparkles, Image as ImageIcon, FileText, ArrowLeft } from 'lucide-react';
import { generateWordsFromPrompt, getWordsFromImage, getWordsFromFile } from '../services/geminiService';
import AddWordsReviewModal from './AddWordsReviewModal';
import { GeneratedWord } from '../types';
import eventBus from '../utils/eventBus';

const fileToBase64 = (file: File): Promise<{base64: string, mimeType: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve({
        base64: (reader.result as string).split(',')[1], // remove the data:mime/type;base64, part
        mimeType: file.type
    });
    reader.onerror = error => reject(error);
  });
};

type AddMode = 'manual' | 'ai' | 'upload';

interface AddWordProps {
    onBack: () => void;
}

const AddWord: React.FC<AddWordProps> = ({ onBack }) => {
  const [mode, setMode] = useState<AddMode>('manual');
  
  // Manual state
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [manualTheme, setManualTheme] = useState('');
  const [isManualLoading, setIsManualLoading] = useState(false);

  // AI state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // General state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [wordsForReview, setWordsForReview] = useState<GeneratedWord[]>([]);

  const { words, addWord, addMultipleWords, getAvailableThemes } = useVocabulary();
  const { addHistoryEntry } = useHistory();
  const { uiLanguage, learningLanguage } = useSettings();
  
  const languageNameMap = {
      german: 'tiếng Đức',
      english: 'tiếng Anh',
      chinese: 'tiếng Trung'
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (word.trim() && translation.trim() && !isManualLoading) {
      setIsManualLoading(true);
      const trimmedWord = word.trim();
      const success = await addWord(trimmedWord, translation.trim(), uiLanguage, manualTheme.trim());
      
      setIsManualLoading(false);

      if (success) {
        addHistoryEntry('WORDS_ADDED', `Đã thêm thủ công 1 từ.`, { wordCount: 1 });
        setWord('');
        setTranslation('');
        setManualTheme('');
        eventBus.dispatch('notification', { type: 'success', message: `Đã thêm từ "${trimmedWord}"!` });
      }
    }
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (aiPrompt.trim() && !isAiLoading) {
      setIsAiLoading(true);
      eventBus.dispatch('notification', { type: 'info', message: 'AI đang tìm từ vựng...' });
      try {
        const existingWords = words.map(w => w.word);
        const themes = getAvailableThemes();
        const generatedWords = await generateWordsFromPrompt(aiPrompt.trim(), existingWords, learningLanguage, themes);
        if (generatedWords && generatedWords.length > 0) {
            setWordsForReview(generatedWords);
            setIsReviewModalOpen(true);
        } else {
            eventBus.dispatch('notification', { type: 'info', message: `Không tìm thấy từ mới nào khớp với yêu cầu.` });
        }
        setAiPrompt('');
      } catch (error: any) {
        if (error.message === "All API keys failed.") {
             eventBus.dispatch('notification', { type: 'error', message: "Tất cả API key đều không hoạt động. Vui lòng kiểm tra lại trong Cài đặt." });
        } else {
             eventBus.dispatch('notification', { type: 'error', message: `Lỗi khi tạo từ: ${error.message}` });
        }
      } finally {
        setIsAiLoading(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      if (file.type.startsWith('image/')) {
        setFilePreview(URL.createObjectURL(file));
      } else {
        setFilePreview(null);
      }
    }
  };
  
  const handleUploadSubmit = async () => {
    if (uploadedFile && !isUploading) {
        setIsUploading(true);
        eventBus.dispatch('notification', { type: 'info', message: 'AI đang phân tích file...' });
        try {
            const { base64, mimeType } = await fileToBase64(uploadedFile);
            const existingWords = words.map(w => w.word);
            const themes = getAvailableThemes();
            let generatedWords;
            let sourceText = '';

            if (uploadedFile.type.startsWith('image/')) {
                sourceText = 'ảnh';
                generatedWords = await getWordsFromImage(base64, mimeType, existingWords, learningLanguage, themes);
            } else {
                sourceText = 'file';
                generatedWords = await getWordsFromFile(base64, mimeType, existingWords, learningLanguage, themes);
            }

            if (generatedWords && generatedWords.length > 0) {
                setWordsForReview(generatedWords);
                setIsReviewModalOpen(true);
            } else {
                eventBus.dispatch('notification', { type: 'info', message: `Không tìm thấy từ mới nào từ ${sourceText}.` });
            }
            setUploadedFile(null);
            setFilePreview(null);
        } catch(error: any) {
            if (error.message === "All API keys failed.") {
                eventBus.dispatch('notification', { type: 'error', message: "Tất cả API key đều không hoạt động. Vui lòng kiểm tra lại trong Cài đặt." });
            } else {
                eventBus.dispatch('notification', { type: 'error', message: `Lỗi khi phân tích file: ${error.message}` });
            }
        } finally {
            setIsUploading(false);
        }
    }
  }

  const handleConfirmReview = async (wordsToAdd: GeneratedWord[]) => {
      const count = await addMultipleWords(wordsToAdd);
      if (count > 0) {
          addHistoryEntry('WORDS_ADDED', `Đã thêm ${count} từ mới.`, { wordCount: count });
          eventBus.dispatch('notification', { type: 'success', message: `Đã thêm ${count} từ mới!` });
      } else {
          eventBus.dispatch('notification', { type: 'info', message: 'Không có từ mới nào được thêm.' });
      }
      setIsReviewModalOpen(false);
      setWordsForReview([]);
  };

  const renderTabs = () => (
    <div className="flex justify-center p-1 bg-slate-800/60 rounded-full mb-6 overflow-x-auto">
        <button onClick={() => setMode('manual')} className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all flex-shrink-0 ${mode === 'manual' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-700'}`}>Thêm thủ công</button>
        <button onClick={() => setMode('ai')} className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all flex-shrink-0 ${mode === 'ai' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-700'}`}>Tạo bằng AI</button>
        <button onClick={() => setMode('upload')} className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all flex-shrink-0 ${mode === 'upload' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-700'}`}>Thêm từ File/Ảnh</button>
    </div>
  );

  const renderManualForm = () => {
    const translationLabel = uiLanguage === 'vietnamese' ? 'Nghĩa tiếng Việt' : 'Nghĩa tiếng Anh';
    const translationPlaceholder = uiLanguage === 'vietnamese' ? 'ví dụ: quả táo' : 'e.g. the apple';
    const wordLabel = `Từ ${languageNameMap[learningLanguage]}`;
    const wordPlaceholder = `ví dụ: ${learningLanguage === 'german' ? 'der Apfel' : learningLanguage === 'english' ? 'apple' : '苹果'}`;

    return (
        <form onSubmit={handleManualSubmit} className="space-y-4 animate-fade-in">
            <div>
              <label htmlFor="word-input" className="block text-sm font-medium text-gray-300 mb-1">{wordLabel}</label>
              <input id="word-input" type="text" value={word} onChange={(e) => setWord(e.target.value)} placeholder={wordPlaceholder} className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" required disabled={isManualLoading} />
            </div>
            <div>
              <label htmlFor="translation" className="block text-sm font-medium text-gray-300 mb-1">{translationLabel}</label>
              <input id="translation" type="text" value={translation} onChange={(e) => setTranslation(e.target.value)} placeholder={translationPlaceholder} className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" required disabled={isManualLoading} />
            </div>
            <div>
              <label htmlFor="theme" className="block text-sm font-medium text-gray-300 mb-1">Chủ đề (tùy chọn)</label>
              <input id="theme" type="text" list="themes" value={manualTheme} onChange={(e) => setManualTheme(e.target.value)} placeholder="ví dụ: Food, Travel..." className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" disabled={isManualLoading} />
              <datalist id="themes">{getAvailableThemes().map(t => <option key={t} value={t} />)}</datalist>
            </div>
            <button type="submit" className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed" disabled={!word.trim() || !translation.trim() || isManualLoading}>
                {isManualLoading ? <><RefreshCw className="w-5 h-5 mr-2 animate-spin" />Đang thêm...</> : <><PlusCircle className="w-5 h-5 mr-2" />Thêm từ</>}
            </button>
        </form>
    );
  };
  
  const renderAiForm = () => (
    <form onSubmit={handleAiSubmit} className="space-y-4 animate-fade-in">
        <div>
            <label htmlFor="ai-prompt" className="block text-sm font-medium text-gray-300 mb-1">Yêu cầu</label>
            <textarea
                id="ai-prompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="ví dụ: 100 từ vựng về chủ đề không gian"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                required
                disabled={isAiLoading}
                rows={3}
            />
        </div>
        <button type="submit" className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed" disabled={!aiPrompt.trim() || isAiLoading}>
            {isAiLoading ? <><RefreshCw className="w-5 h-5 mr-2 animate-spin" />Đang tạo...</> : <><Sparkles className="w-5 h-5 mr-2" />Tạo từ vựng</>}
        </button>
    </form>
  );
  
  const renderUploadForm = () => {
    const buttonText = !uploadedFile
      ? 'Thêm từ File/Ảnh'
      : uploadedFile.type.startsWith('image/')
      ? 'Thêm từ ảnh'
      : 'Thêm từ file';

    return (
      <div className="space-y-4 animate-fade-in">
        <input type="file" ref={uploadInputRef} onChange={handleFileChange} accept="image/*,.pdf,.txt,.md" className="hidden" />
        <button onClick={() => uploadInputRef.current?.click()} className="w-full flex flex-col items-center justify-center px-4 py-10 bg-slate-800 border-2 border-dashed border-slate-600 rounded-xl text-gray-400 hover:border-indigo-500 hover:text-white transition-colors">
          <div className="flex items-center gap-4">
              <ImageIcon className="w-8 h-8" />
              <FileText className="w-8 h-8" />
          </div>
          <span className="font-semibold mt-2">Nhấp để tải ảnh hoặc file lên</span>
          <span className="text-sm">PNG, JPG, PDF, TXT, MD</span>
        </button>
        {filePreview && (
            <div className="relative">
                <img src={filePreview} alt="Preview" className="w-full h-auto max-h-48 object-contain rounded-xl" />
                {isUploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                        <RefreshCw className="w-8 h-8 text-white animate-spin" />
                    </div>
                )}
            </div>
        )}
        {uploadedFile && !filePreview && (
            <div className="text-center bg-slate-800 p-3 rounded-xl border border-slate-700">
                <p className="text-sm text-gray-400">Đã chọn file:</p>
                <p className="font-semibold text-white truncate">{uploadedFile.name}</p>
            </div>
        )}
        <button onClick={handleUploadSubmit} className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed" disabled={!uploadedFile || isUploading}>
            {isUploading ? <><RefreshCw className="w-5 h-5 mr-2 animate-spin" />Đang phân tích...</> : <><Sparkles className="w-5 h-5 mr-2" />{buttonText}</>}
        </button>
      </div>
    );
  };


  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Thêm từ mới</h2>
            <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 text-gray-200 font-semibold rounded-xl transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại</span>
            </button>
        </div>
      {renderTabs()}

      {mode === 'manual' && renderManualForm()}
      {mode === 'ai' && renderAiForm()}
      {mode === 'upload' && renderUploadForm()}

      <AddWordsReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          generatedWords={wordsForReview}
          onConfirm={handleConfirmReview}
      />
    </div>
  );
};

export default AddWord;