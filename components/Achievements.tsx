import React from 'react';
import { useAchievements } from '../hooks/useAchievements';
import { achievementsList, levelStyles } from '../data/achievements';
import { Star, Lock } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

const AchievementCard: React.FC<{ achievement: typeof achievementsList[0], progress: any }> = ({ achievement, progress }) => {
    const { t } = useI18n();
    const currentLevel = progress?.level || 0;
    const currentProgress = progress?.progress || 0;
    const nextLevelGoal = currentLevel < 5 ? achievement.levels[currentLevel] : achievement.levels[4];
    const progressPercent = nextLevelGoal > 0 ? Math.min((currentProgress / nextLevelGoal) * 100, 100) : 0;

    const isMaxLevel = currentLevel === 5;
    const styles = levelStyles[currentLevel as keyof typeof levelStyles] || levelStyles[0];

    return (
        <div className={`bg-white/50 border rounded-2xl p-4 flex flex-col transition-all duration-300 neu-light ${currentLevel === 0 ? 'opacity-70' : ''}`}>
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${styles.bg}`}>
                    <achievement.icon className={`w-7 h-7 ${styles.icon}`} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">{achievement.name}</h3>
                    <p className="text-sm text-slate-600">{achievement.description}</p>
                </div>
            </div>
            <div className="mt-4 flex-grow flex flex-col justify-end">
                <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                            <Star 
                                key={i} 
                                className={`w-4 h-4 transition-colors ${i < currentLevel ? styles.star : 'text-slate-300'}`} 
                                fill={i < currentLevel ? 'currentColor' : 'none'}
                            />
                        ))}
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                        {isMaxLevel ? 'Đã hoàn thành!' : `${currentProgress} / ${nextLevelGoal}`}
                    </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 neu-inset-light">
                    <div 
                        className={`h-2.5 rounded-full transition-all duration-500 ${styles.progress}`} 
                        style={{ width: `${isMaxLevel ? 100 : progressPercent}%` }}
                    ></div>
                </div>
                 {progress?.unlockedAt && currentLevel > 0 && (
                    <p className="text-xs text-slate-500 mt-2 text-right">
                        {t('achievements.unlocked')} {new Date(progress.unlockedAt).toLocaleDateString('vi-VN')}
                    </p>
                 )}
            </div>
        </div>
    );
};

const Achievements: React.FC = () => {
    const { userAchievements } = useAchievements();
    const { t } = useI18n();
    
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-800">{t('achievements.title')}</h2>
                <p className="text-gray-600 mt-1">{t('achievements.description')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievementsList.map(ach => (
                    <AchievementCard 
                        key={ach.id} 
                        achievement={ach} 
                        progress={userAchievements[ach.id]} 
                    />
                ))}
            </div>
        </div>
    );
};

export default Achievements;