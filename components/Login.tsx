import React, { useState } from 'react';
import { auth, googleProvider, signInWithPopup, sendPasswordResetEmail } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, User } from 'firebase/auth';
import { createUserDocument } from '../services/firestoreService';
import { BookOpen, Mail, KeyRound, LogIn, UserPlus, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);

    const handleAuthSuccess = async (user: User) => {
        await createUserDocument(user);
        // App will automatically navigate away as currentUser state changes
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError('');
        try {
            const result = await signInWithPopup(auth, googleProvider);
            await handleAuthSuccess(result.user);
        } catch (error: any) {
            setError('Không thể đăng nhập với Google. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setResetEmailSent(false);
        try {
            if (isLoginView) {
                await signInWithEmailAndPassword(auth, email, password);
                // No need to call handleAuthSuccess, as existing users already have a document.
            } else {
                const result = await createUserWithEmailAndPassword(auth, email, password);
                await handleAuthSuccess(result.user);
            }
        } catch (error: any) {
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    setError('Email hoặc mật khẩu không đúng.');
                    break;
                case 'auth/email-already-in-use':
                    setError('Email này đã được sử dụng.');
                    break;
                case 'auth/weak-password':
                    setError('Mật khẩu phải có ít nhất 6 ký tự.');
                    break;
                default:
                    setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
                    break;
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!email) {
            setError('Vui lòng nhập email của bạn để đặt lại mật khẩu.');
            return;
        }
        setIsLoading(true);
        setError('');
        setResetEmailSent(false);
        try {
            await sendPasswordResetEmail(auth, email);
            setResetEmailSent(true);
        } catch (error: any) {
            setError('Không thể gửi email đặt lại mật khẩu. Vui lòng kiểm tra lại email.');
        } finally {
            setIsLoading(false);
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
                    <p className="text-gray-400 mt-2">Học từ vựng tốt hơn.</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl shadow-2xl shadow-slate-900/50 border border-slate-700 p-8">
                    <h2 className="text-2xl font-bold text-center text-white mb-6">{isLoginView ? 'Đăng nhập' : 'Đăng ký'}</h2>
                    {error && <p className="bg-red-500/20 text-red-300 text-sm text-center p-3 rounded-md mb-4">{error}</p>}
                    {resetEmailSent && <p className="bg-green-500/20 text-green-300 text-sm text-center p-3 rounded-md mb-4">Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư của bạn.</p>}
                    
                    <form onSubmit={handleEmailPasswordSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">Mật khẩu</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                            </div>
                        </div>
                        
                        <button type="submit" className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition duration-300 disabled:bg-indigo-400" disabled={isLoading}>
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLoginView ? <><LogIn className="w-5 h-5 mr-2" /> Đăng nhập</> : <><UserPlus className="w-5 h-5 mr-2" /> Đăng ký</>)}
                        </button>

                        <div className="text-center">
                            <button type="button" onClick={() => setIsLoginView(!isLoginView)} className="text-sm text-indigo-400 hover:underline">
                                {isLoginView ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
                            </button>
                            {isLoginView && (
                                <button type="button" onClick={handlePasswordReset} className="text-sm text-gray-400 hover:underline ml-4">
                                    Quên mật khẩu?
                                </button>
                            )}
                        </div>
                    </form>
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-slate-700" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-slate-900/50 px-2 text-sm text-gray-500 backdrop-blur-sm">Hoặc</span>
                        </div>
                    </div>
                    <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-md transition duration-300" disabled={isLoading}>
                        <svg className="w-5 h-5 mr-2" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.4 76.4c-24.1-23.4-58.2-37.9-96.5-37.9-84.9 0-154.6 68.2-154.6 151.8s69.8 151.8 154.6 151.8c99.9 0 137-70.1 141.2-103.9H248v-95.6h239.9c.7 12.3 1.1 25.1 1.1 38.2z"></path></svg>
                        Đăng nhập với Google
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
