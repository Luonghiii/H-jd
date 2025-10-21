import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../hooks/useSettings';
import { X, User as UserIcon, Camera, Loader2, Sparkles, BookOpen, Flame, Trophy, CheckCircle, Ban } from 'lucide-react';
import eventBus from '../utils/eventBus';
import ImageGenerationModal from './ImageGenerationModal';
import { resizeAndCropImageAsDataUrl } from '../services/storageService';
import { useAchievements } from '../hooks/useAchievements';
import { achievementsList, levelStyles } from '../data/achievements';
import { useI18n } from '../hooks/useI18n';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const StatCard: React.FC<{ icon: React.ElementType; value: number | string; label: string; }> = ({ icon: Icon, value, label }) => (
    <div className="bg-slate-200/30 neu-inset-light rounded-xl p-3 text-center transition-transform hover:scale-105">
        <Icon className="mx-auto w-6 h-6 text-indigo-500 mb-1" />
        <div className="text-xl font-bold text-slate-800">{value}</div>
        <div className="text-xs text-slate-600 font-medium">{label}</div>
    </div>
);


const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
    const { profile, updateUserProfile, stats, updateSelectedAchievement } = useSettings();
    const { userAchievements } = useAchievements();
    const { t } = useI18n();
    
    // User profile fields state
    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    const [dob, setDob] = useState('');
    
    // Avatar state
    const [localAvatar, setLocalAvatar] = useState<string | null>(null);
    
    // Modal state
    const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);

    // Control state
    const [isLoading, setIsLoading] = useState(false);
    const [isAvatarLoading, setIsAvatarLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const unlockedAchievements = achievementsList.filter(ach => userAchievements[ach.id]?.level > 0);

    useEffect(() => {
        if (isOpen) {
            setDisplayName(profile.displayName || '');
            setUsername(profile.username || '');
            setDob(profile.dob || '');
            setLocalAvatar(profile.photoURL);
        }
    }, [isOpen, profile]);

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
                const dataUrl = await resizeAndCropImageAsDataUrl(file);
                await updateUserProfile({ photoURL: dataUrl });
                setLocalAvatar(dataUrl);
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
            await updateUserProfile({ photoURL: imageUrl });
            setLocalAvatar(imageUrl);
            eventBus.dispatch('notification', { type: 'success', message: 'Đã lưu avatar do AI tạo!' });
        } catch (error: any) {
            eventBus.dispatch('notification', { type: 'error', message: error.message || 'Lưu avatar thất bại.' });
        } finally {
            setIsAvatarLoading(false);
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        
        await updateUserProfile({
            displayName: displayName.trim(),
            username: username.trim(),
            dob: dob,
        });
        
        setIsLoading(false);
        eventBus.dispatch('notification', { type: 'success', message: 'Đã lưu hồ sơ!' });
        onClose();
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
                <div className="bg-slate-100/60 backdrop-blur-lg border border-white/30 neu-light rounded-2xl w-full max-w-md animate-fade-in-up" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800">Hồ sơ cá nhân</h2>
                        <button onClick={onClose} className="p-1.5 rounded-full text-slate-600 hover:bg-black/10">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                        {/* Avatar Section */}
                        <div className="flex flex-col items-center">
                            <div className="relative w-32 h-32 group">
                                <button
                                    onClick={() => !isAvatarLoading && fileInputRef.current?.click()}
                                    className="w-full h-full rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 focus:ring-indigo-500 shadow-lg neu-light"
                                    disabled={isAvatarLoading}
                                >
                                    {localAvatar ? (
                                        <img src={localAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-300 flex items-center justify-center">
                                            <UserIcon className="w-16 h-16 text-slate-500" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                                        <Camera className="w-10 h-10 text-white"/>
                                    </div>
                                    {isAvatarLoading && (
                                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                                            <Loader2 className="w-10 h-10 animate-spin text-white"/>
                                        </div>
                                    )}
                                </button>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                                <button 
                                    onClick={() => setIsGenerationModalOpen(true)}
                                    className="absolute bottom-1 right-1 p-2 bg-amber-400 text-white rounded-full shadow-lg hover:bg-amber-500 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 focus:ring-amber-500 neu-button-light"
                                    aria-label="Generate avatar with AI"
                                >
                                    <Sparkles className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>

                        {/* Stats Section */}
                        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200">
                            <StatCard icon={BookOpen} value={stats.totalWords || 0} label="Từ vựng" />
                            <StatCard icon={Flame} value={stats.currentStreak || 0} label="Chuỗi" />
                            <StatCard icon={Trophy} value={stats.longestStreak || 0} label="Kỷ lục" />
                        </div>

                        {/* Profile Fields */}
                        <div className="space-y-4 pt-4 border-t border-slate-200">
                            <div>
                                <label className="text-sm font-medium text-slate-700">Tên hiển thị</label>
                                <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full mt-1 px-3 py-2 bg-white/50 border border-slate-300/70 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition" />
                                <p className="text-xs text-slate-600 mt-1">Tên này sẽ xuất hiện trên Bảng xếp hạng. Để trống để ẩn danh.</p>
                            </div>
                             <div>
                                <label className="text-sm font-medium text-slate-700">Username</label>
                                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full mt-1 px-3 py-2 bg-white/50 border border-slate-300/70 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition" />
                            </div>
                             <div>
                                <label className="text-sm font-medium text-slate-700">Ngày sinh</label>
                                <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full mt-1 px-3 py-2 bg-white/50 border border-slate-300/70 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition" />
                            </div>
                        </div>

                        {/* Display Achievement Section */}
                        <div className="space-y-3 pt-4 border-t border-slate-200">
                            <label className="text-sm font-medium text-slate-700">{t('profile.display_achievement')}</label>
                             <p className="text-xs text-slate-600 -mt-2">{t('profile.display_achievement_desc')}</p>
                            <div className="max-h-48 overflow-y-auto space-y-2 pr-2 bg-slate-200/50 neu-inset-light rounded-xl p-2">
                                <button
                                    onClick={() => updateSelectedAchievement(null)}
                                    className={`w-full flex items-center gap-3 p-2 text-left rounded-lg transition-all ${!profile.selectedAchievement ? 'ring-2 ring-indigo-500 bg-white/50' : 'hover:bg-black/5'}`}
                                >
                                    <div className="w-8 h-8 flex items-center justify-center bg-slate-300 rounded-md"><Ban className="w-5 h-5 text-slate-600" /></div>
                                    <span className="font-semibold text-slate-700">{t('profile.no_achievement')}</span>
                                    {!profile.selectedAchievement && <CheckCircle className="w-5 h-5 text-indigo-600 ml-auto" />}
                                </button>
                                {unlockedAchievements.length > 0 ? unlockedAchievements.map(ach => {
                                    const progress = userAchievements[ach.id];
                                    const isSelected = profile.selectedAchievement?.id === ach.id;
                                    const styles = levelStyles[progress.level as keyof typeof levelStyles] || levelStyles[0];
                                    return (
                                        <button
                                            key={ach.id}
                                            onClick={() => updateSelectedAchievement({ id: ach.id, level: progress.level })}
                                            className={`w-full flex items-center gap-3 p-2 text-left rounded-lg transition-all ${isSelected ? 'ring-2 ring-indigo-500 bg-white/50' : 'hover:bg-black/5'}`}
                                        >
                                            <div className={`w-8 h-8 flex items-center justify-center ${styles.bg} rounded-md`}><ach.icon className={`w-5 h-5 ${styles.icon}`} /></div>
                                            <div className="flex-grow">
                                                <p className="font-semibold text-sm text-slate-800">{ach.name}</p>
                                                <p className="text-xs text-slate-600">{t('achievements.level')} {progress.level}</p>
                                            </div>
                                            {isSelected && <CheckCircle className="w-5 h-5 text-indigo-600 ml-auto" />}
                                        </button>
                                    );
                                }) : <p className="text-center text-sm text-slate-500 p-4">{t('profile.no_unlocked_achievements')}</p>}
                            </div>
                        </div>

                    </div>
                    <div className="p-4 bg-slate-200/50 border-t border-slate-200 flex justify-end">
                        <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:bg-indigo-400 neu-button-light" disabled={isLoading || isAvatarLoading}>
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