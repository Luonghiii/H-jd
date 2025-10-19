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
                <h2 className="text-2xl font-bold text-white">{t('more.title')}</h2>
                <p className="text-gray-400 mt-1">{t('more.desc')}</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {menuItems.map(item => (
                    <div
                        key={item.id}
                        onClick={item.action}
                        className="group bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex items-center gap-4 hover:border-indigo-500/50 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/20 transition-all duration-300 cursor-pointer"
                    >
                       <item.icon className="w-8 h-8 text-indigo-400 flex-shrink-0" />
                       <div className="flex-grow">
                            <h3 className="text-lg font-bold text-white">{item.title}</h3>
                            <p className="mt-1 text-gray-400 text-sm">{item.description}</p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-gray-600 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default More;