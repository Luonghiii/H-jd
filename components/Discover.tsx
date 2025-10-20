import React, { useState, useEffect } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../hooks/useAuth';
import { GeneratedWord, CommunityDeck, CommunityDeckWord, VocabularyWord } from '../types';
import { BookOpen, Loader2, Plus, Pen, Check, Shield, AlertTriangle, Clock, Share2, Eye, ShieldAlert } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import eventBus from '../utils/eventBus';
import { useI18n } from '../hooks/useI18n';
import CommunityDeckPreviewModal from './CommunityDeckPreviewModal';
import { getApprovedCommunityDecks, getUserSubmissions, submitCommunityDeckForReview } from '../services/firestoreService';

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

type Tab = 'community' | 'create' | 'my-decks';

const CommunityDecksTab: React.FC = () => {
    const { learningLanguage } = useSettings();
    const { addMultipleWords } = useVocabulary();
    const { t } = useI18n();
    const [loadingDeckId, setLoadingDeckId] = useState<string | null>(null);
    const [previewingDeck, setPreviewingDeck] = useState<CommunityDeck | null>(null);
    const [decks, setDecks] = useState<CommunityDeck[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDecks = async () => {
            setIsLoading(true);
            setError('');
            try {
                const fetchedDecks = await getApprovedCommunityDecks(learningLanguage);
                setDecks(fetchedDecks);
            } catch (e) {
                console.error(e);
                setError('Không thể tải các bộ từ vựng cộng đồng. Vui lòng thử lại.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchDecks();
    }, [learningLanguage]);

    const handleConfirmAdd = async (deck: CommunityDeck, wordsToConfirm: CommunityDeckWord[]) => {
        setLoadingDeckId(deck.id);
        const wordsToAdd: GeneratedWord[] = wordsToConfirm.map(w => ({
            word: w.word,
            translation_vi: w.translation_vi,
            translation_en: w.translation_en,
            theme: deck.theme,
        }));

        try {
            const count = await addMultipleWords(wordsToAdd);
            if (count > 0) {
                eventBus.dispatch('notification', { type: 'success', message: `Đã thêm ${count} từ mới từ bộ "${deck.title}"!` });
            } else {
                eventBus.dispatch('notification', { type: 'info', message: `Tất cả các từ đã chọn trong bộ "${deck.title}" đã có trong danh sách của bạn.` });
            }
        } catch (error) {
            eventBus.dispatch('notification', { type: 'error', message: 'Không thể thêm bộ từ. Vui lòng thử lại.' });
        } finally {
            setLoadingDeckId(null);
            setPreviewingDeck(null);
        }
    };
    
    if (isLoading) {
        return <div className="text-center p-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-500" /></div>;
    }

    if (error) {
        return <div className="text-center p-10 text-red-500">{error}</div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {decks.length > 0 ? decks.map(deck => {
                    const Icon = iconMap[deck.icon as keyof typeof iconMap] || BookOpen;
                    return (
                        <div key={deck.id} className="bg-white/50 border border-slate-200 rounded-2xl p-6 flex flex-col transition-all duration-300 neu-light">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-indigo-500/10 rounded-lg"><Icon className="w-7 h-7 text-indigo-500" /></div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">{deck.title}</h3>
                                    <p className="text-sm text-slate-500 font-medium">{deck.wordCount} {t('discover.words')}</p>
                                </div>
                            </div>
                            <p className="mt-3 text-slate-600 text-sm flex-grow">{deck.description}</p>
                            <p className="text-xs text-slate-400 mt-2">Tạo bởi: {deck.creatorName}</p>
                            <button
                                onClick={() => setPreviewingDeck(deck)}
                                disabled={loadingDeckId === deck.id}
                                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:bg-indigo-400 neu-button-light"
                            >
                                {loadingDeckId === deck.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Eye className="w-5 h-5" /><span>Xem & Thêm</span></>}
                            </button>
                        </div>
                    );
                }) : <p className="text-center text-slate-500 md:col-span-2 lg:col-span-3 py-10">Chưa có bộ từ vựng cộng đồng nào cho ngôn ngữ này.</p>}
            </div>
            <CommunityDeckPreviewModal
                isOpen={!!previewingDeck}
                onClose={() => setPreviewingDeck(null)}
                deck={previewingDeck}
                onConfirm={(wordsToAdd) => {
                    if (previewingDeck) {
                        handleConfirmAdd(previewingDeck, wordsToAdd);
                    }
                }}
            />
        </div>
    );
};

const DeckCreatorTab: React.FC<{ onSwitchTab: (tab: Tab) => void; }> = ({ onSwitchTab }) => {
    const { words } = useVocabulary();
    const { learningLanguage, profile } = useSettings();
    const { currentUser } = useAuth();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [theme, setTheme] = useState('');
    const [icon, setIcon] = useState(iconOptions[0]);
    const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleToggleWord = (id: string) => {
        setSelectedWordIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description || !theme || !currentUser || selectedWordIds.size === 0) {
            eventBus.dispatch('notification', { type: 'warning', message: 'Vui lòng điền đầy đủ thông tin và chọn ít nhất một từ.' });
            return;
        }
        setIsSubmitting(true);
        const selectedWords = words.filter(w => selectedWordIds.has(w.id));
        const deckData = {
            title, description, theme, icon,
            language: learningLanguage,
            creatorUid: currentUser.uid,
            creatorName: profile.displayName || 'Người dùng ẩn danh',
            createdAt: Date.now(),
            wordCount: selectedWords.length,
            words: selectedWords.map(w => ({ word: w.word, translation_vi: w.translation.vietnamese, translation_en: w.translation.english })),
        };

        try {
            await submitCommunityDeckForReview(deckData);
            eventBus.dispatch('notification', { type: 'success', message: 'Đã gửi bộ từ của bạn để xét duyệt!' });
            onSwitchTab('my-decks');
        } catch (error) {
            console.error(error);
            eventBus.dispatch('notification', { type: 'error', message: 'Gửi thất bại. Vui lòng thử lại.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Tên bộ từ vựng (vd: Động từ đi lại)" required className="w-full px-4 py-2 bg-white/50 rounded-lg border border-slate-300" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả ngắn gọn về bộ từ..." required className="w-full px-4 py-2 bg-white/50 rounded-lg border border-slate-300" rows={2}></textarea>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" value={theme} onChange={e => setTheme(e.target.value)} placeholder="Chủ đề (vd: Du lịch)" required className="w-full px-4 py-2 bg-white/50 rounded-lg border border-slate-300" />
                <select value={icon} onChange={e => setIcon(e.target.value)} className="w-full px-4 py-2 bg-white/50 rounded-lg border border-slate-300">
                    {iconOptions.map(iconName => <option key={iconName} value={iconName}>{iconName}</option>)}
                </select>
            </div>
            
            <h4 className="font-semibold text-slate-700 pt-2">Chọn từ từ danh sách của bạn ({selectedWordIds.size} đã chọn)</h4>
            <div className="max-h-60 overflow-y-auto p-3 bg-white/30 rounded-lg border border-slate-300 space-y-2">
                {words.map(word => (
                    <div key={word.id} onClick={() => handleToggleWord(word.id)} className="flex items-center gap-3 p-2 rounded-md hover:bg-indigo-100 cursor-pointer">
                        <input type="checkbox" checked={selectedWordIds.has(word.id)} readOnly className="w-5 h-5" />
                        <div>
                            <p className="font-medium">{word.word}</p>
                            <p className="text-sm text-slate-600">{word.translation.vietnamese}</p>
                        </div>
                    </div>
                ))}
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:bg-indigo-400">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Share2 />}
                Gửi đi xét duyệt
            </button>
        </form>
    );
};

const MyDecksTab: React.FC = () => {
    const { currentUser } = useAuth();
    const [myDecks, setMyDecks] = useState<CommunityDeck[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (currentUser) {
            getUserSubmissions(currentUser.uid)
                .then(setMyDecks)
                .finally(() => setIsLoading(false));
        }
    }, [currentUser]);
    
    const statusInfo = {
        pending: { text: 'Đang chờ', icon: Clock, color: 'text-amber-500' },
        approved: { text: 'Đã duyệt', icon: Check, color: 'text-green-500' },
        rejected: { text: 'Bị từ chối', icon: ShieldAlert, color: 'text-red-500' },
    };

    if (isLoading) {
        return <div className="text-center p-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-500" /></div>;
    }

    return (
        <div className="space-y-4 max-w-2xl mx-auto">
            {myDecks.length > 0 ? myDecks.map(deck => {
                const status = statusInfo[deck.status as keyof typeof statusInfo] || { text: 'Trạng thái lạ', icon: Shield, color: 'text-gray-500' };
                const StatusIcon = status.icon;
                const statusColor = status.color;
                return (
                    <div key={deck.id} className="bg-white/50 p-4 rounded-lg border border-slate-300">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-slate-800">{deck.title}</h4>
                                <p className="text-sm text-slate-500">{deck.wordCount} từ</p>
                            </div>
                            <div className={`flex items-center gap-1 text-sm font-semibold ${statusColor}`}>
                                <StatusIcon className="w-4 h-4" />
                                <span>{status.text}</span>
                            </div>
                        </div>
                         {deck.status === 'rejected' && deck.rejectionReason && (
                            <p className="text-xs text-red-600 mt-2 p-2 bg-red-100 rounded">Lý do: {deck.rejectionReason}</p>
                         )}
                    </div>
                )
            }) : <p className="text-center text-slate-500 py-10">Bạn chưa gửi bộ từ vựng nào.</p>}
        </div>
    );
};

const Discover: React.FC = () => {
    const { t } = useI18n();
    const [currentTab, setCurrentTab] = useState<Tab>('community');

    const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'community', label: 'Cộng đồng', icon: BookOpen },
        { id: 'create', label: 'Tạo bộ từ', icon: Pen },
        { id: 'my-decks', label: 'Bộ từ của tôi', icon: Plus },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-800">{t('discover.title')}</h2>
                <p className="text-gray-600 mt-1">Tìm, tạo và chia sẻ các bộ từ vựng với cộng đồng.</p>
            </div>
            
            <div className="flex justify-center p-1 bg-slate-200/50 rounded-full neu-inset-light">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setCurrentTab(tab.id)}
                        className={`flex-1 px-3 py-2 text-sm font-semibold rounded-full flex items-center justify-center gap-2 transition-all ${currentTab === tab.id ? 'bg-white/40 shadow-sm' : 'text-slate-600 hover:bg-black/5'}`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {currentTab === 'community' && <CommunityDecksTab />}
            {currentTab === 'create' && <DeckCreatorTab onSwitchTab={setCurrentTab} />}
            {currentTab === 'my-decks' && <MyDecksTab />}
        </div>
    );
};

export default Discover;