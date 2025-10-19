import React, { useState } from 'react';
import AddWord from './AddWord';
import WordList from './WordList';
import { BookOpen, Feather, ArrowRight } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

type View = 'menu' | 'list' | 'add';

const Vocabulary: React.FC = () => {
    const [activeView, setActiveView] = useState<View>('menu');
    const { t } = useI18n();

    const handleBack = () => setActiveView('menu');

    const menuOptions = [
        { id: 'list', component: WordList, title: t('vocabulary.list_tab'), description: t('vocabulary.desc_list'), icon: BookOpen },
        { id: 'add', component: AddWord, title: t('vocabulary.add_tab'), description: t('vocabulary.desc_add'), icon: Feather },
    ];

    if (activeView !== 'menu') {
        const selectedOption = menuOptions.find(o => o.id === activeView);
        if (selectedOption) {
            const ViewComponent = selectedOption.component as React.FC<{ onBack: () => void; }>;
            return <ViewComponent onBack={handleBack} />;
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-800">{t('vocabulary.title_list')}</h2>
                <p className="text-gray-600 mt-1">{t('vocabulary.desc_list')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {menuOptions.map(option => (
                    <div
                        key={option.id}
                        onClick={() => setActiveView(option.id as View)}
                        className="group bg-white/50 border border-slate-200 rounded-2xl p-6 flex flex-col transition-all duration-300 cursor-pointer neu-button-light"
                    >
                        <div className="flex justify-between items-start">
                           <option.icon className="w-8 h-8 text-indigo-500" />
                           <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                        </div>
                        <div className="mt-4 flex-grow">
                            <h3 className="text-xl font-bold text-slate-800">{option.title}</h3>
                            <p className="mt-1 text-gray-500 text-sm">{option.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Vocabulary;