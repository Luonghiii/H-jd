
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useVocabulary, themeTranslationMap } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { useHistory } from '../hooks/useHistory';
import { generateHintsForWord } from '../services/geminiService';
import { VocabularyWord } from '../types';
import { ArrowLeft, RefreshCw, Lightbulb } from 'lucide-react';
import { useInspector } from '../hooks/useInspector';

interface WordGuessProps {
  onBack: () => void;
}

type GameState = 'setup' | 'playing' | 'won' | 'lost';
type Hints = { hint1: string; hint2: string; hint3: string; hint4: string; };

const MAX_WRONG_GUESSES = 6;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const GERMAN_ALPHABET = 'abcdefghijklmnopqrstuvwxyzäöüß'.split('');

const WordGuess: React.FC<WordGuessProps> = ({ onBack }) => {
    const { words, getAvailableThemes } = useVocabulary();
    const { learningLanguage, targetLanguage } = useSettings();
    const { addHistoryEntry } = useHistory();
    const { openInspector } = useInspector();
    const [gameState, setGameState] = useState<GameState>('setup');
    
    const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set(['all']));
    const availableThemes = useMemo(() => getAvailableThemes(), [getAvailableThemes]);
    const wordsForGame = useMemo(() => {
        if (selectedThemes.has('all')) return words;
        return words.filter(w => w.theme && selectedThemes.has(w.theme));
    }, [words, selectedThemes]);
    
    const [wordToGuess, setWordToGuess] = useState<VocabularyWord | null>(null);
    const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
    const [hints, setHints] = useState<Hints | null>(null);
    const [hintLevel, setHintLevel] = useState(0);
    const [showHintButton, setShowHintButton] = useState(false);
    const [isLoadingHint, setIsLoadingHint] = useState(false);
    const hintTimerRef = useRef<number | null>(null);
    
    const wrongGuesses = Array.from(guessedLetters).filter(letter => !wordToGuess?.word.toLowerCase().includes(letter)).length;

    const getAlphabet = () => {
        switch (learningLanguage) {
            case 'german': return GERMAN_ALPHABET;
            case 'chinese': return []; // Pinyin is complex, manual input is better.
            default: return ALPHABET;
        }
    };

    const startNewGame = useCallback(async () => {
        if (wordsForGame.length === 0) return;
        const randomWord = wordsForGame[Math.floor(Math.random() * wordsForGame.length)];
        
        setGameState('playing');
        setWordToGuess(randomWord);
        setGuessedLetters(new Set());
        setHints(null);
        setHintLevel(0);
        setShowHintButton(false);
        if (hintTimerRef.current) clearTimeout(hintTimerRef.current);

        setIsLoadingHint(true);
        try {
            const generatedHints = await generateHintsForWord(randomWord, targetLanguage, learningLanguage);
            setHints(generatedHints);
            setHintLevel(1);
        } catch (error) {
            console.error("Failed to fetch hints:", error);
            // Fallback in case API fails
            setHints({ hint1: "Không thể tải gợi ý.", hint2: "", hint3: "", hint4: "" });
            setHintLevel(1);
        }
        setIsLoadingHint(false);

    }, [wordsForGame, targetLanguage, learningLanguage]);

    const handleGuess = (letter: string) => {
        if (gameState !== 'playing' || guessedLetters.has(letter)) return;
        setGuessedLetters(prev => new Set(prev).add(letter));
    };
    
    const handleShowHint = () => {
        setShowHintButton(false);
        setHintLevel(prev => Math.min(prev + 1, 4));
    };

    useEffect(() => {
        if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
        
        if (gameState === 'playing' && hintLevel > 0 && hintLevel < 4) {
            let delay = 0;
            if (hintLevel === 1) delay = 10000;
            else if (hintLevel === 2) delay = 20000;
            else if (hintLevel === 3) delay = 35000;
            
            if (delay > 0) {
                hintTimerRef.current = window.setTimeout(() => {
                    if (gameState === 'playing') { // Check again in case game ended
                        setShowHintButton(true);
                    }
                }, delay);
            }
        }
        return () => {
            if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
        };
    }, [gameState, hintLevel]);


    useEffect(() => {
        if (!wordToGuess || gameState !== 'playing') return;
        const wordLetters = new Set(wordToGuess.word.toLowerCase().replace(/[^a-zäöüß]/g, '').split(''));
        const guessedCorrectLetters = new Set(Array.from(guessedLetters).filter(l => wordLetters.has(l)));
        
        if (wordLetters.size > 0 && guessedCorrectLetters.size === wordLetters.size) {
            setGameState('won');
            addHistoryEntry('WORD_GUESS_WON', `Đoán đúng từ: "${wordToGuess.word}"`, {word: wordToGuess.word});
        } else if (wrongGuesses >= MAX_WRONG_GUESSES) {
            setGameState('lost');
            addHistoryEntry('WORD_GUESS_LOST', `Đoán sai từ: "${wordToGuess.word}"`, {word: wordToGuess.word});
        }
    }, [guessedLetters, wordToGuess, gameState, addHistoryEntry, wrongGuesses]);
    
    const handleThemeToggle = (theme: string) => {
        setSelectedThemes(prev => {
          const newSet = new Set(prev);
          if (theme === 'all') return new Set(['all']);
          newSet.delete('all');
          if (newSet.has(theme)) newSet.delete(theme);
          else newSet.add(theme);
          if (newSet.size === 0) return new Set(['all']);
          return newSet;
        });
    };

    if (gameState === 'setup') {
        const isStartDisabled = wordsForGame.length === 0;
        return (
            <div className="space-y-6 animate-fade-in text-center">
                 <div className="flex items-center justify-between">
                    <div className="text-center sm:text-left">
                        <h2 className="text-2xl font-bold text-white">Đoán chữ</h2>
                        <p className="text-gray-400 mt-1">Đoán từ được chọn ngẫu nhiên. Bạn có {MAX_WRONG_GUESSES} lượt đoán sai.</p>
                    </div>
                     <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 text-gray-200 font-semibold rounded-xl transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Quay lại</span>
                    </button>
                </div>
                 <div>
                    <h3 className="font-semibold text-white mb-2">Chọn chủ đề</h3>
                    <div className="flex flex-wrap justify-center gap-2 p-3 bg-slate-800/50 border border-slate-700 rounded-2xl">
                        <button onClick={() => handleThemeToggle('all')} className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedThemes.has('all') ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-700 hover:bg-slate-600'}`}>Tất cả ({words.length})</button>
                        {availableThemes.map(theme => <button key={theme} onClick={() => handleThemeToggle(theme)} className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedThemes.has(theme) ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-700 hover:bg-slate-600'}`}>{targetLanguage === 'english' ? (themeTranslationMap[theme] || theme) : theme} ({words.filter(w => w.theme === theme).length})</button>)}
                    </div>
                </div>
                <button onClick={startNewGame} disabled={isStartDisabled} className="w-full max-w-xs mx-auto flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed">
                    Bắt đầu
                </button>
                 {isStartDisabled && <p className="text-center text-sm text-amber-400">Bạn cần có ít nhất một từ trong chủ đề đã chọn để chơi.</p>}
            </div>
        );
    }
    
    const renderWordDisplay = () => (
        <div className="flex justify-center flex-wrap gap-2 sm:gap-4 tracking-widest text-3xl sm:text-4xl font-bold">
            {wordToGuess?.word.split('').map((char, i) => (
                <span key={i} className="w-10 h-14 sm:w-12 sm:h-16 flex items-center justify-center border-b-4 border-slate-600">
                    {guessedLetters.has(char.toLowerCase()) || !char.match(/[a-zA-ZäöüßÄÖÜẞ]/) ? char : ''}
                </span>
            ))}
        </div>
    );
    
    const keyboard = getAlphabet();

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">Đoán chữ</h2>
                <div className="text-red-400 font-semibold">Sai: {wrongGuesses} / {MAX_WRONG_GUESSES}</div>
            </div>

            {renderWordDisplay()}
            
            {(gameState === 'won' || gameState === 'lost') ? (
                <div className="text-center p-4 space-y-3 bg-slate-800/50 rounded-xl animate-fade-in">
                    <h3 className="text-xl font-bold text-white">{gameState === 'won' ? 'Bạn đã thắng!' : 'Bạn đã thua!'}</h3>
                    <p className="text-gray-300">
                        Từ cần đoán là: 
                        <strong 
                            className="text-cyan-300 cursor-pointer hover:underline ml-1"
                            onClick={() => wordToGuess && openInspector(wordToGuess)}
                        >
                            {wordToGuess?.word}
                        </strong>
                    </p>
                    <button onClick={startNewGame} className="flex items-center justify-center mx-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">
                        <RefreshCw className="w-5 h-5 mr-2" /> Chơi lại
                    </button>
                </div>
            ) : (
                <>
                {keyboard.length > 0 ? (
                    <div className="flex flex-wrap justify-center gap-2">
                        {keyboard.map(letter => {
                            const isGuessed = guessedLetters.has(letter);
                            const isCorrect = wordToGuess?.word.toLowerCase().includes(letter);
                            let classes = 'bg-slate-700 hover:bg-slate-600';
                            if (isGuessed) {
                                classes = isCorrect ? 'bg-green-600 text-white' : 'bg-slate-900 text-gray-500';
                            }
                            return (
                                <button key={letter} onClick={() => handleGuess(letter)} disabled={isGuessed} className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg font-bold text-lg uppercase transition-colors ${classes}`}>
                                    {letter}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-center text-gray-400 text-sm">Chế độ đoán chữ Pinyin cho Tiếng Trung đang được phát triển. <br/>Vui lòng sử dụng bàn phím của bạn để nhập.</p>
                )}

                <div className="pt-4 border-t border-slate-700 space-y-3">
                     <div className="p-3 bg-slate-800/50 rounded-lg space-y-2 min-h-[10rem]">
                        {isLoadingHint ? (
                            <div className="flex items-center justify-center h-full"><RefreshCw className="w-6 h-6 animate-spin text-indigo-400" /></div>
                        ) : hints ? (
                            <>
                                {hintLevel >= 1 && <p className="text-sm text-gray-300"><strong>Câu đố:</strong> {hints.hint1}</p>}
                                {hintLevel >= 2 && <p className="text-sm text-gray-300"><strong>Chủ đề:</strong> {hints.hint2}</p>}
                                {hintLevel >= 3 && <p className="text-sm text-gray-300"><strong>Câu ví dụ:</strong> {hints.hint3}</p>}
                                {hintLevel >= 4 && <p className="text-sm text-gray-300"><strong>Chữ cái đầu:</strong> {hints.hint4}</p>}
                            </>
                        ) : null}
                    </div>
                    {showHintButton && hintLevel < 4 && (
                        <div className="text-center">
                            <button onClick={handleShowHint} className="flex items-center justify-center mx-auto gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 rounded-lg animate-fade-in">
                                <Lightbulb className="w-4 h-4"/> Hiện gợi ý tiếp theo
                            </button>
                        </div>
                    )}
                </div>
                </>
            )}
        </div>
    );
};

export default WordGuess;
