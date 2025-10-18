import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TargetLanguage, LearningLanguage } from '../types';

export type BackgroundSetting = {
  type: 'image' | 'gradient';
  value: string;
} | null;

interface SettingsContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  targetLanguage: TargetLanguage;
  setTargetLanguage: (language: TargetLanguage) => void;
  learningLanguage: LearningLanguage;
  setLearningLanguage: (language: LearningLanguage) => void;
  backgroundSetting: BackgroundSetting;
  setBackgroundImage: (imageDataUrl: string) => void;
  setBackgroundGradient: (cssGradient: string) => void;
  clearBackgroundSetting: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [apiKey, setApiKeyState] = useState<string>(() => {
    try {
      return localStorage.getItem('geminiApiKey') || '';
    } catch {
      return '';
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

  const setApiKey = (key: string) => {
    try {
      localStorage.setItem('geminiApiKey', key);
      setApiKeyState(key);
    } catch (error) {
      console.error("Could not save API key to localStorage", error);
    }
  };

  const clearApiKey = () => {
    try {
      localStorage.removeItem('geminiApiKey');
      setApiKeyState('');
    } catch (error) {
      console.error("Could not clear API key from localStorage", error);
    }
  };
  
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

  return (
    <SettingsContext.Provider value={{ apiKey, setApiKey, clearApiKey, targetLanguage, setTargetLanguage, learningLanguage, setLearningLanguage, backgroundSetting, setBackgroundImage, setBackgroundGradient, clearBackgroundSetting }}>
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