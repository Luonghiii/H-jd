import React, { useState } from 'react';
import { auth, googleProvider, signInWithPopup, sendPasswordResetEmail } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, User } from 'firebase/auth';
import { createUserDocument } from '../services/firestoreService';
import { BookOpen, User as UserIcon, Lock, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);

    const handleAuthSuccess = async (user: User) => {
        await createUserDocument(user);
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
        <div className="min-h-screen flex items-center justify-center p-4 animated-gradient dark:dark-animated-gradient">
            <div className="w-full max-w-sm">
                <div className="bg-white/20 dark:bg-slate-900/30 backdrop-blur-2xl border border-white/30 dark:border-slate-700/30 rounded-3xl p-8 shadow-2xl shadow-slate-400/20 dark:shadow-black/50 animate-fade-in-up">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-24 h-24 rounded-full flex items-center justify-center bg-white/20 dark:bg-slate-900/30 p-4 shadow-inner shadow-black/10 dark:shadow-black/50 mb-4">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                <path d="M4 19V5C4 4.44772 4.44772 4 5 4H12" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M12 4H19C19.5523 4 20 4.44772 20 5V19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19" stroke="currentColor" className="text-slate-400 dark:text-slate-600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M12 4V14.5C12 14.7761 12.2239 15 12.5 15H17" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                            LBWL
                        </h1>
                        <p className="text-gray-700 dark:text-gray-300 mt-1">Học từ vựng tốt hơn.</p>
                    </div>

                    {error && <p className="text-red-600 dark:text-red-400 text-sm text-center p-3 rounded-md mb-4">{error}</p>}
                    {resetEmailSent && <p className="text-green-600 dark:text-green-400 text-sm text-center p-3 rounded-md mb-4">Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư của bạn.</p>}
                    
                    <form onSubmit={handleEmailPasswordSubmit} className="space-y-6">
                        <div>
                            <div className="relative">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
                                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full pl-12 pr-4 py-3 bg-white/10 dark:bg-black/10 rounded-full text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-300 focus:outline-none shadow-inner shadow-black/10 dark:shadow-white/5 transition-shadow focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500" required />
                            </div>
                        </div>
                        <div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
                                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu" className="w-full pl-12 pr-4 py-3 bg-white/10 dark:bg-black/10 rounded-full text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-300 focus:outline-none shadow-inner shadow-black/10 dark:shadow-white/5 transition-shadow focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500" required />
                            </div>
                        </div>
                        
                        <div>
                            <button type="submit" className="w-full flex items-center justify-center px-4 py-3 bg-indigo-500/80 hover:bg-indigo-600/90 text-white font-semibold rounded-full transition-all duration-200 shadow-lg shadow-indigo-500/40 border border-white/20 dark:border-transparent active:scale-95 disabled:opacity-70" disabled={isLoading}>
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLoginView ? 'Đăng nhập' : 'Đăng ký')}
                            </button>
                        </div>

                        <div className="text-center text-sm flex justify-center items-center gap-4">
                             {isLoginView && (
                                <button type="button" onClick={handlePasswordReset} className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
                                    Quên mật khẩu?
                                </button>
                            )}
                            <button type="button" onClick={() => { setIsLoginView(!isLoginView); setError(''); setResetEmailSent(false); }} className="text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold">
                                {isLoginView ? 'Đăng ký' : 'Đăng nhập'}
                            </button>
                           
                        </div>
                    </form>

                    <div className="relative flex pt-6 pb-4 items-center">
                        <div className="flex-grow border-t border-slate-300/50 dark:border-slate-600/50"></div>
                        <span className="flex-shrink mx-4 text-xs text-gray-500 dark:text-gray-400 uppercase">Hoặc</span>
                        <div className="flex-grow border-t border-slate-300/50 dark:border-slate-600/50"></div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center px-4 py-3 bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-semibold rounded-full transition-all duration-200 shadow-md border border-white/20 dark:border-slate-700/50 active:scale-95 disabled:opacity-70"
                    >
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
                            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.012,36.494,44,30.659,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                        </svg>
                        Đăng nhập với Google
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;