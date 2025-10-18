import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useVocabulary, themeTranslationMap } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { VocabularyWord } from '../types';
import { Timer, Check, X, RefreshCw, Trophy, Book, Hourglass, ArrowLeft, Gamepad2 } from 'lucide-react';

type CardData = {
  id: string;
  wordId: string;
  type: 'word' | 'translation';
  content: string;
};

const PAIR_COUNTS = [6, 8, 10, 12];
const TIME_LIMITS = [60, 90, 120, 0];

const MemoryMatch: React.FC = () => {
  const { words, getAvailableThemes } = useVocabulary();
  const { targetLanguage } = useSettings();

  const [gameState, setGameState] = useState<'setup' | 'playing' | 'won' | 'lost'>('setup');
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set(['all']));
  const [pairCount, setPairCount] = useState<number>(8);
  const [timeLimit, setTimeLimit] = useState<number>(90);

  const [cards, setCards] = useState<CardData[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedWordIds, setMatchedWordIds] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [isChecking, setIsChecking] = useState(false);

  const availableThemes = getAvailableThemes();
  
  const wordsForGame = useMemo(() => {
    if (selectedThemes.has('all')) return words;
    return words.filter(w => w.theme && selectedThemes.has(w.theme));
  }, [words, selectedThemes]);

  const startGame = useCallback(() => {
    const shuffled = [...wordsForGame].sort(() => 0.5 - Math.random());
    const selectedWords = shuffled.slice(0, pairCount);

    let gameCards: CardData[] = [];
    selectedWords.forEach(word => {
      gameCards.push({ id: `${word.id}-word`, wordId: word.id, type: 'word', content: word.word });
      gameCards.push({ id: `${word.id}-translation`, wordId: word.id, type: 'translation', content: word.translation[targetLanguage] });
    });

    setCards(gameCards.sort(() => 0.5 - Math.random()));
    setFlippedIndices([]);
    setMatchedWordIds([]);
    setMoves(0);
    setTimeLeft(timeLimit);
    setGameState('playing');
  }, [wordsForGame, pairCount, timeLimit, targetLanguage]);

  useEffect(() => {
    if (gameState !== 'playing' || timeLimit === 0) return;
    if (timeLeft <= 0) {
      setGameState('lost');
      return;
    }
    const timerId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [gameState, timeLeft, timeLimit]);
  
  useEffect(() => {
    if (flippedIndices.length !== 2) return;
    setIsChecking(true);
    setMoves(prev => prev + 1);
    const [firstIndex, secondIndex] = flippedIndices;
    const firstCard = cards[firstIndex];
    const secondCard = cards[secondIndex];
    if (firstCard.wordId === secondCard.wordId) {
      setTimeout(() => {
        setMatchedWordIds(prev => [...prev, firstCard.wordId]);
        setFlippedIndices([]);
        setIsChecking(false);
      }, 500);
    } else {
      setTimeout(() => {
        setFlippedIndices([]);
        setIsChecking(false);
      }, 1000);
    }
  }, [flippedIndices, cards]);
  
  useEffect(() => {
    if (cards.length > 0 && matchedWordIds.length === pairCount) {
      setGameState('won');
    }
  }, [matchedWordIds, pairCount, cards.length]);

  const handleCardClick = (index: number) => {
    if (isChecking || flippedIndices.length >= 2 || flippedIndices.includes(index) || matchedWordIds.includes(cards[index].wordId)) {
      return;
    }
    setFlippedIndices(prev => [...prev, index]);
  };

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

  const renderCard = (card: CardData, index: number) => {
    const isFlipped = flippedIndices.includes(index) || matchedWordIds.includes(card.wordId);
    const isMatched = matchedWordIds.includes(card.wordId);

    const frontCardClasses = isMatched 
        ? 'bg-gradient-to-br from-emerald-200 to-green-300 border-2 border-green-400' 
        : 'bg-gradient-to-br from-white to-gray-200';
    
    const frontTextClasses = isMatched
        ? 'text-green-900'
        : 'text-slate-800';

    return (
      <div key={card.id} className="[perspective:1000px] group" onClick={() => handleCardClick(index)}>
        <div className={`relative w-full h-full rounded-xl [transform-style:preserve-3d] transition-transform duration-500 ${isFlipped ? '[transform:rotateY(180deg)]' : ''} ${isMatched ? 'cursor-default' : 'cursor-pointer'}`} style={{aspectRatio: '3/4'}}>
          {/* Back of card */}
          <div className="absolute w-full h-full [backface-visibility:hidden] flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-400 rounded-xl shadow-lg transition-all group-hover:shadow-indigo-500/40 group-hover:scale-105">
            <Book className="w-1/2 h-1/2 text-indigo-500 opacity-80" />
          </div>
          {/* Front of card */}
          <div className={`absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center p-2 text-center rounded-xl shadow-lg transition-all duration-300 ${frontCardClasses}`}>
            <p className={`font-bold text-md sm:text-lg lg:text-xl break-words ${frontTextClasses}`}>{card.content}</p>
          </div>
        </div>
      </div>
    );
  };

  const gridClass = useMemo(() => {
    switch(pairCount) {
      case 6: return 'grid-cols-4';
      case 8: return 'grid-cols-4';
      case 10: return 'grid-cols-5';
      case 12: return 'grid-cols-6';
      default: return 'grid-cols-4';
    }
  }, [pairCount]);

  if (gameState === 'setup') {
    const isStartDisabled = wordsForGame.length < pairCount;
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Trò chơi Lật thẻ</h2>
          <p className="text-gray-400 mt-1">Tìm các cặp từ và nghĩa tương ứng. Cùng bắt đầu nào!</p>
        </div>
        <div>
          <h3 className="font-semibold text-white mb-2">1. Chọn chủ đề</h3>
          <div className="flex flex-wrap gap-2 p-3 bg-slate-800/50 border border-slate-700 rounded-2xl">
            <button onClick={() => handleThemeToggle('all')} className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedThemes.has('all') ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-700 hover:bg-slate-600'}`}>Tất cả ({words.length})</button>
            {availableThemes.map(theme => <button key={theme} onClick={() => handleThemeToggle(theme)} className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedThemes.has(theme) ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-700 hover:bg-slate-600'}`}>{targetLanguage === 'english' ? (themeTranslationMap[theme] || theme) : theme} ({words.filter(w => w.theme === theme).length})</button>)}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-white mb-2">2. Chọn số cặp</h3>
          <div className="flex justify-center gap-2">{PAIR_COUNTS.map(n => <button key={n} onClick={() => setPairCount(n)} className={`px-4 py-2 text-sm rounded-xl transition-colors ${pairCount === n ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>{n} cặp</button>)}</div>
        </div>
        <div>
          <h3 className="font-semibold text-white mb-2">3. Chọn giới hạn thời gian</h3>
          <div className="flex justify-center gap-2">{TIME_LIMITS.map(t => <button key={t} onClick={() => setTimeLimit(t)} className={`px-4 py-2 text-sm rounded-xl transition-colors ${timeLimit === t ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>{t === 0 ? '∞' : `${t}s`}</button>)}</div>
        </div>
        <button onClick={startGame} disabled={isStartDisabled} className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-transform duration-200 active:scale-[0.98] disabled:bg-indigo-400 disabled:cursor-not-allowed">Bắt đầu chơi</button>
        {isStartDisabled && <p className="text-center text-sm text-amber-400">Không đủ từ trong chủ đề đã chọn. Cần ít nhất {pairCount} từ.</p>}
      </div>
    );
  }

  if (gameState === 'playing') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-4 text-white">
          <button onClick={() => setGameState('setup')} className="flex items-center gap-2 text-sm text-indigo-400 hover:underline"><ArrowLeft className="w-4 h-4" /> Bỏ cuộc</button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-400" /> <span className="font-bold text-lg">{moves}</span></div>
            {timeLimit > 0 && <div className="flex items-center gap-2"><Timer className="w-5 h-5 text-cyan-400" /> <span className="font-bold text-lg">{timeLeft}s</span></div>}
          </div>
        </div>
        <div className={`grid ${gridClass} gap-2 sm:gap-3`}>{cards.map((card, i) => renderCard(card, i))}</div>
      </div>
    );
  }

  const ResultScreen: React.FC<{ status: 'won' | 'lost' }> = ({ status }) => (
    <div className="text-center py-10 space-y-4 flex flex-col items-center">
      {status === 'won' ? <Check className="w-16 h-16 text-green-400 bg-green-500/10 rounded-full p-2" /> : <X className="w-16 h-16 text-red-400 bg-red-500/10 rounded-full p-2" />}
      <h2 className="text-3xl font-bold text-white">{status === 'won' ? 'Bạn đã thắng!' : 'Hết giờ rồi!'}</h2>
      <p className="text-gray-400">{status === 'won' ? `Bạn đã tìm thấy tất cả ${pairCount} cặp trong ${moves} lần lật.` : 'Đừng nản lòng, hãy thử lại nhé!'}</p>
      <div className="flex gap-4">
        <button onClick={() => setGameState('setup')} className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl">Chơi ván mới</button>
        <button onClick={startGame} className="flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"><RefreshCw className="w-5 h-5 mr-2" />Chơi lại</button>
      </div>
    </div>
  );

  return <ResultScreen status={gameState} />;
};


const Minigames: React.FC = () => {
    // This component can be expanded into a hub to select different minigames in the future.
    // For now, it directly renders the Memory Match game.
    return <MemoryMatch />;
};

export default Minigames;
