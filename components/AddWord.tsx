import React, { useState, useRef } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { PlusCircle, RefreshCw, Sparkles, UploadCloud, Image as ImageIcon, FileText } from 'lucide-react';
import { generateWordsFromPrompt, getWordsFromImage, getWordsFromFile } from '../services/geminiService';

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

type AddMode = 'manual' | 'ai' | 'image' | 'file';

const AddWord: React.FC = () => {
  const [mode, setMode] = useState<AddMode>('manual');
  
  // Manual state
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [manualTheme, setManualTheme] = useState('');
  const [isManualLoading, setIsManualLoading] = useState(false);

  // AI state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File state
  const [textFile, setTextFile] = useState<File | null>(null);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const textFileInputRef = useRef<HTMLInputElement>(null);

  // General state
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const { words, addWord, addMultipleWords, getAvailableThemes } = useVocabulary();
  const { targetLanguage, learningLanguage } = useSettings();
  
  const languageNameMap = {
      german: 'tiếng Đức',
      english: 'tiếng Anh',
      chinese: 'tiếng Trung'
  };

  const clearFeedback = () => {
      if (feedback) {
          setTimeout(() => setFeedback(null), 4000);
      }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (word.trim() && translation.trim() && !isManualLoading) {
      setIsManualLoading(true);
      setFeedback(null);
      await addWord(word.trim(), translation.trim(), targetLanguage, manualTheme.trim());
      setWord('');
      setTranslation('');
      setManualTheme('');
      setIsManualLoading(false);
      setFeedback({ type: 'success', message: `Đã thêm từ "${word.trim()}"!` });
      clearFeedback();
    }
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (aiPrompt.trim() && !isAiLoading) {
      setIsAiLoading(true);
      setFeedback(null);
      try {
        const existingWords = words.map(w => w.word);
        const generatedWords = await generateWordsFromPrompt(aiPrompt.trim(), existingWords, learningLanguage);
        const count = addMultipleWords(generatedWords);
        setFeedback({ type: 'success', message: `Đã thêm ${count} từ mới!` });
        setAiPrompt('');
      } catch (error) {
        setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Lỗi không xác định' });
      } finally {
        setIsAiLoading(false);
        clearFeedback();
      }
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setFeedback(null);
    }
  };
  
  const handleImageSubmit = async () => {
      if (imageFile && !isImageLoading) {
          setIsImageLoading(true);
          setFeedback(null);
          try {
              const { base64, mimeType } = await fileToBase64(imageFile);
              const existingWords = words.map(w => w.word);
              const generatedWords = await getWordsFromImage(base64, mimeType, existingWords, learningLanguage);
              const count = addMultipleWords(generatedWords);
              setFeedback({ type: 'success', message: `Tìm thấy và đã thêm ${count} từ mới từ ảnh!` });
              setImageFile(null);
              setImagePreview(null);
          } catch(error) {
              setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Lỗi không xác định' });
          } finally {
              setIsImageLoading(false);
              clearFeedback();
          }
      }
  }

  const handleTextFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTextFile(file);
      setFeedback(null);
    }
  };

  const handleFileSubmit = async () => {
      if (textFile && !isFileLoading) {
          setIsFileLoading(true);
          setFeedback(null);
          try {
              const { base64, mimeType } = await fileToBase64(textFile);
              const existingWords = words.map(w => w.word);
              const generatedWords = await getWordsFromFile(base64, mimeType, existingWords, learningLanguage);
              const count = addMultipleWords(generatedWords);
              setFeedback({ type: 'success', message: `Tìm thấy và đã thêm ${count} từ mới từ file!` });
              setTextFile(null);
          } catch(error) {
              setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Lỗi không xác định' });
          } finally {
              setIsFileLoading(false);
              clearFeedback();
          }
      }
  }

  const renderTabs = () => (
    <div className="flex justify-center p-1 bg-slate-800/60 rounded-full mb-6 overflow-x-auto">
        <button onClick={() => setMode('manual')} className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all flex-shrink-0 ${mode === 'manual' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-700'}`}>Thêm thủ công</button>
        <button onClick={() => setMode('ai')} className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all flex-shrink-0 ${mode === 'ai' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-700'}`}>Tạo bằng AI</button>
        <button onClick={() => setMode('image')} className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all flex-shrink-0 ${mode === 'image' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-700'}`}>Thêm từ ảnh</button>
        <button onClick={() => setMode('file')} className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all flex-shrink-0 ${mode === 'file' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-700'}`}>Thêm từ file</button>
    </div>
  );

  const renderManualForm = () => {
    const translationLabel = targetLanguage === 'vietnamese' ? 'Nghĩa tiếng Việt' : 'Nghĩa tiếng Anh';
    const translationPlaceholder = targetLanguage === 'vietnamese' ? 'ví dụ: quả táo' : 'e.g. the apple';
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
            <input id="ai-prompt" type="text" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="ví dụ: 10 động từ thông dụng về nấu ăn" className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" required disabled={isAiLoading} />
        </div>
        <button type="submit" className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed" disabled={!aiPrompt.trim() || isAiLoading}>
            {isAiLoading ? <><RefreshCw className="w-5 h-5 mr-2 animate-spin" />Đang tạo...</> : <><Sparkles className="w-5 h-5 mr-2" />Tạo từ vựng</>}
        </button>
    </form>
  );
  
  const renderImageForm = () => (
      <div className="space-y-4 animate-fade-in">
        <input type="file" ref={fileInputRef} onChange={handleImageFileChange} accept="image/*" className="hidden" />
        <button onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center justify-center px-4 py-10 bg-slate-800 border-2 border-dashed border-slate-600 rounded-xl text-gray-400 hover:border-indigo-500 hover:text-white transition-colors">
            <UploadCloud className="w-8 h-8 mb-2" />
            <span className="font-semibold">Nhấp để tải ảnh lên</span>
            <span className="text-sm">PNG, JPG, WEBP</span>
        </button>
        {imagePreview && (
            <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full h-auto max-h-48 object-contain rounded-xl" />
                {isImageLoading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                        <RefreshCw className="w-8 h-8 text-white animate-spin" />
                    </div>
                )}
            </div>
        )}
        <button onClick={handleImageSubmit} className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed" disabled={!imageFile || isImageLoading}>
            {isImageLoading ? <><RefreshCw className="w-5 h-5 mr-2 animate-spin" />Đang phân tích...</> : <><ImageIcon className="w-5 h-5 mr-2" />Thêm từ ảnh</>}
        </button>
    </div>
  );

  const renderFileForm = () => (
    <div className="space-y-4 animate-fade-in">
        <input type="file" ref={textFileInputRef} onChange={handleTextFileChange} accept=".pdf,.txt,.md" className="hidden" />
        <button onClick={() => textFileInputRef.current?.click()} className="w-full flex flex-col items-center justify-center px-4 py-10 bg-slate-800 border-2 border-dashed border-slate-600 rounded-xl text-gray-400 hover:border-indigo-500 hover:text-white transition-colors">
            <FileText className="w-8 h-8 mb-2" />
            <span className="font-semibold">Nhấp để tải file lên</span>
            <span className="text-sm">PDF, TXT, MD</span>
        </button>
        {textFile && (
            <div className="text-center bg-slate-800 p-3 rounded-xl border border-slate-700">
                <p className="text-sm text-gray-400">Đã chọn file:</p>
                <p className="font-semibold text-white truncate">{textFile.name}</p>
            </div>
        )}
        <button onClick={handleFileSubmit} className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed" disabled={!textFile || isFileLoading}>
            {isFileLoading ? <><RefreshCw className="w-5 h-5 mr-2 animate-spin" />Đang phân tích...</> : <><Sparkles className="w-5 h-5 mr-2" />Thêm từ file</>}
        </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Thêm từ mới</h2>
        <p className="text-gray-400 mt-1">Xây dựng từ điển cá nhân của bạn theo cách bạn muốn.</p>
      </div>
      
      {renderTabs()}

      {feedback && (
          <div className={`p-3 rounded-xl text-center text-sm font-medium ${feedback.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
              {feedback.message}
          </div>
      )}

      {mode === 'manual' && renderManualForm()}
      {mode === 'ai' && renderAiForm()}
      {mode === 'image' && renderImageForm()}
      {mode === 'file' && renderFileForm()}
    </div>
  );
};

export default AddWord;