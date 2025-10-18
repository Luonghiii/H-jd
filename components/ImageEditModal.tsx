
import React, { useState, useRef } from 'react';
import { VocabularyWord } from '../types';
import { X, Sparkles, Upload, Trash2, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { generateImageForWord, editImage } from '../services/geminiService';

interface ImageEditModalProps {
    isOpen: boolean;
    word: VocabularyWord;
    onClose: () => void;
    onSave: (wordId: string, imageUrl: string) => void;
    onRemove: (wordId: string) => void;
}

const fileToBase64 = (file: File): Promise<{base64: string, mimeType: string}> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve({
                base64: result.split(',')[1],
                mimeType: file.type
            });
        };
        reader.onerror = error => reject(error);
    });
};

const ImageEditModal: React.FC<ImageEditModalProps> = ({ isOpen, word, onClose, onSave, onRemove }) => {
    const [currentImage, setCurrentImage] = useState<string | null>(word.imageUrl || null);
    const [isLoading, setIsLoading] = useState(false);
    const [editPrompt, setEditPrompt] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const imageUrl = await generateImageForWord(word.word);
            setCurrentImage(imageUrl);
        } catch (error) {
            console.error("Error generating image:", error);
            alert("Failed to generate image.");
        }
        setIsLoading(false);
    };

    const handleEdit = async () => {
        if (!editPrompt.trim() || !currentImage) return;
        setIsLoading(true);
        try {
            const base64Data = currentImage.split(',')[1];
            const mimeType = currentImage.match(/data:(.*);base64,/)?.[1] || 'image/png';
            
            const newImageUrl = await editImage(base64Data, mimeType, editPrompt);
            setCurrentImage(newImageUrl);
            setEditPrompt('');
        } catch (error) {
             console.error("Error editing image:", error);
            alert("Failed to edit image.");
        }
        setIsLoading(false);
    }

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const { base64, mimeType } = await fileToBase64(file);
            setCurrentImage(`data:${mimeType};base64,${base64}`);
        }
    };

    const handleSave = () => {
        if (currentImage) {
            onSave(word.id, currentImage);
        }
    };
    
    const handleRemove = () => {
        onRemove(word.id);
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white">Ảnh cho "{word.word}"</h2>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:bg-slate-700 rounded-full">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="relative w-full aspect-square bg-slate-700/50 rounded-xl flex items-center justify-center mb-4">
                        {currentImage ? (
                            <img src={currentImage} alt={word.word} className="w-full h-full object-contain rounded-xl" />
                        ) : (
                            <ImageIcon className="w-16 h-16 text-gray-500" />
                        )}
                        {isLoading && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                                <RefreshCw className="w-8 h-8 text-white animate-spin" />
                            </div>
                        )}
                    </div>

                    {currentImage && (
                        <div className="flex gap-2 mb-4">
                            <input 
                                type="text"
                                value={editPrompt}
                                onChange={(e) => setEditPrompt(e.target.value)}
                                placeholder="Chỉnh sửa ảnh với AI (vd: 'thêm một chiếc mũ')"
                                className="flex-grow px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md text-sm text-white"
                                disabled={isLoading}
                            />
                            <button onClick={handleEdit} disabled={!editPrompt.trim() || isLoading} className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold disabled:bg-indigo-400">Sửa</button>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                         <button onClick={handleGenerate} disabled={isLoading} className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 font-semibold rounded-lg disabled:opacity-50 text-white">
                            <Sparkles className="w-4 h-4"/> Tạo bằng AI
                        </button>
                        <button onClick={handleUploadClick} disabled={isLoading} className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 font-semibold rounded-lg disabled:opacity-50 text-white">
                            <Upload className="w-4 h-4"/> Tải lên
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={handleRemove} className="flex-1 flex items-center justify-center px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold rounded-md">
                            <Trash2 className="w-4 h-4 mr-2" /> Xóa ảnh
                        </button>
                        <button onClick={handleSave} disabled={!currentImage || currentImage === word.imageUrl} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md disabled:bg-indigo-400">
                            Lưu thay đổi
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageEditModal;