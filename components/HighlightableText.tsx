import React from 'react';
import { useInspector } from '../hooks/useInspector';
import { VocabularyWord } from '../types';

interface HighlightableTextProps {
  text: string;
  words: VocabularyWord[];
}

const HighlightableText: React.FC<HighlightableTextProps> = ({ text, words }) => {
  const { openInspector } = useInspector();

  if (!words || words.length === 0 || !text) {
    return <>{text}</>;
  }

  // Create a map for quick lookup of any word form (German, Vietnamese, English)
  const wordMap = new Map<string, VocabularyWord>();
  const allTerms: string[] = [];
  words.forEach(word => {
    const terms = [word.word, word.translation.vietnamese, word.translation.english];
    terms.forEach(term => {
      if (term) {
        // Handle words with parentheses like "苹果 (píngguǒ)"
        const mainTerm = term.split(' ')[0];
        wordMap.set(term.toLowerCase(), word);
        wordMap.set(mainTerm.toLowerCase(), word);
        allTerms.push(term);
        if (mainTerm !== term) {
            allTerms.push(mainTerm);
        }
      }
    });
  });

  // Create a regex to find all vocabulary words
  // Escape special characters and ensure whole word matching
  const regex = new RegExp(`\\b(${allTerms.map(w => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})\\b`, 'gi');
  
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        const lowerPart = part.toLowerCase();
        if (wordMap.has(lowerPart)) {
          const word = wordMap.get(lowerPart)!;
          return (
            <span
              key={index}
              className="font-bold text-cyan-600 dark:text-cyan-300 cursor-pointer hover:underline"
              onClick={() => openInspector(word)}
            >
              {part}
            </span>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
};

export default HighlightableText;
