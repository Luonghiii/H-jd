import React, { useState } from 'react';
import { X, Sparkles, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { generateImageFromPrompt } from '../services/geminiService';
import eventBus from '../utils/eventBus';

interface ImageGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (imageUrl: string) => void;
}

const ImageGenerationModal: React.FC<ImageGenerationModalProps> = ({ isOpen, onClose, onSave }) => {
    const [prompt, setPrompt] = useState('');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const title = 'Tạo Avatar bằng AI';
    const placeholder = "ví dụ: một chú mèo robot dễ thương đội mũ phi hành gia";

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        
        setIsLoading(true);
        setGeneratedImage(null);
        
        try {
            const imageUrl = await generateImageFromPrompt(prompt);
            setGeneratedImage(imageUrl);
        } catch (error: any) {
            console.error("Error generating image:", error);
            let message = 'Tạo ảnh thất bại. Vui lòng thử lại.';
            if (error.message?.includes('permission denied')) {
                message = 'Khóa API không có quyền truy cập model tạo ảnh. Vui lòng kiểm tra quyền hoặc bật thanh toán trên dự án Google Cloud của bạn.';
            } else if (error.message?.toLowerCase().includes('quota')) {
                message = 'Đã đạt giới hạn API (quota). Vui lòng thử lại sau.';
            } else if (error.message === "All API keys failed.") {
                message = 'Tất cả các khóa API đều không hợp lệ hoặc không có quyền. Vui lòng kiểm tra lại trong Cài đặt.';
            }
            eventBus.dispatch('notification', { type: 'error', message });
        }
        setIsLoading(false);
    };

    const handleSave = () => {
        if (generatedImage) {
            onSave(generatedImage);
            onClose();
        }
    };
    
    const handleClose = () => {
        // Reset state on close
        setPrompt('');
        setGeneratedImage(null);
        setIsLoading(false);
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4" onClick={handleClose}>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white">{title}</h2>
                        <button onClick={handleClose} className="p-2 text-gray-400 hover:bg-slate-700 rounded-full">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="relative w-full aspect-square bg-slate-700/50 rounded-xl flex items-center justify-center mb-4">
                        {generatedImage ? (
                            <img src={generatedImage} alt="AI Generated Image" className="w-full h-full object-contain rounded-xl" />
                        ) : (
                            <ImageIcon className="w-16 h-16 text-gray-500" />
                        )}
                        {isLoading && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                                <RefreshCw className="w-8 h-8 text-white animate-spin" />
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={placeholder}
                            rows={2}
                            className="flex-grow px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md text-sm text-white resize-none"
                            disabled={isLoading}
                        />
                         <button onClick={handleGenerate} disabled={!prompt.trim() || isLoading} className="flex items-center justify-center p-3 bg-indigo-600 text-white rounded-md font-semibold disabled:bg-indigo-400">
                            <Sparkles className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
                <div className="p-4 bg-slate-900/50 flex justify-end gap-3">
                    <button onClick={handleClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">
                        Hủy
                    </button>
                    <button onClick={handleSave} disabled={!generatedImage || isLoading} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:bg-indigo-400">
                        Lưu
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageGenerationModal;