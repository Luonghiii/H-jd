
import React, { useState } from 'react';
import { X, KeyRound } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { LearningLanguage } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved: (key: string) => void;
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
    <div className="flex items-center p-1 bg-slate-900/50 rounded-xl justify-center gap-1">
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

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onKeySaved }) => {
  const { apiKey } = useSettings();
  const [currentApiKey, setCurrentApiKey] = useState(apiKey || '');

  const handleSaveKey = () => {
      if (currentApiKey.trim()) {
        onKeySaved(currentApiKey.trim());
        onClose();
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Cài đặt</h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-slate-700 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-gray-300 mb-2 text-center">Ngôn ngữ học</p>
              <LearningLanguageSelector />
            </div>
            
            <div className="border-t border-slate-700 pt-6">
              <p className="text-sm font-medium text-gray-300 mb-2">Quản lý API Key</p>
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    value={currentApiKey}
                    onChange={(e) => setCurrentApiKey(e.target.value)}
                    placeholder="Nhập khóa API mới của bạn"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md text-sm text-white"
                  />
                </div>
                <button 
                  onClick={handleSaveKey} 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-semibold transition-colors disabled:bg-indigo-400"
                  disabled={!currentApiKey.trim() || currentApiKey.trim() === apiKey}
                >
                  Lưu
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Khóa API của bạn được lưu cục bộ trong trình duyệt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;