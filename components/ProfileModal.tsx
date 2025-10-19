import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../hooks/useSettings';
import { X, User as UserIcon, Upload, Check, Loader2, UserCheck, Sparkles, Camera } from 'lucide-react';
import eventBus from '../utils/eventBus';
import ImageGenerationModal from './ImageGenerationModal';

const ANONYMOUS_NAME = 'Người dùng ẩn danh';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
    const { profile, leaderboardName: initialLeaderboardName, updateUserProfile, updateAvatarFromFile, setLeaderboardName, updateAvatarFromUrl } = useSettings();
    
    // User profile fields state
    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    const [dob, setDob] = useState('');
    
    // Leaderboard state
    const [leaderboardName, setLeaderboardNameState] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);

    // Avatar state
    const [localAvatar, setLocalAvatar] = useState<string | null>(null);
    
    // Modal state
    const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);

    // Control state
    const [isLoading, setIsLoading] = useState(false);
    const [isAvatarLoading, setIsAvatarLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);


    useEffect(() => {
        if (isOpen) {
            setDisplayName(profile.displayName || '');
            setUsername(profile.username || '');
            setDob(profile.dob || '');
            setLocalAvatar(profile.photoURL);

            const isAnon = initialLeaderboardName === ANONYMOUS_NAME;
            setIsAnonymous(isAnon);
            setLeaderboardNameState(isAnon ? '' : initialLeaderboardName || '');
        }
    }, [isOpen, profile, initialLeaderboardName]);

    // This effect ensures the local avatar state is updated if the global state changes
    // (e.g., after a successful upload completes).
    useEffect(() => {
        if (isOpen) {
            setLocalAvatar(profile.photoURL);
        }
    }, [profile.photoURL, isOpen]);

    if (!isOpen) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsAvatarLoading(true);
            try {
                const newUrl = await updateAvatarFromFile(file);
                setLocalAvatar(newUrl);
                eventBus.dispatch('notification', { type: 'success', message: 'Cập nhật ảnh đại diện thành công!' });
            } catch (error: any) {
                eventBus.dispatch('notification', { type: 'error', message: error.message || 'Tải ảnh lên thất bại do lỗi không xác định.' });
            } finally {
                setIsAvatarLoading(false);
            }
        }
    };
    
    const handleSaveGeneratedAvatar = async (imageUrl: string) => {
        setIsAvatarLoading(true);
        try {
            await updateAvatarFromUrl(imageUrl);
            eventBus.dispatch('notification', { type: 'success', message: 'Đã lưu avatar do AI tạo!' });
        } catch (error) {
            eventBus.dispatch('notification', { type: 'error', message: 'Lưu avatar thất bại.' });
        } finally {
            setIsAvatarLoading(false);
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        const nameToSave = isAnonymous ? ANONYMOUS_NAME : leaderboardName.trim();

        await Promise.all([
            updateUserProfile({
                displayName: displayName.trim(),
                username: username.trim(),
                dob: dob,
            }),
            setLeaderboardName(nameToSave)
        ]);
        
        setIsLoading(false);
        eventBus.dispatch('notification', { type: 'success', message: 'Đã lưu hồ sơ!' });
        onClose();
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
                <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">Chỉnh sửa hồ sơ</h2>
                        <button onClick={onClose}><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                        {/* Avatar Section */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative w-28 h-28 group">
                                <button
                                    onClick={() => !isAvatarLoading && fileInputRef.current?.click()}
                                    className="w-full h-full rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500"
                                    disabled={isAvatarLoading}
                                >
                                    {localAvatar ? (
                                        <img src={localAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                                            <UserIcon className="w-12 h-12 text-gray-400" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-8 h-8 text-white"/>
                                    </div>
                                    {isAvatarLoading && (
                                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-white"/>
                                        </div>
                                    )}
                                </button>
                            </div>

                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                             <button 
                                onClick={() => setIsGenerationModalOpen(true)}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg"
                            >
                                <Sparkles className="w-4 h-4 text-amber-400"/> Tạo bằng AI
                            </button>
                        </div>

                        {/* Profile Fields */}
                        <div className="space-y-4 pt-4 border-t border-slate-700">
                            <div>
                                <label className="text-sm font-medium text-gray-300">Tên hiển thị</label>
                                <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md" />
                            </div>
                             <div>
                                <label className="text-sm font-medium text-gray-300">Username</label>
                                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md" />
                            </div>
                             <div>
                                <label className="text-sm font-medium text-gray-300">Ngày sinh</label>
                                <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md" />
                            </div>
                        </div>

                         {/* Leaderboard Section */}
                        <div className="space-y-4 pt-4 border-t border-slate-700">
                            <div className="flex items-center gap-2">
                               <UserCheck className="w-5 h-5 text-indigo-400" />
                               <h3 className="text-lg font-semibold text-white">Cài đặt Bảng xếp hạng</h3>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-300">Tên trên Bảng xếp hạng</label>
                                <input type="text" value={leaderboardName} onChange={e => setLeaderboardNameState(e.target.value)} disabled={isAnonymous || isLoading} className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md disabled:opacity-50" />
                            </div>
                            <div className="flex items-center">
                                <input 
                                    id="anonymous-toggle" 
                                    type="checkbox" 
                                    checked={isAnonymous} 
                                    onChange={(e) => setIsAnonymous(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-600"
                                />
                                <label htmlFor="anonymous-toggle" className="ml-2 text-sm text-gray-300">Ẩn danh trên bảng xếp hạng</label>
                            </div>
                        </div>

                    </div>
                    <div className="p-4 bg-slate-900/50 flex justify-end">
                        <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:bg-indigo-400" disabled={isLoading || isAvatarLoading}>
                           {isLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Lưu'}
                        </button>
                    </div>
                </div>
            </div>
            <ImageGenerationModal
                isOpen={isGenerationModalOpen}
                onClose={() => setIsGenerationModalOpen(false)}
                onSave={handleSaveGeneratedAvatar}
            />
        </>
    );
};

export default ProfileModal;