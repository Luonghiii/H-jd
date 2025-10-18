import React, { useState, useRef } from 'react';
import { VocabularyWord } from '../types';
import { generateImageForWord } from '../services/geminiService';
import { X, ImageIcon, UploadCloud, RefreshCw, Sparkles, Trash2, Save } from 'lucide-react';

interface ImageEditModalProps {
  word: VocabularyWord;
  isOpen: boolean;
  onClose: () => void;
  onSave: (wordId: string, imageUrl: string) => void;
  onRemove: (wordId: string) => void;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};


const ImageEditModal: React.FC<ImageEditModalProps> = ({ word, isOpen, onClose, onSave, onRemove }) => {
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const finalImageUrl = newImageUrl || word.imageUrl;

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setError('');
    setIsLoading(true);
    setNewImageUrl(null);
    try {
      const generatedUrl = await generateImageForWord(word.word);
      setNewImageUrl(generatedUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setError('');
      setIsLoading(true);
      try {
        const base64Url = await fileToBase64(file);
        setNewImageUrl(base64Url);
      } catch (e) {
        setError("Could not read the file.");
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const handleSave = () => {
    if (newImageUrl) {
      onSave(word.id, newImageUrl);
    }
  };
  
  const handleRemove = () => {
    onRemove(word.id);
  }

  const handleClose = () => {
    setNewImageUrl(null);
    setError('');
    setIsLoading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Ảnh cho "<span className="text-cyan-300">{word.word}</span>"</h2>
            <button onClick={handleClose} className="p-2 text-gray-400 hover:bg-slate-700 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="w-full h-56 bg-slate-900/50 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-600 overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center text-gray-400">
                        <RefreshCw className="w-8 h-8 animate-spin" />
                        <p className="mt-2">Đang tải...</p>
                    </div>
                ) : finalImageUrl ? (
                    <img src={finalImageUrl} alt={`Illustration for ${word.word}`} className="w-full h-full object-contain" />
                ) : (
                    <div className="text-center text-gray-500">
                        <ImageIcon className="w-12 h-12 mx-auto" />
                        <p>Chưa có ảnh</p>
                    </div>
                )}
            </div>

            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            
            <div className="grid grid-cols-2 gap-3">
                 <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:opacity-50"
                 >
                    <UploadCloud className="w-4 h-4 mr-2" />
                    Tải ảnh lên
                 </button>
                 <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:opacity-50"
                 >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Tạo bằng AI
                 </button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSave}
                disabled={!newImageUrl || isLoading}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-green-400/50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2" />
                Lưu ảnh
              </button>
              {word.imageUrl && (
                  <button
                    onClick={handleRemove}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Xóa ảnh
                  </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditModal;