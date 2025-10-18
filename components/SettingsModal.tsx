import React, { useState } from 'react';
import { KeyRound, X, Save, Trash2 } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { LearningLanguage } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySave: (apiKey: string) => void;
  onKeyClear: () => void;
  currentApiKey: string;
}

const LearningLanguageSelector: React.FC = () => {
  const { learningLanguage, setLearningLanguage } = useSettings();

  const baseClasses = "flex-1 px-3 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 dark:focus:ring-offset-slate-800 focus:ring-indigo-500";
  const activeClasses = "bg-indigo-600 text-white";
  const inactiveClasses = "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-gray-300 hover:bg-slate-400/80 dark:hover:bg-slate-600";
  
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
          className={`${baseClasses} ${learningLanguage === key ? activeClasses : inactiveClasses}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};


const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onKeySave, onKeyClear, currentApiKey }) => {
  const [newApiKey, setNewApiKey] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (newApiKey.trim()) {
      onKeySave(newApiKey.trim());
      setNewApiKey('');
      onClose();
    }
  };
  
  const handleClear = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa API key không? Bạn sẽ cần phải nhập lại để sử dụng các tính năng AI.")) {
        onKeyClear();
    }
  }

  const maskedApiKey = currentApiKey.length > 8 ? `${currentApiKey.substring(0, 4)}...${currentApiKey.substring(currentApiKey.length - 4)}` : currentApiKey;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Cài đặt</h2>
            <button onClick={onClose} className="p-2 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-gray-300 mb-2 text-center">Ngôn ngữ học</p>
              <LearningLanguageSelector />
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700/60 pt-6 space-y-6">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-gray-300 mb-1">API Key hiện tại</p>
                  <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-md text-slate-500 dark:text-gray-400 font-mono">
                    {maskedApiKey}
                  </div>
                </div>

                <div>
                  <label htmlFor="newApiKey" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-1">
                    Cập nhật API Key (tùy chọn)
                  </label>
                  <div className="relative">
                     <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-gray-500" />
                     <input
                        id="newApiKey"
                        type="password"
                        value={newApiKey}
                        onChange={(e) => setNewApiKey(e.target.value)}
                        placeholder="Nhập API key mới"
                        className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                     />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleSave}
                    disabled={!newApiKey.trim()}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition duration-300 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Lưu khóa mới
                  </button>
                  <button
                    onClick={handleClear}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white font-semibold rounded-md transition duration-300"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Xóa API Key
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-500 text-center">
                  Việc xóa khóa sẽ yêu cầu bạn thiết lập lại để sử dụng các tính năng AI.
                </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
