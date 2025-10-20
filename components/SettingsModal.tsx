import React, { useState } from 'react';
import { X, KeyRound, Trash2 } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { LearningLanguage } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LearningLanguageSelector: React.FC = () => {
  const { learningLanguage, setLearningLanguage } = useSettings();
  
  const languages: { key: LearningLanguage; label: string }[] = [
    { key: 'german', label: 'Tiếng Đức' },
    { key: 'english', label: 'Tiếng Anh' },
    { key: 'chinese', label: 'Tiếng Trung' },
  ];

  return (
    <div className="flex items-center p-1 bg-slate-200/50 rounded-xl justify-center gap-1 neu-inset-light">
      {languages.map(({ key, label }) => (
        <button 
          key={key}
          onClick={() => setLearningLanguage(key)}
          className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${learningLanguage === key ? 'bg-white/40 text-slate-800 shadow-sm' : 'bg-transparent text-slate-600 hover:bg-black/5'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

const ApiKeyManager: React.FC = () => {
    const { userApiKeys, addUserApiKey, removeUserApiKey } = useSettings();
    const [newApiKey, setNewApiKey] = useState('');
    const [feedback, setFeedback] = useState('');

    const handleAdd = async () => {
        if (newApiKey.trim()) {
            const success = await addUserApiKey(newApiKey.trim());
            if (success) {
                setNewApiKey('');
                setFeedback('Đã thêm khóa API thành công!');
            } else {
                if(userApiKeys.length >= 10) {
                    setFeedback('Đã đạt giới hạn 10 khóa API.');
                } else {
                    setFeedback('Khóa API này đã tồn tại.');
                }
            }
            setTimeout(() => setFeedback(''), 3000);
        }
    };
    
    const hasSystemKey = !!process.env.API_KEY;

    let statusText;
    if (userApiKeys.length > 0) {
        statusText = `Đang sử dụng ${userApiKeys.length} khóa API của bạn (xoay vòng).`;
    } else if (hasSystemKey) {
        statusText = 'Đang sử dụng khóa API hệ thống. Bạn có thể thêm khóa riêng để ưu tiên sử dụng.';
    } else {
        statusText = 'Chưa có khóa API nào được cấu hình. Vui lòng thêm một khóa để sử dụng các tính năng AI.';
    }

    return (
        <div>
            <p className="text-sm font-medium text-slate-700 mb-2 text-center">Quản lý API Key</p>
            <div className="p-3 bg-slate-200/50 rounded-xl space-y-3 neu-inset-light">
                {userApiKeys.length > 0 && (
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                        {userApiKeys.map((key) => (
                            <div key={key} className="flex items-center justify-between gap-2 bg-slate-100/50 p-2 rounded-md">
                                <div className="flex items-center gap-2 min-w-0">
                                    <KeyRound className="w-5 h-5 text-gray-500 flex-shrink-0"/>
                                    <span className="truncate font-mono text-sm text-slate-700">{`****...${key.slice(-4)}`}</span>
                                </div>
                                <button onClick={() => removeUserApiKey(key)} className="p-1 text-red-500 hover:bg-red-500/10 rounded-full">
                                    <Trash2 className="w-4 h-4"/>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                {userApiKeys.length < 10 && (
                    <div className="flex gap-2">
                         <input
                            type="password"
                            value={newApiKey}
                            onChange={(e) => setNewApiKey(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            placeholder="Nhập khóa API mới..."
                            className="w-full px-3 py-2 bg-transparent border-none rounded-md text-slate-800 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 neu-inset-light"
                        />
                        <button onClick={handleAdd} className="px-4 text-sm py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md neu-button-light">Thêm</button>
                    </div>
                )}
                {feedback && <p className="text-xs text-center text-cyan-600 pt-1">{feedback}</p>}
            </div>
            <p className="text-xs text-slate-600 mt-2 text-center">{statusText}</p>
            <p className="text-xs text-slate-600 mt-2 text-center">
                Bạn có thể nhận khóa API của mình từ{' '}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                    Google AI Studio
                </a>.
            </p>
            <details className="mt-2 text-center">
                <summary className="text-sm font-medium text-indigo-600 hover:underline cursor-pointer">
                    Xem video hướng dẫn
                </summary>
                <div className="mt-2 aspect-[9/16] w-full max-w-xs mx-auto">
                    <iframe
                        className="w-full h-full rounded-lg"
                        src="https://www.youtube.com/embed/z7b74B2oapQ?controls=1&modestbranding=1&rel=0&autoplay=1&mute=1&loop=1&playlist=z7b74B2oapQ"
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                    ></iframe>
                </div>
            </details>
        </div>
    );
};


const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-slate-100/60 backdrop-blur-lg border border-white/30 neu-light rounded-xl w-full max-w-md animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">Cài đặt</h2>
            <button onClick={onClose} className="p-2 text-gray-500 hover:bg-black/5 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2 text-center">Ngôn ngữ học</p>
              <LearningLanguageSelector />
            </div>
            
            <ApiKeyManager />

          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;