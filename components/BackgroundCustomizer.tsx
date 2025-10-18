import React, { useState, useRef, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { Palette, Image, Trash2, X, Plus, Wand2 } from 'lucide-react';

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
    const { backgroundSetting, setBackgroundImage, setBackgroundGradient, clearBackgroundSetting, customGradients, addCustomGradient, removeCustomGradient } = useSettings();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [color1, setColor1] = useState('#2a5298');
    const [color2, setColor2] = useState('#1e3c72');
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
    
    const handleAddGradient = () => {
        const newGradient = `linear-gradient(to right top, ${color1}, ${color2})`;
        if (!customGradients.includes(newGradient)) {
            addCustomGradient(newGradient);
        }
    };
    
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

    const newGradientPreview = `linear-gradient(to right top, ${color1}, ${color2})`;

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
                <div className="absolute bottom-full right-0 mb-3 w-72 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 space-y-4 animate-fade-in-up">
                    <h4 className="font-bold text-slate-900 dark:text-white">Tùy chỉnh nền</h4>
                    
                    {customGradients.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">Gradient của bạn</p>
                            <div className="grid grid-cols-4 gap-2">
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
                        <p className="text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">Gradient có sẵn</p>
                        <div className="grid grid-cols-4 gap-2">
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

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">Tạo Gradient</p>
                        <div className="flex items-center gap-2">
                            <input type="color" value={color1} onChange={e => setColor1(e.target.value)} className="w-10 h-10 p-0 border-none rounded-full cursor-pointer bg-transparent" />
                             <input type="color" value={color2} onChange={e => setColor2(e.target.value)} className="w-10 h-10 p-0 border-none rounded-full cursor-pointer bg-transparent" />
                            <div className="flex-1 h-10 rounded-lg" style={{backgroundImage: newGradientPreview}}></div>
                             <button onClick={handleAddGradient} className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-full text-slate-700 dark:text-slate-200">
                                <Plus className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>


                    <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <button 
                            onClick={handleUploadClick}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold rounded-xl transition duration-300"
                        >
                            <Image className="w-5 h-5 text-slate-600 dark:text-gray-300" />
                            Tải ảnh lên
                        </button>
                        <button 
                            onClick={handleRemove}
                            disabled={!backgroundSetting}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold rounded-xl transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Wand2 className="w-5 h-5 text-slate-600 dark:text-gray-300" />
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
