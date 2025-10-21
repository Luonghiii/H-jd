import React, { useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useVocabulary } from '../hooks/useVocabulary';
import { useHistory } from '../hooks/useHistory';
import { generateAiLesson } from '../services/geminiService';
import { AiLesson } from '../types';
import { ArrowLeft, RefreshCw, Sparkles, BookOpen, MessageCircle, GraduationCap, PlusCircle } from 'lucide-react';
import eventBus from '../utils/eventBus';

interface AiLessonGeneratorProps {
  onBack: () => void;
}

const AiLessonGenerator: React.FC<AiLessonGeneratorProps> = ({ onBack }) => {
    const { learningLanguage, uiLanguage, recordActivity, addXp } = useSettings();
    const { addMultipleWords } = useVocabulary();
    const { addHistoryEntry } = useHistory();
    const [theme, setTheme] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [lesson, setLesson] = useState<AiLesson | null>(null);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!theme.trim() || isLoading) return;
        setIsLoading(true);
        setLesson(null);
        eventBus.dispatch('notification', { type: 'info', message: 'AI đang soạn bài học, vui lòng đợi trong giây lát...' });
        try {
            const result = await generateAiLesson(theme, learningLanguage, uiLanguage);
            if (result) {
                setLesson(result);
                addHistoryEntry('AI_LESSON_GENERATED', `Đã tạo bài học về chủ đề: "${theme}"`, { theme });
                recordActivity();
                addXp(25); // Grant 25 XP for generating a lesson
            } else {
                eventBus.dispatch('notification', { type: 'error', message: 'Không thể tạo bài học. Vui lòng thử lại.' });
            }
        } catch (error) {
            console.error(error);
            eventBus.dispatch('notification', { type: 'error', message: 'Đã có lỗi xảy ra khi tạo bài học.' });
        }
        setIsLoading(false);
    };

    const handleAddWords = async () => {
        if (!lesson?.vocabulary) return;
        const wordsToAdd = lesson.vocabulary.map(v => ({
            word: v.word,
            translation_vi: uiLanguage === 'vietnamese' ? v.translation : '', // Approximate
            translation_en: uiLanguage === 'english' ? v.translation : '', // Approximate
            theme: theme,
        }));

        const count = await addMultipleWords(wordsToAdd);
        eventBus.dispatch('notification', { type: 'success', message: `Đã thêm ${count} từ mới vào danh sách của bạn!` });
        if (count > 0) {
            recordActivity();
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Bài học do AI tạo</h2>
                <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 rounded-xl">
                    <ArrowLeft className="w-4 h-4" /> <span>Quay lại</span>
                </button>
            </div>

            <form onSubmit={handleGenerate} className="flex gap-2">
                <input
                    type="text"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="Nhập chủ đề, vd: 'Đi nhà hàng'"
                    className="flex-grow px-4 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white"
                    disabled={isLoading}
                />
                <button type="submit" disabled={!theme.trim() || isLoading} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl text-white font-semibold disabled:bg-indigo-400">
                    {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    <span>Tạo</span>
                </button>
            </form>

            {lesson && (
                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-2xl space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white">Bài học: {theme}</h3>
                        <button onClick={handleAddWords} className="flex items-center gap-2 text-sm px-3 py-1.5 bg-green-600 rounded-lg text-white font-semibold">
                            <PlusCircle className="w-4 h-4" /> Thêm từ vựng
                        </button>
                    </div>

                    {/* Vocabulary */}
                    <div>
                        <h4 className="flex items-center gap-2 font-semibold text-white mb-2"><BookOpen className="w-5 h-5 text-cyan-400" /> Từ vựng</h4>
                        <ul className="space-y-2">
                            {lesson.vocabulary.map((item, i) => (
                                <li key={i} className="flex justify-between p-2 bg-slate-700/50 rounded-lg">
                                    <span className="font-medium">{item.word}</span>
                                    <span className="text-gray-400">{item.translation}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Dialogue */}
                    <div>
                        <h4 className="flex items-center gap-2 font-semibold text-white mb-2"><MessageCircle className="w-5 h-5 text-purple-400" /> Hội thoại mẫu</h4>
                        <div className="space-y-2 text-sm">
                            {lesson.dialogue.map((item, i) => (
                                <p key={i}><strong className="text-indigo-300">{item.speaker}:</strong> {item.line}</p>
                            ))}
                        </div>
                    </div>

                    {/* Story */}
                    <div>
                        <h4 className="font-semibold text-white mb-2">Truyện ngắn</h4>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap">{lesson.story}</p>
                    </div>

                    {/* Grammar Tip */}
                    <div>
                        <h4 className="flex items-center gap-2 font-semibold text-white mb-2"><GraduationCap className="w-5 h-5 text-amber-400" /> Mẹo ngữ pháp</h4>
                        <div className="p-3 bg-slate-900/50 rounded-lg">
                            <p className="font-semibold text-amber-300">{lesson.grammarTip.title}</p>
                            <p className="text-sm text-gray-400 mt-1">{lesson.grammarTip.explanation}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AiLessonGenerator;
