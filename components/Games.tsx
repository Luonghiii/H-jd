import React, { useState } from 'react';
import Quiz from './Quiz';
import LuckyWheel from './LuckyWheel';
import MemoryMatch from './Minigames';
import WordLink from './WordLink';
import WordGuess from './WordGuess';
import SentenceScramble from './SentenceScramble';
import ListeningPractice from './ListeningPractice';
import VocabularyDuel from './VocabularyDuel';
import { FileQuestion, Dices, Gamepad2, ArrowRight, Link, Puzzle, Shuffle, Ear, Swords } from 'lucide-react';
import { useVocabulary } from '../hooks/useVocabulary';

type Game = 'menu' | 'quiz' | 'luckywheel' | 'memorymatch' | 'wordlink' | 'wordguess' | 'sentencescramble' | 'listening' | 'duel';

const gameOptions = [
    { id: 'quiz', component: Quiz, title: 'Đố vui Trắc nghiệm', description: 'Kiểm tra kiến thức từ vựng của bạn với các câu hỏi trắc nghiệm do AI tạo ra.', icon: FileQuestion, requiresWords: true },
    { id: 'luckywheel', component: LuckyWheel, title: 'Vòng quay Từ vựng', description: 'Thử vận may của bạn, quay vòng quay để nhận một từ và trả lời câu hỏi.', icon: Dices, requiresWords: true },
    { id: 'memorymatch', component: MemoryMatch, title: 'Lật thẻ Cặp đôi', description: 'Rèn luyện trí nhớ bằng cách tìm các cặp thẻ từ và nghĩa tương ứng.', icon: Gamepad2, requiresWords: true },
    { id: 'listening', component: ListeningPractice, title: 'Luyện Nghe', description: 'Nghe AI phát âm từ và gõ lại để kiểm tra kỹ năng nghe và chính tả.', icon: Ear, requiresWords: true },
    { id: 'wordlink', component: WordLink, title: 'Nối từ', description: 'Nối các từ với nghĩa đúng của chúng để kiểm tra khả năng liên kết.', icon: Link, requiresWords: true },
    { id: 'wordguess', component: WordGuess, title: 'Đoán chữ', description: 'Trò chơi treo cổ kinh điển với các gợi ý được tạo bởi AI để giúp bạn.', icon: Puzzle, requiresWords: true },
    { id: 'sentencescramble', component: SentenceScramble, title: 'Sắp xếp câu', description: 'Sắp xếp lại các từ bị xáo trộn để tạo thành một câu hoàn chỉnh.', icon: Shuffle, requiresWords: true },
    { id: 'duel', component: VocabularyDuel, title: 'Đấu Từ vựng', description: 'Thách đấu với AI trong các chế độ chơi đấu từ vựng thời gian thực.', icon: Swords, requiresWords: false },
];

const Games: React.FC = () => {
    const [activeGame, setActiveGame] = useState<Game>('menu');
    const { words } = useVocabulary();

    const handleBack = () => setActiveGame('menu');
    
    if (words.length === 0 && activeGame !== 'menu' && gameOptions.find(g => g.id === activeGame)?.requiresWords) {
        return (
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold text-slate-800">Trò chơi</h2>
            <p className="text-gray-600 mt-2">Bạn cần thêm từ vựng vào danh sách để chơi trò này.</p>
            <button onClick={handleBack} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">Quay lại</button>
          </div>
        );
    }

    if (activeGame !== 'menu') {
        const selectedGame = gameOptions.find(g => g.id === activeGame);
        if (selectedGame) {
            const GameComponent = selectedGame.component;
            return <GameComponent onBack={handleBack} />;
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-800">Trò chơi</h2>
                <p className="text-gray-600 mt-1">Chọn một trò chơi để bắt đầu luyện tập!</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gameOptions.map(game => (
                    <div
                        key={game.id}
                        onClick={() => setActiveGame(game.id as Game)}
                        className="group bg-white/50 border border-slate-200 rounded-2xl p-6 flex flex-col transition-all duration-300 cursor-pointer neu-button-light"
                    >
                        <div className="flex justify-between items-start">
                           <game.icon className="w-8 h-8 text-indigo-500" />
                           <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                        </div>
                        <div className="mt-4 flex-grow">
                            <h3 className="text-xl font-bold text-slate-800">{game.title}</h3>
                            <p className="mt-1 text-slate-600 text-sm">{game.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Games;