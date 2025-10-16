import React, { useState } from 'react';
import { KeyRound, X, Save, Trash2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySave: (apiKey: string) => void;
  onKeyClear: () => void;
  currentApiKey: string;
}

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
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Cài đặt</h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-slate-700 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-gray-300 mb-1">API Key hiện tại</p>
              <div className="px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-md text-gray-400 font-mono">
                {maskedApiKey}
              </div>
            </div>

            <div>
              <label htmlFor="newApiKey" className="block text-sm font-medium text-gray-300 mb-1">
                Cập nhật API Key (tùy chọn)
              </label>
              <div className="relative">
                 <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                 <input
                    id="newApiKey"
                    type="password"
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    placeholder="Nhập API key mới"
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            <p className="text-xs text-gray-500 text-center">
              Việc xóa khóa sẽ yêu cầu bạn thiết lập lại để sử dụng các tính năng AI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
