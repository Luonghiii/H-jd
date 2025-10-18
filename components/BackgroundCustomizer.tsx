import React, { useState, useRef, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { Palette, Image, Trash2, X } from 'lucide-react';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const gradients = [
    { name: 'Hoàng hôn', value: 'linear-gradient(to right top, #304352, #d7d2cc)' },
    { name: 'Hoàng gia', value: 'linear-gradient(to right top, #1e3c72, #2a5298)' },
    { name: 'Violet', value: 'linear-gradient(to right top, #8e2de2, #4a00e0)' },
    { name: 'Mặt trời lặn', value: 'linear-gradient(to right top, #ff512f, #dd2476)' },
    { name: 'Đại dương', value: 'linear-gradient(to right top, #2193b0, #6dd5ed)' },
    { name: 'Rừng rậm', value: 'linear-gradient(to right top, #134e5e, #71b280)' },
];

const BackgroundCustomizer: React.FC = () => {
    const { backgroundSetting, setBackgroundImage, setBackgroundGradient, clearBackgroundSetting } = useSettings();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const base64Url = await fileToBase64(file);
                setBackgroundImage(base64Url);
                setIsMenuOpen(false);
            } catch (e) {
                console.error("Could not process file.", e);
                alert("Không thể xử lý tệp ảnh.");
            }
        }
    };
    
    const handleRemove = () => {
        clearBackgroundSetting();
        setIsMenuOpen(false);
    }
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div ref={menuRef} className="fixed bottom-5 right-5 z-50">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/png, image/jpeg, image/gif, image/webp" 
            />

            {isMenuOpen && (
                <div className="absolute bottom-full right-0 mb-3 w-64 bg-slate-800/90 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl p-4 space-y-4 animate-fade-in-up">
                    <h4 className="font-bold text-white">Tùy chỉnh nền</h4>
                    
                    <div>
                        <p className="text-sm font-medium text-gray-300 mb-2">Chọn màu nền</p>
                        <div className="grid grid-cols-3 gap-2">
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

                    <div className="space-y-3 pt-3 border-t border-slate-700">
                        <button 
                            onClick={handleUploadClick}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition duration-300"
                        >
                            <Image className="w-5 h-5 text-gray-300" />
                            Tải ảnh lên
                        </button>
                        <button 
                            onClick={handleRemove}
                            disabled={!backgroundSetting}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Trash2 className="w-5 h-5 text-gray-300" />
                            Dùng nền mặc định
                        </button>
                    </div>
                </div>
            )}

            <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 transform hover:scale-105"
                aria-label="Tùy chỉnh giao diện"
            >
                {isMenuOpen ? <X className="w-7 h-7" /> : <Palette className="w-7 h-7" />}
            </button>
        </div>
    );
};

export default BackgroundCustomizer;