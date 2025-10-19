import React from 'react';
import { View } from '../types';
import { Sparkles, Clock, Trophy, Palette, ArrowRight } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

interface MoreProps {
    setCurrentView: (view: View) => void;
    onOpenBgCustomizer: () => void;
}

const More: React.FC<MoreProps> = ({ setCurrentView, onOpenBgCustomizer }) => {
    const { t } = useI18n();

    const menuItems = [
        {
            id: 'aitools',
            title: t('more.tools_title'),
            description: t('more.tools_desc'),
            icon: Sparkles,
            action: () => setCurrentView(View.AiTools)
        },
        {
            id: 'history',
            title: t('more.history_title'),
            description: t('more.history_desc'),
            icon: Clock,
            action: () => setCurrentView(View.History)
        },
        {
            id: 'leaderboard',
            title: t('more.leaderboard_title'),
            description: t('more.leaderboard_desc'),
            icon: Trophy,
            action: () => setCurrentView(View.Leaderboard)
        },
        {
            id: 'background',
            title: t('more.background_title'),
            description: t('more.background_desc'),
            icon: Palette,
            action: onOpenBgCustomizer
        }
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-800">{t('more.title')}</h2>
                <p className="text-gray-600 mt-1">{t('more.desc')}</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {menuItems.map(item => (
                    <div
                        key={item.id}
                        onClick={item.action}
                        className="group bg-white/50 border border-slate-200 rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 cursor-pointer neu-button-light"
                    >
                       <item.icon className="w-8 h-8 text-indigo-500 flex-shrink-0" />
                       <div className="flex-grow">
                            <h3 className="text-lg font-bold text-slate-800">{item.title}</h3>
                            <p className="mt-1 text-gray-500 text-sm">{item.description}</p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default More;