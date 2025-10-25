import React, { useState, useMemo } from 'react';
import { StudySet } from '../types';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../hooks/useAuth';
import { useHistory } from '../hooks/useHistory';
import { submitCommunityDeckForReview } from '../services/firestoreService';
import * as LucideIcons from 'lucide-react';
import eventBus from '../utils/eventBus';
import { X, Share2, Loader2, Upload } from 'lucide-react';

const iconMap = {
    Utensils: LucideIcons.Utensils,
    Plane: LucideIcons.Plane,
    Briefcase: LucideIcons.Briefcase,
    MessageCircle: LucideIcons.MessageCircle,
    Building2: LucideIcons.Building2,
    Brain: LucideIcons.Brain,
    Heart: LucideIcons.Heart,
    Leaf: LucideIcons.Leaf,
    Book: LucideIcons.Book,
};
const iconOptions = Object.keys(iconMap);

interface ShareStudySetModalProps {
    isOpen: boolean;
    onClose: () => void;
    deckToShare: StudySet | null;
}

const ShareStudySetModal: React.FC<ShareStudySetModalProps> = ({ isOpen, onClose, deckToShare }) => {
    const { words } = useVocabulary();
    const { learningLanguage, profile, incrementAchievementCounter } = useSettings();
    const { addHistoryEntry } = useHistory();
    const { currentUser } = useAuth();

    const [description, setDescription] = useState('');
    const [theme, setTheme] = useState('');
    const [icon, setIcon] = useState(iconOptions[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedWords = useMemo(() => {
        if (!deckToShare) return [];
        return words.filter(w => deckToShare.wordIds.includes(w.id));
    }, [deckToShare, words]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deckToShare || !description.trim() || !theme.trim() || !currentUser || isSubmitting) {
            eventBus.dispatch('notification', { type: 'warning', message: 'Vui lòng điền đầy đủ mô tả và chủ đề.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const deckData = {
                title: deckToShare.name,
                description,
                theme,
                icon,
                language: learningLanguage,
                creatorUid: currentUser.uid,
                creatorName: profile.displayName || 'Người dùng ẩn danh',
                createdAt: Date.now(),
                wordCount: selectedWords.length,
                words: selectedWords.map(w => ({
                    word: w.word,
                    translation_vi: w.translation.vietnamese,
                    translation_en: w.translation.english,
                })),
            };
            
            await submitCommunityDeckForReview(deckData);
            eventBus.dispatch('notification', { type: 'success', message: `Đã gửi bộ "${deckToShare.name}" để xét duyệt!` });
            addHistoryEntry('COMMUNITY_DECK_SUBMITTED', `Đã gửi bộ từ vựng "${deckToShare.name}" để xét duyệt.`);
            incrementAchievementCounter('COMMUNITY_DECK_SUBMITTED');
            handleClose();
        } catch (error) {
            console.error("Failed to submit deck for review", error);
            eventBus.dispatch('notification', { type: 'error', message: 'Gửi thất bại. Vui lòng thử lại.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleClose = () => {
        setDescription('');
        setTheme('');
        setIcon(iconOptions[0]);
        onClose();
    };

    if (!isOpen || !deckToShare) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={handleClose}>
            <form onSubmit={handleSubmit} className="bg-slate-800 p-6 rounded-2xl space-y-4 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-white text-lg">Chia sẻ "{deckToShare.name}"</h3>
                        <p className="text-sm text-gray-400">Thêm chi tiết để chia sẻ bộ từ này với cộng đồng.</p>
                    </div>
                    <button type="button" onClick={handleClose} className="p-1 text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Thêm mô tả..." required className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" rows={2}></textarea>
                <input type="text" value={theme} onChange={e => setTheme(e.target.value)} placeholder="Chủ đề (vd: Du lịch, Thức ăn)" required className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" />

                <div>
                    <h4 className="font-semibold text-gray-300 text-sm mb-2">Chọn biểu tượng</h4>
                    <div className="grid grid-cols-6 gap-2">
                        {iconOptions.map(iconName => {
                            const IconComponent = iconMap[iconName as keyof typeof iconMap];
                            return (
                                <button type="button" key={iconName} onClick={() => setIcon(iconName)} className={`aspect-square flex items-center justify-center rounded-lg border-2 ${icon === iconName ? 'border-indigo-500 ring-2 ring-indigo-400' : 'border-slate-600'} bg-slate-700`}>
                                    <IconComponent className="w-6 h-6 text-gray-300" />
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={handleClose} className="px-4 py-2 bg-slate-600 rounded-lg text-white">Hủy</button>
                    <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg text-white disabled:bg-indigo-400">
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Share2 className="w-5 h-5"/>}
                        {isSubmitting ? 'Đang gửi...' : 'Gửi đi'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ShareStudySetModal;
