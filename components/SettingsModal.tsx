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

  const baseClasses = "flex-1 px-3 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500";
  const activeClasses = "bg-indigo-600 text-white";
  const inactiveClasses = "bg-slate-700 text-gray-300 hover:bg-slate-600";
  
  const languages: { key: LearningLanguage; label: string }[] = [
    { key: 'german', label: 'Tiếng Đức' },
    { key: 'english', label: 'Tiếng Anh' },
    { key: 'chinese', label: 'Tiếng Trung' },
  ];

  return (
    <div className="flex items-center p-1 bg-slate-200 dark:bg-slate-900/50 rounded-xl justify-center gap-1">
      {languages.map(({ key, label }) => (
        <button 
          key={key}
          onClick={() => setLearningLanguage(key)}
          className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 ${learningLanguage === key ? 'bg-indigo-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-gray-300 hover:bg-slate-400 dark:hover:bg-slate-600'}`}
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
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 text-center">Quản lý API Key</p>
            <div className="p-3 bg-slate-100 dark:bg-slate-900/50 rounded-xl space-y-3">
                {userApiKeys.length > 0 && (
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                        {userApiKeys.map((key) => (
                            <div key={key} className="flex items-center justify-between gap-2 bg-white dark:bg-slate-800 p-2 rounded-md">
                                <div className="flex items-center gap-2 min-w-0">
                                    <KeyRound className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0"/>
                                    <span className="truncate font-mono text-sm text-slate-700 dark:text-slate-300">{`****...${key.slice(-4)}`}</span>
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
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-slate-800 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button onClick={handleAdd} className="px-4 text-sm py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md">Thêm</button>
                    </div>
                )}
                {feedback && <p className="text-xs text-center text-cyan-500 pt-1">{feedback}</p>}
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">{statusText}</p>
        </div>
    );
};


const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Cài đặt</h2>
            <button onClick={onClose} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 text-center">Ngôn ngữ học</p>
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