import React, { useState, useRef } from 'react';
import { useSettings } from '../hooks/useSettings';
import { Palette, Image, Wand2, X, Plus, Loader2 } from 'lucide-react';
import { resizeBackgroundImageAsDataUrl } from '../services/storageService';
import eventBus from '../utils/eventBus';

const gradients = [
    { name: 'Mặc định Sáng', value: 'linear-gradient(to right top, #f1f5f9, #e2e8f0)' },
    { name: 'Mặc định Tối', value: 'linear-gradient(to right top, #1e293b, #0f172a)' },
    { name: 'Hoàng gia', value: 'linear-gradient(to right top, #1e3c72, #2a5298)' },
    { name: 'Violet', value: 'linear-gradient(to right top, #8e2de2, #4a00e0)' },
    { name: 'Mặt trời lặn', value: 'linear-gradient(to right top, #ff512f, #dd2476)' },
    { name: 'Đại dương', value: 'linear-gradient(to right top, #2193b0, #6dd5ed)' },
    { name: 'Rừng rậm', value: 'linear-gradient(to right top, #134e5e, #71b280)' },
];

interface BackgroundCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
}

const BackgroundCustomizer: React.FC<BackgroundCustomizerProps> = ({ isOpen, onClose }) => {
    const { backgroundSetting, setBackgroundImage, setBackgroundGradient, clearBackgroundSetting, customGradients, addCustomGradient, removeCustomGradient } = useSettings();
    const [color1, setColor1] = useState('#2a5298');
    const [color2, setColor2] = useState('#1e3c72');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsUploading(true);
            try {
                const base64Url = await resizeBackgroundImageAsDataUrl(file);
                await setBackgroundImage(base64Url);
                eventBus.dispatch('notification', { type: 'success', message: 'Đã cập nhật ảnh nền!' });
            } catch (e: any) {
                console.error("Could not process file.", e);
                eventBus.dispatch('notification', { type: 'error', message: e.message || "Không thể xử lý tệp ảnh." });
            } finally {
                setIsUploading(false);
            }
        }
    };
    
    const handleRemove = () => {
        clearBackgroundSetting();
        onClose();
    }
    
    const handleAddGradient = () => {
        const newGradient = `linear-gradient(to right top, ${color1}, ${color2})`;
        if (!customGradients.includes(newGradient)) {
            addCustomGradient(newGradient);
        }
    };
    
    const newGradientPreview = `linear-gradient(to right top, ${color1}, ${color2})`;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 p-4 flex items-center justify-center">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/png, image/jpeg, image/gif, image/webp" 
            />
            <div 
                className="w-full max-w-sm bg-slate-800/90 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl p-4 space-y-4 animate-fade-in-up"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white">Tùy chỉnh nền</h4>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-300 hover:bg-slate-700"><X className="w-4 h-4" /></button>
                </div>
                
                {customGradients.length > 0 && (
                    <div>
                        <p className="text-sm font-medium text-gray-300 mb-2">Gradient của bạn</p>
                        <div className="grid grid-cols-5 gap-2">
                            {customGradients.map((g, i) => (
                                <div key={i} className="relative group">
                                    <button
                                        title="Custom Gradient"
                                        onClick={() => setBackgroundGradient(g)}
                                        className="w-full h-10 rounded-lg border-2 transition-all"
                                        style={{
                                            backgroundImage: g,
                                            borderColor: backgroundSetting?.type === 'gradient' && backgroundSetting.value === g ? '#6366f1' : 'transparent'
                                        }}
                                    />
                                    <button onClick={() => removeCustomGradient(g)} className="absolute -top-1 -right-1 p-0.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X className="w-3 h-3"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div>
                    <p className="text-sm font-medium text-gray-300 mb-2">Gradient có sẵn</p>
                    <div className="grid grid-cols-5 gap-2">
                        {gradients.map(g => (
                            <button
                                key={g.name}
                                title={g.name}
                                onClick={() => setBackgroundGradient(g.value)}
                                className="w-full h-10 rounded-lg border-2 transition-all"
                                style={{
                                    backgroundImage: g.value,
                                    borderColor: backgroundSetting?.type === 'gradient' && backgroundSetting.value === g.value ? '#6366f1' : 'transparent'
                                }}
                            />
                        ))}
                    </div>
                </div>

                <div className="pt-3 border-t border-slate-700">
                    <p className="text-sm font-medium text-gray-300 mb-2">Tạo Gradient</p>
                    <div className="flex items-center gap-2">
                        <input type="color" value={color1} onChange={e => setColor1(e.target.value)} className="w-10 h-10 p-0 border-none rounded-full cursor-pointer bg-transparent" />
                         <input type="color" value={color2} onChange={e => setColor2(e.target.value)} className="w-10 h-10 p-0 border-none rounded-full cursor-pointer bg-transparent" />
                        <div className="flex-1 h-10 rounded-lg" style={{backgroundImage: newGradientPreview}}></div>
                         <button onClick={handleAddGradient} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full text-slate-200">
                            <Plus className="w-5 h-5"/>
                        </button>
                    </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-700">
                    <button 
                        onClick={handleUploadClick}
                        disabled={isUploading}
                        className="w-full flex items-center justify-center gap-3 px-3 py-2 text-sm text-left bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Image className="w-5 h-5 text-gray-300" />}
                        {isUploading ? 'Đang xử lý...' : 'Tải ảnh lên'}
                    </button>
                    <button 
                        onClick={handleRemove}
                        disabled={!backgroundSetting}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Wand2 className="w-5 h-5 text-gray-300" />
                        Dùng nền mặc định
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BackgroundCustomizer;