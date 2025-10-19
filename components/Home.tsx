import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { View, VocabularyWord } from '../types';
import { PenSquare, Layers, Dices, ArrowRight, Book, Star, Gamepad2, Sparkles, Flame, RotateCcw, Calendar, BrainCircuit } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useInspector } from '../hooks/useInspector';
import { useI18n } from '../hooks/useI18n';


const QuickReview: React.FC = () => {
    const { words, updateWordSrs } = useVocabulary();
    const { uiLanguage, recordActivity } = useSettings();
    const { t } = useI18n();

    const wordsToReview = useMemo(() => {
        return words
            .filter(word => word.nextReview <= Date.now())
            .sort((a, b) => a.srsLevel - b.srsLevel || a.nextReview - b.nextReview)
            .slice(0, 5); // Take top 5
    }, [words]);

    const [sessionWords, setSessionWords] = useState<VocabularyWord[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const justCompletedSession = useRef(false);

    useEffect(() => {
        if (!isSessionActive && wordsToReview.length > 0 && !justCompletedSession.current) {
            setSessionWords(wordsToReview);
            setCurrentIndex(0);
            setIsFlipped(false);
            setIsSessionActive(true);
        } else if (isSessionActive && sessionWords.length > 0 && wordsToReview.length === 0) {
            // End session if the list of reviewable words becomes empty while in a session
             setIsSessionActive(false);
        }
    }, [wordsToReview, isSessionActive, sessionWords.length]);


    if (!isSessionActive || sessionWords.length === 0) {
        return (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center h-full">
                <BrainCircuit className="w-8 h-8 text-emerald-400 mb-2" />
                <h3 className="font-bold text-white">{t('home.quick_review')}</h3>
                <p className="text-sm text-gray-400 mt-1">
                    {!isSessionActive && sessionWords.length > 0 ? t('home.quick_review_done') : t('home.quick_review_empty')}
                </p>
            </div>
        );
    }

    const currentWord = sessionWords[currentIndex];

    const handlePerformance = (performance: 'hard' | 'good' | 'easy') => {
        if (!isFlipped || !currentWord) return;
        
        updateWordSrs(currentWord.id, performance);
        
        if (currentIndex < sessionWords.length - 1) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
        } else {
            recordActivity();
            justCompletedSession.current = true;
            setIsSessionActive(false);
        }
    };

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex flex-col h-full">
            <h3 className="font-bold text-white mb-2 text-center">{t('home.quick_review')} ({currentIndex + 1}/{sessionWords.length})</h3>
            <div className="flex-grow flex flex-col justify-center">
                <div className="[perspective:1000px]" onClick={() => setIsFlipped(!isFlipped)}>
                    <div 
                        className="relative w-full h-32 rounded-lg transition-transform duration-500 cursor-pointer [will-change:transform]"
                        style={{
                            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                            transformStyle: 'preserve-3d',
                            WebkitTransformStyle: 'preserve-3d', // For Safari/iOS
                        }}
                    >
                        <div 
                            key={currentWord.id + '-front'} 
                            className="absolute w-full h-full flex items-center justify-center p-2 bg-slate-700 rounded-lg"
                            style={{
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden', // For Safari/iOS
                            }}
                        >
                            <p className="text-xl font-bold text-white text-center">{currentWord.word}</p>
                        </div>
                        <div 
                            key={currentWord.id + '-back'} 
                            className="absolute w-full h-full flex items-center justify-center p-2 bg-indigo-500 rounded-lg"
                            style={{
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden', // For Safari/iOS
                                transform: 'rotateY(180deg)',
                                WebkitTransform: 'rotateY(180deg)', // For Safari/iOS
                            }}
                        >
                            <p className="text-xl font-bold text-white text-center">{currentWord.translation[uiLanguage]}</p>
                        </div>
                    </div>
                </div>
            </div>
            {isFlipped ? (
                 <div className="grid grid-cols-3 gap-2 mt-3 animate-fade-in">
                    <button onClick={() => handlePerformance('hard')} className="py-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 text-sm font-semibold rounded-lg">{t('home.quick_review_hard')}</button>
                    <button onClick={() => handlePerformance('good')} className="py-2 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-sm font-semibold rounded-lg">{t('home.quick_review_good')}</button>
                    <button onClick={() => handlePerformance('easy')} className="py-2 bg-green-500/20 hover:bg-green-500/40 text-green-300 text-sm font-semibold rounded-lg">{t('home.quick_review_easy')}</button>
                 </div>
            ) : (
                <div className="text-center h-[40px] flex items-center justify-center mt-3">
                    <p className="text-xs text-gray-500">{t('home.quick_review_flip_prompt')}</p>
                </div>
            )}
        </div>
    );
}

