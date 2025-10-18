import React, { useState } from 'react';
import { BookOpen, LogIn } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'tester' && password === 'tester') {
      setError('');
      onLoginSuccess();
    } else {
      setError('Tài khoản hoặc mật khẩu không đúng.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gradient-to-br dark:from-gray-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
            <BookOpen className="w-12 h-12 text-indigo-500 dark:text-indigo-400 mb-3" />
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-500 to-cyan-500 dark:from-indigo-400 dark:to-cyan-300 text-transparent bg-clip-text">
                LBWL
            </h1>
        </div>

        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl shadow-2xl shadow-slate-300 dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700 p-8">
          <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-6">Đăng nhập</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-1">
                Tài khoản
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tài khoản"
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="password"className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-1">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {error && <p className="text-sm text-red-500 dark:text-red-400 text-center">{error}</p>}

            <button
              type="submit"
              className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed"
              disabled={!username.trim() || !password.trim()}
            >
              <LogIn className="w-5 h-5 mr-2" />
              Đăng nhập
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
