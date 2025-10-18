import React, { useState, useEffect, useCallback } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { useHistory } from '../hooks/useHistory';
import { generateHintsForWord } from '../services/geminiService';
import { VocabularyWord } from '../types';
import { ArrowLeft, RefreshCw, Lightbulb } from 'lucide-react';

interface WordGuessProps {
  onBack: () => void;
}

type GameState = 'setup' | 'playing' | 'won' | 'lost';
type Hints = { hint1: string; hint2: string; hint3: string; hint4: string; };

const MAX_WRONG_GUESSES = 6;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const GERMAN_ALPHABET = 'abcdefghijklmnopqrstuvwxyzäöüß'.split('');

const WordGuess: React.FC<WordGuessProps> = ({ onBack }) => {
    const { words } = useVocabulary();
    const { learningLanguage, targetLanguage } = useSettings();
    const { addHistoryEntry } = useHistory();
    const [gameState, setGameState] = useState<GameState>('setup');
    const [wordToGuess, setWordToGuess] = useState<VocabularyWord | null>(null);
    const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
    const [hints, setHints] = useState<Hints | null>(null);
    const [usedHints, setUsedHints] = useState(0);
    const [isLoadingHint, setIsLoadingHint] = useState(false);
    
    const wrongGuesses = Array.from(guessedLetters).filter(letter => !wordToGuess?.word.toLowerCase().includes(letter)).length;

    const getAlphabet = () => {
        switch (learningLanguage) {
            case 'german': return GERMAN_ALPHABET;
            case 'chinese': return []; // Pinyin is complex, manual input is better.
            default: return ALPHABET;
        }
    };

    const startNewGame = useCallback(() => {
        const randomWord = words[Math.floor(Math.random() * words.length)];
        setWordToGuess(randomWord);
        setGuessedLetters(new Set());
        setHints(null);
        setUsedHints(0);
        setIsLoadingHint(false);
        setGameState('playing');
    }, [words]);

    const handleGuess = (letter: string) => {
        if (gameState !== 'playing' || guessedLetters.has(letter)) return;
        setGuessedLetters(prev => new Set(prev).add(letter));
    };
    
    const getHint = async () => {
        if (!wordToGuess || isLoadingHint) return;
        setIsLoadingHint(true);
        if (!hints) {
            const generatedHints = await generateHintsForWord(wordToGuess, targetLanguage, learningLanguage);
            setHints(generatedHints);
        }
        setUsedHints(prev => Math.min(prev + 1, 4));
        setIsLoadingHint(false);
    };

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
    
    if (gameState === 'setup') {
        return (
            <div className="space-y-6 animate-fade-in text-center">
                 <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Đoán chữ</h2>
                     <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 text-gray-200 font-semibold rounded-xl transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Quay lại</span>
                    </button>
                </div>
                <p className="text-gray-400">Đoán từ được chọn ngẫu nhiên. Bạn có {MAX_WRONG_GUESSES} lượt đoán sai.</p>
                <button onClick={startNewGame} disabled={words.length === 0} className="w-full max-w-xs mx-auto flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed">
                    Bắt đầu
                </button>
                 {words.length === 0 && <p className="text-center text-sm text-amber-400">Bạn cần có ít nhất một từ để chơi.</p>}
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
                    <p className="text-gray-300">Từ cần đoán là: <strong className="text-cyan-300">{wordToGuess?.word}</strong></p>
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
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-white">Gợi ý</h3>
                        <button onClick={getHint} disabled={isLoadingHint || usedHints >= 4} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:bg-indigo-400">
                            {isLoadingHint ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4"/>} Gợi ý ({4 - usedHints} còn lại)
                        </button>
                    </div>
                    {usedHints > 0 && hints && (
                        <div className="p-3 bg-slate-800/50 rounded-lg space-y-2">
                            {usedHints >= 1 && <p className="text-sm text-gray-300"><strong>Chủ đề:</strong> {hints.hint1}</p>}
                            {usedHints >= 2 && <p className="text-sm text-gray-300"><strong>Mô tả:</strong> {hints.hint2}</p>}
                            {usedHints >= 3 && <p className="text-sm text-gray-300"><strong>Câu ví dụ:</strong> {hints.hint3}</p>}
                            {usedHints >= 4 && <p className="text-sm text-gray-300"><strong>Chữ cái đầu:</strong> {hints.hint4}</p>}
                        </div>
                    )}
                </div>
                </>
            )}
        </div>
    );
};

export default WordGuess;
