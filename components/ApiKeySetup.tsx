import React, { useState } from 'react';
import { BookOpen, KeyRound, ArrowRight } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

const ApiKeySetup: React.FC = () => {
  const { addUserApiKey } = useSettings();
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      addUserApiKey(apiKey.trim());
      // The parent component will re-render and show the main app
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-8 animate-fade-in-up">
            <BookOpen className="w-12 h-12 text-indigo-500 mb-3" />
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                Chào mừng bạn!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-center">Để sử dụng các tính năng AI, vui lòng cung cấp khóa API Google Gemini của bạn.</p>
        </div>

        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-slate-700/50 p-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-white mb-6">Cài đặt API Key</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Khóa API Google Gemini của bạn
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Nhập khóa API của bạn tại đây"
                    className="w-full pl-10 pr-4 py-3 bg-white/40 dark:bg-slate-700/50 border border-slate-300/50 dark:border-slate-600/50 rounded-md text-slate-800 dark:text-slate-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                    autoFocus
                />
              </div>
               <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Khóa của bạn sẽ được lưu trữ an toàn và liên kết với tài khoản của bạn.
                Bạn có thể nhận khóa của mình từ <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">Google AI Studio</a>.
              </p>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition duration-300 disabled:bg-indigo-400 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30"
              disabled={!apiKey.trim()}
            >
              Lưu & Bắt đầu học
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySetup;
