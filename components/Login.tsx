import React, { useState } from 'react';
import { auth, googleProvider, signInWithPopup, sendPasswordResetEmail, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, signOut } from '../services/firebase';
import { User } from 'firebase/auth';
import { createUserDocument } from '../services/firestoreService';
import { BookOpen, User as UserIcon, Lock, Loader2, Eye, EyeOff } from 'lucide-react';

type View = 'login' | 'register' | 'forgotPassword';

const Login: React.FC = () => {
    const [view, setView] = useState<View>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleAuthSuccess = async (user: User) => {
        await createUserDocument(user);
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError('');
        setMessage('');
        try {
            const result = await signInWithPopup(auth, googleProvider);
            await handleAuthSuccess(result.user);
        } catch (error: any) {
            if (error.code?.startsWith('auth/')) {
                // Gracefully handle popup closure without showing an error to the user
                if (error.code !== 'auth/popup-closed-by-user') {
                    handleAuthError(error);
                }
            } else {
                console.error("Google Sign-in failed:", error);
                setError('Không thể hoàn tất đăng nhập Google. Vui lòng thử lại.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');

        if (view === 'login') {
            try {
                await signInWithEmailAndPassword(auth, email, password);
                // onAuthStateChanged will now handle the login success, and the component will unmount.
            } catch (error: any) {
                 if (error.code?.startsWith('auth/')) {
                    handleAuthError(error);
                } else {
                    console.error("Login process failed:", error);
                    setError("Đã có lỗi không mong muốn xảy ra khi đăng nhập.");
                }
                setIsLoading(false);
            }
        } else if (view === 'register') {
            if (password !== confirmPassword) {
                setError('Mật khẩu không khớp.');
                setIsLoading(false);
                return;
            }
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await handleAuthSuccess(userCredential.user);
                // User is now created and logged in.
                // The onAuthStateChanged listener will trigger a re-render in App.tsx,
                // which will then show the ApiKeySetup component since it's a new user.
            } catch (error: any) {
                if (error.code?.startsWith('auth/')) {
                    handleAuthError(error);
                } else {
                    console.error("Registration process failed:", error);
                    setError("Lỗi khi tạo tài khoản trong cơ sở dữ liệu. Vui lòng thử lại.");
                }
                setIsLoading(false); // Only set loading to false on error. On success, the component unmounts.
            }
        } else if (view === 'forgotPassword') {
             if (!email) {
                setError('Vui lòng nhập email của bạn để đặt lại mật khẩu.');
                setIsLoading(false);
                return;
            }
            try {
                await sendPasswordResetEmail(auth, email);
                setMessage('Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư của bạn (cả mục spam).');
            } catch (error: any) {
                setError('Không thể gửi email. Vui lòng kiểm tra lại địa chỉ email.');
            } finally {
                setIsLoading(false);
            }
        }
    };
    
    const handleAuthError = (error: any) => {
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
            case 'auth/invalid-email':
                setError('Địa chỉ email không hợp lệ.');
                break;
            default:
                setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
                break;
        }
    }

    const switchView = (newView: View) => {
        setView(newView);
        setError('');
        setMessage('');
        setPassword('');
        setConfirmPassword('');
    };
    
    const renderContent = () => {
        return (
             <>
                <h1 className="text-3xl font-bold text-slate-800 text-center">
                    {view === 'login' && 'Đăng nhập'}
                    {view === 'register' && 'Tạo tài khoản'}
                    {view === 'forgotPassword' && 'Quên mật khẩu'}
                </h1>

                <form onSubmit={handleEmailPasswordSubmit} className="space-y-4 mt-6">
                    {(view === 'login' || view === 'register') ? (
                         <div className="relative">
                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input 
                                type="email"
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                placeholder="Email"
                                className="w-full pl-12 pr-4 py-3 bg-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/50" 
                                required 
                            />
                        </div>
                    ) : null}
                    
                    {view !== 'forgotPassword' && (
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu" className="w-full pl-12 pr-12 py-3 bg-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/50" required />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                                {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                            </button>
                        </div>
                    )}
                     {view === 'register' && (
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu" className="w-full pl-12 pr-12 py-3 bg-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/50" required />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                                {showConfirmPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                            </button>
                        </div>
                    )}
                    {view === 'forgotPassword' && (
                         <div className="relative">
                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Nhập email của bạn" className="w-full pl-12 pr-4 py-3 bg-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/50" required />
                        </div>
                    )}
                    
                    <div>
                        <button type="submit" className="w-full flex items-center justify-center px-4 py-3 bg-indigo-500/80 hover:bg-indigo-600/90 text-white font-semibold rounded-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                                view === 'login' ? 'Đăng nhập' : 
                                view === 'register' ? 'Đăng ký' : 'Gửi link Reset'}
                        </button>
                    </div>
                </form>

                <div className="text-center text-sm mt-4 space-y-2">
                    {view === 'login' && <button type="button" onClick={() => switchView('forgotPassword')} className="text-slate-600 hover:text-indigo-600">Quên mật khẩu?</button>}
                    <p className="text-slate-600">
                        {view === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
                        <button type="button" onClick={() => switchView(view === 'login' ? 'register' : 'login')} className="font-semibold text-slate-700 hover:text-indigo-600 ml-1">
                            {view === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
                        </button>
                    </p>
                </div>

                <div className="relative flex pt-6 pb-4 items-center">
                    <div className="flex-grow border-t border-slate-300/50"></div>
                    <span className="flex-shrink mx-4 text-xs text-slate-500 uppercase">Hoặc</span>
                    <div className="flex-grow border-t border-slate-300/50"></div>
                </div>

                <button type="button" onClick={handleGoogleSignIn} disabled={isLoading} className="w-full flex items-center justify-center px-4 py-3 bg-white/50 hover:bg-white/80 text-slate-700 font-semibold rounded-full">
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.012,36.494,44,30.659,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
                    Tiếp tục với Google
                </button>
            </>
        );
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 animated-gradient">
            <div className="w-full max-w-sm">
                <div className="bg-white/20 backdrop-blur-2xl border border-white/30 rounded-3xl p-8 shadow-2xl animate-fade-in-up">
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center bg-white/20 p-2 shadow-inner mb-2">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"><path d="M4 19V5C4 4.44772 4.44772 4 5 4H12" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round"/><path d="M12 4H19C19.5523 4 20 4.44772 20 5V19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19" stroke="currentColor" className="text-slate-400" strokeWidth="2" strokeLinecap="round"/><path d="M12 4V14.5C12 14.7761 12.2239 15 12.5 15H17" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round"/></svg>
                        </div>
                    </div>
                    
                    {error && <p className="text-red-500 text-sm text-center bg-red-500/10 p-3 rounded-xl mb-4">{error}</p>}
                    {message && <p className="text-green-600 text-sm text-center bg-green-500/10 p-3 rounded-xl mb-4">{message}</p>}
                    
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default Login;