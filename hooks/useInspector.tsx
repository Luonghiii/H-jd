import React, { createContext, useContext, useState, ReactNode } from 'react';
import { VocabularyWord } from '../types';

interface InspectorContextType {
  inspectingWord: VocabularyWord | null;
  openInspector: (word: VocabularyWord) => void;
  closeInspector: () => void;
  updateInspectingWord: (word: VocabularyWord) => void;
}

const InspectorContext = createContext<InspectorContextType | undefined>(undefined);

export const InspectorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [inspectingWord, setInspectingWord] = useState<VocabularyWord | null>(null);

  const openInspector = (word: VocabularyWord) => {
    setInspectingWord(word);
  };

  const closeInspector = () => {
    setInspectingWord(null);
  };
  
  const updateInspectingWord = (word: VocabularyWord) => {
    setInspectingWord(word);
  };

  return (
    <InspectorContext.Provider value={{ inspectingWord, openInspector, closeInspector, updateInspectingWord }}>
      {children}
    </InspectorContext.Provider>
  );
};

export const useInspector = (): InspectorContextType => {
  const context = useContext(InspectorContext);
  if (context === undefined) {
    throw new Error('useInspector must be used within an InspectorProvider');
  }
  return context;
};
