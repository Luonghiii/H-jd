import React, { createContext, useContext, ReactNode } from 'react';
import { useSettings } from './useSettings';
import { translations } from '../translations';

type Language = 'vi' | 'en';

interface I18nContextType {
  language: Language;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const getTranslation = (lang: Language, key: string): string => {
  const langTranslations = translations[lang] || translations['vi'];
  const keys = key.split('.');
  let result: any = langTranslations;
  for (const k of keys) {
    result = result?.[k];
    if (result === undefined) {
      // Fallback to Vietnamese if key not found in English
      if (lang === 'en') {
        let fallbackResult: any = translations['vi'];
        for (const fk of keys) {
          fallbackResult = fallbackResult?.[fk];
          if (fallbackResult === undefined) return key; // Return key if not found in fallback either
        }
        return fallbackResult;
      }
      return key; // Return key itself if not found
    }
  }
  return result;
};


export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { uiLanguage } = useSettings();
  const language = uiLanguage === 'vietnamese' ? 'vi' : 'en';

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    let translation = getTranslation(language, key);
    if (replacements) {
        Object.entries(replacements).forEach(([key, value]) => {
            translation = translation.replace(`{${key}}`, String(value));
        });
    }
    return translation;
  };

  return (
    <I18nContext.Provider value={{ language, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};