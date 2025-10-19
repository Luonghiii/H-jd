import React, { useMemo } from 'react';
import { useInspector, useQuickTranslate } from '../hooks/useInspector';
import { VocabularyWord } from '../types';

interface HighlightableTextProps {
  text: string;
  words: VocabularyWord[];
}

const HighlightableText: React.FC<HighlightableTextProps> = ({ text, words }) => {
  const { openInspector } = useInspector();
  const { openQuickTranslate } = useQuickTranslate();

  const wordMap = useMemo(() => {
    const map = new Map<string, VocabularyWord>();
    if (words) {
      words.forEach(word => {
        map.set(word.word.toLowerCase(), word);
      });
    }
    return map;
  }, [words]);

  if (!text) {
    return null;
  }
  
  const parts = text.split(/([,.\s!?()"“„”]+)/g);

  return (
    <>
      {parts.map((part, index) => {
        const cleanedPart = part.trim();
        if (!cleanedPart) {
          // This is a delimiter or space
          return <React.Fragment key={index}>{part}</React.Fragment>;
        }

        const lowerPart = cleanedPart.toLowerCase();
        
        if (wordMap.has(lowerPart)) {
          const word = wordMap.get(lowerPart)!;
          return (
            <React.Fragment key={index}>
              <span
                className="font-bold text-cyan-600 dark:text-cyan-400 cursor-pointer hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  openInspector(word);
                }}
              >
                {part}
              </span>
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={index}>
            <span
              className="cursor-pointer hover:bg-slate-200/80 dark:hover:bg-slate-700/50 rounded"
              onClick={(e) => {
                e.stopPropagation();
                openQuickTranslate(cleanedPart, e);
              }}
            >
              {part}
            </span>
          </React.Fragment>
        );
      })}
    </>
  );
};

export default HighlightableText;
