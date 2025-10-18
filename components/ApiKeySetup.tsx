import React, { useState } from 'react';
import { BookOpen, KeyRound, ArrowRight } from 'lucide-react';

interface ApiKeySetupProps {
  onKeySaved: (apiKey: string) => void;
}

const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onKeySaved }) => {
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onKeySaved(apiKey.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-slate-800 p-4">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-8">
            <BookOpen className="w-12 h-12 text-indigo-400 mb-3" />
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-300 text-transparent bg-clip-text">
                Chào mừng bạn!
            </h1>
            <p className="text-gray-400 mt-2 text-center">Để sử dụng các tính năng AI, vui lòng cung cấp khóa API Google Gemini của bạn.</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl shadow-2xl shadow-slate-900/50 border border-slate-700 p-8">
          <h2 className="text-2xl font-bold text-center text-white mb-6">Cài đặt API Key</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-1">
                Khóa API Google Gemini của bạn
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Nhập khóa API của bạn tại đây"
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                    autoFocus
                />
              </div>
               <p className="text-xs text-gray-500 mt-2">
                Khóa của bạn chỉ được lưu trữ trong bộ nhớ cục bộ của trình duyệt và không bao giờ được gửi đến máy chủ của chúng tôi.
                Bạn có thể nhận khóa của mình từ <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Google AI Studio</a>.
              </p>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition duration-300 disabled:bg-indigo-400 disabled:cursor-not-allowed"
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