const WordOfTheDay: React.FC = () => {
    const { words, isWordsLoading } = useVocabulary();
    const { stats, isSettingsLoading, setWordOfTheDay, uiLanguage } = useSettings();
    const { openInspector } = useInspector();
    const { t } = useI18n();
    const [word, setWord] = useState<VocabularyWord | null>(null);

    useEffect(() => {
        if (isWordsLoading || isSettingsLoading || words.length === 0) return;

        const today = new Date().toISOString().split('T')[0];
        
        if (stats.wordOfTheDay?.date === today) {
            const currentWord = words.find(w => w.id === stats.wordOfTheDay?.wordId);
            setWord(currentWord || null);
        } else {
            // Select a new word
            const wordsNeedingReview = words.filter(w => w.nextReview <= Date.now());
            const selectionPool = wordsNeedingReview.length > 0 ? wordsNeedingReview : words;
            const newWord = selectionPool[Math.floor(Math.random() * selectionPool.length)];
            setWord(newWord);
            setWordOfTheDay(newWord.id);
        }
    }, [words, isWordsLoading, stats.wordOfTheDay, isSettingsLoading, setWordOfTheDay]);

    if (!word) {
         return (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center h-full">
                <Calendar className="w-8 h-8 text-cyan-400 mb-2" />
                <h3 className="font-bold text-white">{t('home.word_of_the_day')}</h3>
                <p className="text-sm text-gray-400 mt-1">{t('home.add_words_prompt')}</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex flex-col h-full cursor-pointer" onClick={() => openInspector(word)}>
            <h3 className="font-bold text-white mb-2 text-center">{t('home.word_of_the_day')}</h3>
            <div className="flex-grow flex flex-col items-center justify-center text-center">
                 {word.imageUrl && <img src={word.imageUrl} alt={word.word} className="w-full h-24 object-contain rounded-md mb-3" />}
                <p className="text-2xl font-bold text-cyan-300">{word.word}</p>
                <p className="text-gray-400">{word.translation[uiLanguage]}</p>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">{t('home.click_for_details')}</p>
        </div>
    );
};


interface HomeProps {
  setCurrentView: (view: View) => void;
}

const Home: React.FC<HomeProps> = ({ setCurrentView }) => {
  const { words, isWordsLoading } = useVocabulary();
  const { stats, isSettingsLoading } = useSettings();
  const { t } = useI18n();

  const featureCards = [
    {
      view: View.Learn,
      icon: BrainCircuit,
      title: t('home.mode_learn_title'),
      description: t('home.mode_learn_desc'),
      color: 'from-blue-500 to-purple-500',
    },
    {
      view: View.Games,
      icon: Gamepad2,
      title: t('home.mode_games_title'),
      description: t('home.mode_games_desc'),
      color: 'from-rose-500 to-rose-400',
    },
    {
      view: View.AiTools,
      icon: Sparkles,
      title: t('home.mode_tools_title'),
      description: t('home.mode_tools_desc'),
      color: 'from-amber-500 to-amber-400',
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center p-6 bg-slate-800/30 rounded-2xl">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-300 text-transparent bg-clip-text">
          {t('home.welcome')}
        </h1>
        <p className="mt-2 text-lg text-gray-400 max-w-2xl mx-auto">
          {t('home.sub_welcome')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
        <div className="bg-slate-800/50 p-5 rounded-2xl flex items-center gap-4 border border-slate-700">
            <div className="p-3 bg-indigo-500/20 rounded-full">
                <Book className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
                {isWordsLoading ? (
                    <div className="h-7 w-16 bg-slate-700 rounded-md animate-pulse"></div>
                ) : (
                    <div className="text-3xl font-bold">{words.length}</div>
                )}
                <div className="text-sm text-gray-400">{t('home.saved_words')}</div>
            </div>
        </div>
        <div className="bg-slate-800/50 p-5 rounded-2xl flex items-center gap-4 border border-slate-700">
            <div className="p-3 bg-orange-500/20 rounded-full">
                <Flame className="w-7 h-7 text-orange-400" />
            </div>
            <div>
                {isSettingsLoading ? (
                    <div className="h-7 w-8 bg-slate-700 rounded-md animate-pulse"></div>
                ) : (
                    <div className="text-3xl font-bold">{stats.currentStreak}</div>
                )}
                <div className="text-sm text-gray-400">{t('home.current_streak')}</div>
            </div>
        </div>
        <div className="bg-slate-800/50 p-5 rounded-2xl flex items-center gap-4 border border-slate-700">
            <div className="p-3 bg-yellow-500/20 rounded-full">
                <Star className="w-7 h-7 text-yellow-400" />
            </div>
            <div>
                {isSettingsLoading ? (
                    <div className="h-7 w-8 bg-slate-700 rounded-md animate-pulse"></div>
                ) : (
                    <div className="text-3xl font-bold">{stats.longestStreak}</div>
                )}
                <div className="text-sm text-gray-400">{t('home.longest_streak')}</div>
            </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <WordOfTheDay />
        <QuickReview />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-4">{t('home.learning_modes')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureCards.map((card) => (
            <div
              key={card.view}
              onClick={() => setCurrentView(card.view)}
              className="group bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col hover:border-indigo-500/50 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 cursor-pointer"
            >
              <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${card.color}`}>
                      <card.icon className="w-7 h-7 text-white" />
                  </div>
                  <ArrowRight className="w-6 h-6 text-gray-600 group-hover:text-indigo-400 transition-colors" />
              </div>
              <div className="mt-4 flex-grow">
                <h3 className="text-xl font-bold text-white">{card.title}</h3>
                <p className="mt-1 text-gray-400 text-sm">{card.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;