import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../hooks/useAuth';
import { GeneratedWord, CommunityDeck, CommunityDeckWord, VocabularyWord } from '../types';
import { BookOpen, Loader2, Plus, Pen, Check, Shield, AlertTriangle, Clock, Share2, Eye, ShieldAlert, Search, Upload } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import eventBus from '../utils/eventBus';
import { useI18n } from '../hooks/useI18n';
import CommunityDeckPreviewModal from './CommunityDeckPreviewModal';
import { getApprovedCommunityDecks, getUserSubmissions, submitCommunityDeckForReview } from '../services/firestoreService';
import { resizeDeckIconAsDataUrl } from '../services/storageService';
import { useHistory } from '../hooks/useHistory';

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
    const { addHistoryEntry } = useHistory();
    const { t } = useI18n();
    const [loadingDeckId, setLoadingDeckId] = useState<string | null>(null);
    const [previewingDeck, setPreviewingDeck] = useState<CommunityDeck | null>(null);
    const [decks, setDecks] = useState<CommunityDeck[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

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

    const filteredDecks = useMemo(() => {
        if (!searchTerm) return decks;
        const lowerCaseSearch = searchTerm.toLowerCase();
        return decks.filter(deck => 
            deck.title.toLowerCase().includes(lowerCaseSearch) ||
            deck.description.toLowerCase().includes(lowerCaseSearch)
        );
    }, [decks, searchTerm]);

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
                addHistoryEntry('COMMUNITY_DECK_ADDED', `Đã thêm ${count} từ từ bộ "${deck.title}".`, { count });
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
            <div className="relative max-w-lg mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Tìm kiếm bộ từ vựng..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/50 rounded-lg border border-slate-300 placeholder-slate-500"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDecks.length > 0 ? filteredDecks.map(deck => {
                    const isCustomIcon = deck.icon.startsWith('data:image/');
                    const Icon = isCustomIcon ? null : (iconMap[deck.icon as keyof typeof iconMap] || BookOpen);
                    return (
                        <div key={deck.id} className="bg-white/50 border border-slate-200 rounded-2xl p-6 flex flex-col transition-all duration-300 neu-light">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-indigo-500/10 rounded-lg">
                                    {Icon ? (
                                        <Icon className="w-7 h-7 text-indigo-500" />
                                    ) : (
                                        <img src={deck.icon} alt={deck.title} className="w-7 h-7 object-cover rounded-sm" />
                                    )}
                                </div>
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
                }) : <p className="text-center text-slate-500 md:col-span-2 lg:col-span-3 py-10">Không tìm thấy bộ từ vựng nào.</p>}
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
    const { words, getAvailableThemes } = useVocabulary();
    const { learningLanguage, profile, incrementAchievementCounter } = useSettings();
    const { addHistoryEntry } = useHistory();
    const { currentUser } = useAuth();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [theme, setTheme] = useState('');
    const [icon, setIcon] = useState(iconOptions[0]);
    const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [wordSearchTerm, setWordSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const availableThemes = useMemo(() => getAvailableThemes(), [words]);

    const filteredWords = useMemo(() => {
        if (!wordSearchTerm) return words;
        const lowerSearch = wordSearchTerm.toLowerCase();
        return words.filter(w => w.word.toLowerCase().includes(lowerSearch) || w.translation.vietnamese.toLowerCase().includes(lowerSearch));
    }, [words, wordSearchTerm]);

    const handleThemeSelect = (selectedTheme: string) => {
        setTheme(selectedTheme);
        const wordIdsInTheme = words.filter(w => w.theme === selectedTheme).map(w => w.id);
        setSelectedWordIds(new Set(wordIdsInTheme));
    };

    const handleToggleWord = (id: string) => {
        setSelectedWordIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };
    
    const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const dataUrl = await resizeDeckIconAsDataUrl(file);
                setIcon(dataUrl);
            } catch (error: any) {
                eventBus.dispatch('notification', { type: 'error', message: error.message || 'Lỗi xử lý ảnh.' });
            }
        }
    };

    const handleSelectAll = () => {
        setSelectedWordIds(new Set(words.map(w => w.id)));
    };

    const handleDeselectAll = () => {
        setSelectedWordIds(new Set());
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description || !theme || !currentUser || selectedWordIds.size === 0) {
            eventBus.dispatch('notification', { type: 'warning', message: 'Vui lòng điền đầy đủ thông tin và chọn ít nhất một từ.' });
            return;
        }

        setIsSubmitting(true);
        const DECK_WORD_LIMIT = 200;
        const selectedWords = words.filter(w => selectedWordIds.has(w.id));
        const numDecks = Math.ceil(selectedWords.length / DECK_WORD_LIMIT);

        try {
            const submissionPromises: Promise<void>[] = [];

            for (let i = 0; i < numDecks; i++) {
                const chunkStart = i * DECK_WORD_LIMIT;
                const chunkEnd = chunkStart + DECK_WORD_LIMIT;
                const wordChunk = selectedWords.slice(chunkStart, chunkEnd);
                
                const deckTitle = numDecks > 1 ? `${title} (${i + 1})` : title;

                const deckData = {
                    title: deckTitle,
                    description,
                    theme,
                    icon,
                    language: learningLanguage,
                    creatorUid: currentUser.uid,
                    creatorName: profile.displayName || 'Người dùng ẩn danh',
                    createdAt: Date.now() + i, // Add a slight offset to maintain order
                    wordCount: wordChunk.length,
                    words: wordChunk.map(w => ({ word: w.word, translation_vi: w.translation.vietnamese, translation_en: w.translation.english })),
                };
                
                submissionPromises.push(submitCommunityDeckForReview(deckData));
            }

            await Promise.all(submissionPromises);

            eventBus.dispatch('notification', { type: 'success', message: `Đã gửi thành công ${numDecks} bộ từ vựng để xét duyệt!` });
            addHistoryEntry('COMMUNITY_DECK_SUBMITTED', `Đã gửi ${numDecks} bộ từ vựng ("${title}") để xét duyệt.`);
            incrementAchievementCounter('COMMUNITY_DECK_SUBMITTED');
            
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
            <input type="text" value={theme} onChange={e => setTheme(e.target.value)} placeholder="Chủ đề (vd: Du lịch)" required className="w-full px-4 py-2 bg-white/50 rounded-lg border border-slate-300" />
            
            <div>
                <h4 className="font-semibold text-slate-700 mb-2">Chọn biểu tượng</h4>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                    {iconOptions.map(iconName => {
                        const IconComponent = iconMap[iconName as keyof typeof iconMap];
                        return (
                            <button type="button" key={iconName} onClick={() => setIcon(iconName)} className={`aspect-square flex items-center justify-center rounded-lg border-2 ${icon === iconName ? 'border-indigo-500 ring-2 ring-indigo-300' : 'border-slate-300'} bg-white/50`}>
                                <IconComponent className="w-6 h-6 text-slate-700" />
                            </button>
                        )
                    })}
                     <button type="button" onClick={() => fileInputRef.current?.click()} className={`aspect-square flex items-center justify-center rounded-lg border-2 ${icon.startsWith('data:image') ? 'border-indigo-500 ring-2 ring-indigo-300' : 'border-slate-300'} bg-white/50`}>
                        {icon.startsWith('data:image') ? (
                            <img src={icon} alt="Custom Icon" className="w-full h-full object-cover rounded-md" />
                        ) : (
                            <Upload className="w-6 h-6 text-slate-700" />
                        )}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleIconUpload} className="hidden" accept="image/*" />
                </div>
            </div>

            <div>
                <h4 className="font-semibold text-slate-700 mb-2">Chọn từ từ danh sách của bạn ({selectedWordIds.size} đã chọn)</h4>
                <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <select onChange={(e) => handleThemeSelect(e.target.value)} className="w-full px-4 py-2 bg-white/50 rounded-lg border border-slate-300" defaultValue="">
                            <option value="" disabled>Hoặc chọn nhanh theo chủ đề...</option>
                            {availableThemes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" value={wordSearchTerm} onChange={e => setWordSearchTerm(e.target.value)} placeholder="Tìm từ..." className="w-full pl-9 pr-3 py-2 bg-white/50 rounded-lg border border-slate-300" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={handleSelectAll} className="px-3 py-1 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md font-semibold">Chọn toàn bộ từ</button>
                        <button type="button" onClick={handleDeselectAll} className="px-3 py-1 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md font-semibold">Bỏ chọn toàn bộ từ</button>
                    </div>
                </div>
                <div className="max-h-60 overflow-y-auto p-3 bg-white/30 rounded-lg border border-slate-300 space-y-2 mt-2">
                    {filteredWords.map(word => (
                        <div key={word.id} onClick={() => handleToggleWord(word.id)} className="flex items-center gap-3 p-2 rounded-md hover:bg-indigo-100 cursor-pointer">
                            <input type="checkbox" checked={selectedWordIds.has(word.id)} readOnly className="w-5 h-5" />
                            <div>
                                <p className="font-medium">{word.word}</p>
                                <p className="text-sm text-slate-600">{word.translation.vietnamese}</p>
                            </div>
                        </div>
                    ))}
                </div>
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
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (currentUser) {
            getUserSubmissions(currentUser.uid)
                .then(setMyDecks)
                .finally(() => setIsLoading(false));
        }
    }, [currentUser]);

    const filteredDecks = useMemo(() => {
        if (!searchTerm) return myDecks;
        return myDecks.filter(deck => deck.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [myDecks, searchTerm]);
    
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
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Tìm bộ từ của bạn..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/50 rounded-lg border border-slate-300 placeholder-slate-500"
                />
            </div>
            {filteredDecks.length > 0 ? filteredDecks.map(deck => {
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