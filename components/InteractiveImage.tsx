import React, { useState, useRef, useEffect } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { useHistory } from '../hooks/useHistory';
import { identifyObjectInImage } from '../services/geminiService';
import { GeneratedWord } from '../types';
import { Upload, Sparkles, PlusCircle, X, RefreshCw } from 'lucide-react';

const fileToBase64 = (file: File): Promise<{base64: string, mimeType: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve({
        base64: (reader.result as string).split(',')[1],
        mimeType: file.type
    });
    reader.onerror = error => reject(error);
  });
};

const InteractiveImage: React.FC<{onBack: () => void;}> = ({onBack}) => {
    const [imageFile, setImageFile] = useState<{base64: string, mimeType: string, url: string} | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastResult, setLastResult] = useState<GeneratedWord | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [clickMarker, setClickMarker] = useState<{x: number, y: number} | null>(null);
    
    const { addMultipleWords } = useVocabulary();
    const { addHistoryEntry } = useHistory();
    const { learningLanguage, recordActivity } = useSettings();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(new Image());

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !imageFile) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = imageRef.current;
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
        };
        img.src = imageFile.url;
    }, [imageFile]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLastResult(null);
            setFeedback(null);
            setClickMarker(null);
            const { base64, mimeType } = await fileToBase64(file);
            setImageFile({ base64, mimeType, url: URL.createObjectURL(file) });
        }
    };

    const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isLoading || !imageFile) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        // Use normalized coordinates for the marker
        setClickMarker({ x: x / canvas.width * 100, y: y / canvas.height * 100 });

        setIsLoading(true);
        setFeedback(null);
        setLastResult(null);
        
        try {
            // Use normalized coordinates for the API
            const result = await identifyObjectInImage(imageFile.base64, imageFile.mimeType, { x: x / canvas.width, y: y / canvas.height }, learningLanguage);
            setLastResult(result);
            if (result) {
                recordActivity();
                addHistoryEntry('IMAGE_OBJECT_IDENTIFIED', `Xác định đối tượng "${result.word}" từ ảnh.`, { word: result.word });
            } else {
                setFeedback("Không thể xác định đối tượng tại vị trí này.");
            }
        } catch (error: any) {
            console.error(error);
            if (error.message === "All API keys failed.") {
                setFeedback("Tất cả API key đều không hoạt động. Vui lòng kiểm tra lại trong Cài đặt.");
            } else {
                setFeedback("Đã xảy ra lỗi khi phân tích hình ảnh.");
            }
        }
        setIsLoading(false);
    };

    const handleAddWord = async () => {
        if (!lastResult) return;
        const count = await addMultipleWords([lastResult]);
        if (count > 0) {
            setFeedback(`Đã thêm "${lastResult.word}" vào danh sách!`);
            setLastResult(null);
        } else {
            setFeedback(`"${lastResult.word}" đã có trong danh sách.`);
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Khám phá qua Ảnh</h2>
            {!imageFile ? (
                <div className="text-center">
                    <input type="file" id="image-upload" className="hidden" onChange={handleFileChange} accept="image/*" />
                    <label htmlFor="image-upload" className="w-full flex flex-col items-center justify-center p-10 bg-slate-800 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-indigo-500 hover:text-white transition-colors">
                        <Upload className="w-10 h-10 mb-2 text-gray-500" />
                        <span className="font-semibold">Nhấp để tải ảnh lên</span>
                        <span className="text-sm text-gray-400">Sau đó nhấp vào bất kỳ đối tượng nào để xác định.</span>
                    </label>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="relative w-full max-w-full mx-auto aspect-video bg-black rounded-lg overflow-hidden" style={{ cursor: isLoading ? 'wait' : 'crosshair' }}>
                        <canvas ref={canvasRef} onClick={handleCanvasClick} className="w-full h-full object-contain" />
                        {clickMarker && (
                            <div className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ left: `${clickMarker.x}%`, top: `${clickMarker.y}%`}}>
                                <div className="w-full h-full rounded-full bg-cyan-400/50 animate-ping"></div>
                                <div className="absolute inset-0.5 rounded-full bg-cyan-400 border-2 border-white"></div>
                            </div>
                        )}
                    </div>

                    <div className="min-h-[6rem] text-center flex flex-col items-center justify-center p-3 bg-slate-800/50 rounded-xl">
                        {isLoading && <><RefreshCw className="w-6 h-6 animate-spin text-indigo-400" /><p className="mt-2 text-gray-300">AI đang phân tích...</p></>}
                        {feedback && <p className="text-gray-300">{feedback}</p>}
                        {lastResult && (
                             <div className="flex items-center justify-between w-full animate-fade-in">
                                <div>
                                    <p className="font-bold text-xl text-white">{lastResult.word}</p>
                                    <p className="text-gray-400">{lastResult.translation_vi} / {lastResult.translation_en}</p>
                                </div>
                                <button onClick={handleAddWord} className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 rounded-lg text-white font-semibold">
                                    <PlusCircle className="w-4 h-4"/> Thêm
                                </button>
                            </div>
                        )}
                        {!isLoading && !feedback && !lastResult && <p className="text-gray-400">Nhấp vào một đối tượng trong ảnh.</p>}
                    </div>

                    <button onClick={() => setImageFile(null)} className="w-full text-center py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">
                        Tải ảnh khác
                    </button>
                </div>
            )}
        </div>
    );
}

export default InteractiveImage;