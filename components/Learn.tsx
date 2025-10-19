import React, { useState } from 'react';
import Review from './Review';
import Practice from './Practice';
import Flashcards from './Flashcards';
import { BrainCircuit, PenSquare, Layers, ArrowRight } from 'lucide-react';

type LearnMode = 'menu' | 'review' | 'practice' | 'flashcards';

const learnOptions = [
    { id: 'review', component: Review, title: 'Ôn tập Thông minh', description: 'Sử dụng thuật toán lặp lại ngắt quãng (SRS) để ôn tập hiệu quả.', icon: BrainCircuit },
    { id: 'practice', component: Practice, title: 'Luyện tập Viết', description: 'Cải thiện kỹ năng viết và ghi nhớ từ bằng cách dịch.', icon: PenSquare },
    { id: 'flashcards', component: Flashcards, title: 'Thẻ ghi nhớ', description: 'Ôn tập từ vựng nhanh chóng với thẻ lật hai mặt cổ điển.', icon: Layers },
];

const Learn: React.FC = () => {
    const [activeMode, setActiveMode] = useState<LearnMode>('menu');

    const handleBack = () => setActiveMode('menu');

    if (activeMode !== 'menu') {
        const selectedMode = learnOptions.find(g => g.id === activeMode);
        if (selectedMode) {
            const LearnComponent = selectedMode.component as React.FC<{ onBack: () => void; }>;
            return <LearnComponent onBack={handleBack} />;
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-800">Ôn luyện</h2>
                <p className="text-gray-600 mt-1">Chọn một phương pháp để củng cố từ vựng của bạn.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {learnOptions.map(mode => (
                    <div
                        key={mode.id}
                        onClick={() => setActiveMode(mode.id as LearnMode)}
                        className="group bg-white/50 border border-slate-200 rounded-2xl p-6 flex flex-col transition-all duration-300 cursor-pointer neu-button-light"
                    >
                        <div className="flex justify-between items-start">
                           <mode.icon className="w-8 h-8 text-indigo-500" />
                           <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                        </div>
                        <div className="mt-4 flex-grow">
                            <h3 className="text-xl font-bold text-slate-800">{mode.title}</h3>
                            <p className="mt-1 text-slate-600 text-sm">{mode.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Learn;