import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../hooks/useSettings';
import { X, User as UserIcon, Upload, Check, Loader2, UserCheck, Sparkles } from 'lucide-react';
import eventBus from '../utils/eventBus';
import ImageGenerationModal from './ImageGenerationModal';

const PREMADE_AVATARS = [
    'https://storage.googleapis.com/lbwl-e99a9.appspot.com/premade-avatars/avatar1.png',
    'https://storage.googleapis.com/lbwl-e99a9.appspot.com/premade-avatars/avatar2.png',
    'https://storage.googleapis.com/lbwl-e99a9.appspot.com/premade-avatars/avatar3.png',
    'https://storage.googleapis.com/lbwl-e99a9.appspot.com/premade-avatars/avatar4.png',
    'https://storage.googleapis.com/lbwl-e99a9.appspot.com/premade-avatars/avatar5.png',
    'https://storage.googleapis.com/lbwl-e99a9.appspot.com/premade-avatars/avatar6.png',
];

const ANONYMOUS_NAME = 'Người dùng ẩn danh';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
    const { profile, leaderboardName: initialLeaderboardName, updateUserProfile, updateAvatarFromFile, updateAvatarFromUrl, setLeaderboardName } = useSettings();
    
    // User profile fields state
    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    const [dob, setDob] = useState('');
    
    // Leaderboard state
    const [leaderboardName, setLeaderboardNameState] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);

    // Avatar state
    const [localAvatar, setLocalAvatar] = useState<string | null>(null);

    // Control state
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);


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

    if (!isOpen) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Optimistic UI update with a local URL for instant preview
            const localUrl = URL.createObjectURL(file);
            setLocalAvatar(localUrl);

            setIsLoading(true);
            try {
                await updateAvatarFromFile(file);
                eventBus.dispatch('notification', { type: 'success', message: 'Cập nhật ảnh đại diện thành công!' });
            } catch (error) {
                // Revert on failure
                setLocalAvatar(profile.photoURL);
                eventBus.dispatch('notification', { type: 'error', message: 'Tải ảnh lên thất bại.' });
            }
            setIsLoading(false);
            // The useEffect hook will later sync localAvatar with the permanent URL from Firestore
        }
    };

    const handlePremadeAvatarSelect = async (url: string) => {
        setLocalAvatar(url); // Optimistic UI update
        setIsLoading(true);
        await updateAvatarFromUrl(url);
        setIsLoading(false);
    };

    const handleSave = async () => {
        setIsLoading(true);
        const nameToSave = isAnonymous ? ANONYMOUS_NAME : (leaderboardName.trim() || ANONYMOUS_NAME);

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
                            <div className="relative w-28 h-28">
                                 {localAvatar ? (
                                    <img src={localAvatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-slate-700 flex items-center justify-center">
                                        <UserIcon className="w-12 h-12 text-gray-400" />
                                    </div>
                                )}
                                {isLoading && <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin"/></div>}
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg">
                                <Upload className="w-4 h-4"/> Tải ảnh mới
                            </button>
                        </div>

                        {/* Premade Avatars */}
                        <div>
                            <p className="text-sm font-medium text-gray-300 mb-2">Hoặc chọn avatar có sẵn</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {PREMADE_AVATARS.map(url => (
                                    <button key={url} onClick={() => handlePremadeAvatarSelect(url)} className={`w-14 h-14 rounded-full p-0.5 ${localAvatar === url ? 'bg-indigo-500' : 'bg-transparent'}`}>
                                        <img src={url} alt="Premade Avatar" className="w-full h-full rounded-full object-cover"/>
                                    </button>
                                ))}
                                <button onClick={() => setIsGenerationModalOpen(true)} className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center" title="Tạo bằng AI">
                                    <Sparkles className="w-6 h-6 text-indigo-400" />
                                </button>
                            </div>
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
                        <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:bg-indigo-400" disabled={isLoading}>
                           {isLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Lưu'}
                        </button>
                    </div>
                </div>
            </div>
            {isGenerationModalOpen && (
                <ImageGenerationModal
                    isOpen={isGenerationModalOpen}
                    onClose={() => setIsGenerationModalOpen(false)}
                    onSave={(imageUrl) => {
                        handlePremadeAvatarSelect(imageUrl);
                    }}
                />
            )}
        </>
    );
};

export default ProfileModal;