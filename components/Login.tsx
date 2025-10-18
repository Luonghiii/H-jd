import React, { useState } from 'react';
import { BookOpen, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { auth, googleProvider, signInWithPopup } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, AuthError } from 'firebase/auth';
import { createUserDocument } from '../services/firestoreService';

const GoogleIcon = () => (
    <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C43.021,36.251,44,30.686,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);


const Login: React.FC = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isLoginView) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await createUserDocument(userCredential.user);
      }
    } catch (err) {
        const authError = err as AuthError;
        handleAuthError(authError);
        setIsLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
        const result = await signInWithPopup(auth, googleProvider);
        await createUserDocument(result.user);
    } catch (err) {
        const authError = err as AuthError;
        handleAuthError(authError);
        setIsLoading(false);
    }
  }
  
  const handleAuthError = (authError: AuthError) => {
    switch (authError.code) {
        case 'auth/invalid-email':
            setError('Địa chỉ email không hợp lệ.');
            break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
             setError('Email hoặc mật khẩu không chính xác.');
             break;
        case 'auth/email-already-in-use':
            setError('Địa chỉ email này đã được sử dụng.');
            break;
        case 'auth/weak-password':
            setError('Mật khẩu phải có ít nhất 6 ký tự.');
            break;
        case 'auth/popup-closed-by-user':
            setError('Bạn đã đóng cửa sổ đăng nhập. Vui lòng thử lại.');
            break;
        default:
            setError('Đã xảy ra lỗi. Vui lòng thử lại.');
            break;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-slate-800 p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
            <BookOpen className="w-12 h-12 text-indigo-400 mb-3" />
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-300 text-transparent bg-clip-text">
                LBWL
            </h1>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm rounded-3xl shadow-2xl shadow-slate-900/50 border border-slate-700 p-8">
          <div className="space-y-6">
            <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-3 bg-white text-slate-800 font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] hover:bg-gray-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><GoogleIcon />Đăng nhập bằng Google</>}
            </button>
            
            <div className="flex items-center">
              <div className="flex-grow border-t border-slate-700"></div>
              <span className="flex-shrink mx-4 text-xs text-slate-500">HOẶC</span>
              <div className="flex-grow border-t border-slate-700"></div>
            </div>

            <h2 className="text-xl font-bold text-center text-white">
                {isLoginView ? 'Đăng nhập bằng Email' : 'Đăng ký bằng Email'}
            </h2>
            <form onSubmit={handleAuth} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="password"className="block text-sm font-medium text-gray-300 mb-1">
                    Mật khẩu
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                {error && <p className="text-sm text-red-400 text-center">{error}</p>}

                <button
                  type="submit"
                  className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed"
                  disabled={!email.trim() || !password.trim() || isLoading}
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                    isLoginView ? <><LogIn className="w-5 h-5 mr-2" />Đăng nhập</> : <><UserPlus className="w-5 h-5 mr-2" />Đăng ký</>
                  }
                </button>
                 <p className="text-sm text-center text-gray-400">
                    {isLoginView ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
                    <button type="button" onClick={() => { setIsLoginView(!isLoginView); setError(''); }} className="font-semibold text-indigo-400 hover:underline ml-1">
                        {isLoginView ? "Đăng ký" : "Đăng nhập"}
                    </button>
                </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;