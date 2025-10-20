import React, { createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { useSettings } from './useSettings';
import { AchievementProgress, UserStats } from '../types';
import { achievementsList } from '../data/achievements';
import { updateUserData } from '../services/firestoreService';
import eventBus from '../utils/eventBus';

interface AchievementsContextType {
    userAchievements: { [key: string]: AchievementProgress };
}

const AchievementsContext = createContext<AchievementsContextType | undefined>(undefined);

export const AchievementsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    // Consume stats AND achievements from the single source of truth: useSettings
    const { stats, achievements: userAchievements, isSettingsLoading } = useSettings();
    const processingRef = useRef(false);
    // This ref helps prevent firing notifications for existing achievements on initial load.
    const hasCheckedOnceRef = useRef(false);


    // Effect to check for new achievements when stats or achievements data changes
    useEffect(() => {
        // Guard against running on initial mount before all data is stable
        if (isSettingsLoading) {
            hasCheckedOnceRef.current = false; // Reset check on re-loads
            return;
        }

        const checkAchievements = async () => {
            if (!currentUser || processingRef.current) return;
            processingRef.current = true;
            
            const updates: { [key: string]: any } = {};

            for (const achievement of achievementsList) {
                const progressSource = achievement.source.split('.');
                let currentProgress = 0;

                // Safely access nested stats properties
                if (progressSource[0] === 'stats') {
                    if (progressSource[1] === 'achievementCounters') {
                        currentProgress = stats.achievementCounters?.[progressSource[2] as keyof typeof stats.achievementCounters] || 0;
                    } else {
                        const statKey = progressSource[1] as keyof UserStats;
                        const statValue = stats[statKey];
                        if (typeof statValue === 'number') {
                            currentProgress = statValue;
                        }
                    }
                }
                
                const userAchievement = userAchievements[achievement.id] || { level: 0, progress: 0 };

                let newLevel = userAchievement.level;
                // Check if the user has advanced to a new level
                while (newLevel < achievement.levels.length && currentProgress >= achievement.levels[newLevel]) {
                    newLevel++;
                }

                if (newLevel > userAchievement.level) {
                    // This is a genuine new level up
                    updates[`achievements.${achievement.id}`] = {
                        level: newLevel,
                        progress: currentProgress,
                        unlockedAt: Date.now()
                    };
                    // Only dispatch notification if this isn't the initial check, to avoid spam on login.
                    if (hasCheckedOnceRef.current) {
                        eventBus.dispatch('notification', {
                            type: 'success',
                            message: `Thành tựu mới: ${achievement.name} Cấp ${newLevel}!`
                        });
                    }
                } else if (currentProgress !== userAchievement.progress) {
                    // If no level up, just update the progress count silently
                    updates[`achievements.${achievement.id}.progress`] = currentProgress;
                }
            }
            
            if (Object.keys(updates).length > 0) {
                await updateUserData(currentUser.uid, updates);
            }

            // Mark that the initial check has completed successfully
            if (!hasCheckedOnceRef.current) {
                hasCheckedOnceRef.current = true;
            }
            processingRef.current = false;
        };
        
        // Debounce to prevent rapid firing on multiple state updates
        const timer = setTimeout(checkAchievements, 500);

        return () => clearTimeout(timer);

    }, [stats, userAchievements, currentUser, isSettingsLoading]); // Depend on synchronized data

    return (
        <AchievementsContext.Provider value={{ userAchievements }}>
            {children}
        </AchievementsContext.Provider>
    );
};

export const useAchievements = (): AchievementsContextType => {
    const context = useContext(AchievementsContext);
    if (!context) {
        throw new Error('useAchievements must be used within an AchievementsProvider');
    }
    return context;
};