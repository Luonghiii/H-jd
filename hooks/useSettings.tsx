
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TargetLanguage, LearningLanguage } from '../types';

export type BackgroundSetting = {
  type: 'image' | 'gradient';
  value: string;
} | null;

interface SettingsContextType {
  apiKey: string | null;
  setApiKey: (key: string) => void;
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
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [apiKey, setApiKeyState] = useState<string | null>(() => {
    try {
      return localStorage.getItem('geminiApiKey');
    } catch {
      return null;
    }
  });

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
  
  useEffect(() => {
    try {
      if (apiKey) {
        localStorage.setItem('geminiApiKey', apiKey);
      } else {
        localStorage.removeItem('geminiApiKey');
      }
    } catch (error) {
      console.error("Could not save API key to localStorage", error);
    }
  }, [apiKey]);
  
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
      console.error("Could not save learning language to localStorage", error);
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

  const setApiKey = (key: string) => {
    setApiKeyState(key);
  };
  
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

  return (
    <SettingsContext.Provider value={{ apiKey, setApiKey, targetLanguage, setTargetLanguage, learningLanguage, setLearningLanguage, backgroundSetting, setBackgroundImage, setBackgroundGradient, clearBackgroundSetting, customGradients, addCustomGradient, removeCustomGradient }}>
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