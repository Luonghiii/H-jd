import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TargetLanguage, LearningLanguage } from '../types';

export type BackgroundSetting = {
  type: 'image' | 'gradient';
  value: string;
} | null;

const MAX_API_KEYS = 10;

interface SettingsContextType {
  targetLanguage: TargetLanguage;
  setTargetLanguage: (language: TargetLanguage) => void;
  learningLanguage: LearningLanguage;
  setLearningLanguage: (language: LearningLanguage) => void;
  backgroundSetting: BackgroundSetting;
  setBackgroundImage: (imageDataUrl: string) => void;
  setBackgroundGradient: (cssGradient: string) => void;
  clearBackgroundSetting: () => void;
  customGradients: string[];
  addCustomGradient: (gradient: string) => void;
  removeCustomGradient: (gradient: string) => void;
  userApiKeys: string[];
  addUserApiKey: (key: string) => boolean;
  removeUserApiKey: (keyToRemove: string) => void;
  hasApiKey: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>(() => {
    try {
      const savedLanguage = localStorage.getItem('targetLanguage');
      return (savedLanguage === 'english' || savedLanguage === 'vietnamese') ? savedLanguage : 'vietnamese';
    } catch (error) {
      console.error("Could not load language from localStorage", error);
      return 'vietnamese';
    }
  });

  const [learningLanguage, setLearningLanguageState] = useState<LearningLanguage>(() => {
    try {
      const savedLanguage = localStorage.getItem('learningLanguage');
      return (savedLanguage === 'german' || savedLanguage === 'english' || savedLanguage === 'chinese') ? savedLanguage : 'german';
    } catch (error) {
      console.error("Could not load learning language from localStorage", error);
      return 'german';
    }
  });

  const [backgroundSetting, setBackgroundSettingState] = useState<BackgroundSetting>(() => {
    try {
      const savedBg = localStorage.getItem('backgroundSetting');
      return savedBg ? JSON.parse(savedBg) : null;
    } catch (error) {
      console.error("Could not load background setting from localStorage", error);
      return null;
    }
  });
  
  const [customGradients, setCustomGradients] = useState<string[]>(() => {
    try {
        const savedGradients = localStorage.getItem('customGradients');
        return savedGradients ? JSON.parse(savedGradients) : [];
    } catch {
        return [];
    }
  });

  const [userApiKeys, setUserApiKeysState] = useState<string[]>(() => {
      try {
        const savedKeys = localStorage.getItem('userApiKeys');
        if (savedKeys) {
            return JSON.parse(savedKeys);
        }
        // Migration from old single key system
        const oldKey = localStorage.getItem('userApiKey');
        if (oldKey) {
            const newKeys = [oldKey.replace(/"/g, '')];
            localStorage.setItem('userApiKeys', JSON.stringify(newKeys));
            localStorage.removeItem('userApiKey'); // Clean up old key
            return newKeys;
        }
        return [];
    } catch {
        return [];
    }
  });

  const hasApiKey = !!process.env.API_KEY || userApiKeys.length > 0;
  
  useEffect(() => {
    try {
      localStorage.setItem('targetLanguage', targetLanguage);
    } catch (error) {
      console.error("Could not save language to localStorage", error);
    }
  }, [targetLanguage]);

  useEffect(() => {
    try {
      localStorage.setItem('learningLanguage', learningLanguage);
    } catch (error) {
      console.error("Could not save learning language from localStorage", error);
    }
  }, [learningLanguage]);

  useEffect(() => {
    try {
      if (backgroundSetting) {
        localStorage.setItem('backgroundSetting', JSON.stringify(backgroundSetting));
      } else {
        localStorage.removeItem('backgroundSetting');
      }
    } catch (error) {
      console.error("Could not save background setting to localStorage", error);
    }
  }, [backgroundSetting]);
  
  useEffect(() => {
    try {
        localStorage.setItem('customGradients', JSON.stringify(customGradients));
    } catch (error) {
        console.error("Could not save custom gradients to localStorage", error);
    }
  }, [customGradients]);
  
   useEffect(() => {
    try {
        localStorage.setItem('userApiKeys', JSON.stringify(userApiKeys));
    } catch (error) {
        console.error("Could not save API keys to localStorage", error);
    }
  }, [userApiKeys]);

  const setLearningLanguage = (language: LearningLanguage) => {
    setLearningLanguageState(language);
  };

  const setBackgroundImage = (imageDataUrl: string) => {
    setBackgroundSettingState({ type: 'image', value: imageDataUrl });
  };
  
  const setBackgroundGradient = (cssGradient: string) => {
    setBackgroundSettingState({ type: 'gradient', value: cssGradient });
  };

  const clearBackgroundSetting = () => {
    setBackgroundSettingState(null);
  };
  
  const addCustomGradient = (gradient: string) => {
    setCustomGradients(prev => [gradient, ...prev]);
  };
  
  const removeCustomGradient = (gradient: string) => {
    setCustomGradients(prev => prev.filter(g => g !== gradient));
  };

  const addUserApiKey = (key: string): boolean => {
      const trimmedKey = key.trim();
      if (userApiKeys.length >= MAX_API_KEYS || userApiKeys.includes(trimmedKey)) {
          return false;
      }
      setUserApiKeysState(prev => [...prev, trimmedKey]);
      return true;
  };

  const removeUserApiKey = (keyToRemove: string) => {
      setUserApiKeysState(prev => prev.filter(k => k !== keyToRemove));
  };

  return (
    <SettingsContext.Provider value={{ targetLanguage, setTargetLanguage, learningLanguage, setLearningLanguage, backgroundSetting, setBackgroundImage, setBackgroundGradient, clearBackgroundSetting, customGradients, addCustomGradient, removeCustomGradient, userApiKeys, addUserApiKey, removeUserApiKey, hasApiKey }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};