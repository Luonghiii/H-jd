import React, { useState } from 'react';
import Quiz from './Quiz';
import LuckyWheel from './LuckyWheel';
import Minigames from './Minigames';
import { FileQuestion, Dices, Gamepad2, ArrowRight } from 'lucide-react';
import { useVocabulary } from '../hooks/useVocabulary';

type Game = 'menu' | 'quiz' | 'luckywheel' | 'memorymatch';

const gameOptions = [
    { id: 'quiz', component: Quiz, title: 'Đố vui Trắc nghiệm', description: 'Kiểm tra kiến thức từ vựng của bạn với các câu hỏi trắc nghiệm do AI tạo ra.', icon: FileQuestion },
    { id: 'luckywheel', component: LuckyWheel, title: 'Vòng quay Từ vựng', description: 'Thử vận may của bạn, quay vòng quay để nhận một từ và trả lời câu hỏi.', icon: Dices },
    { id: 'memorymatch', component: Minigames, title: 'Lật thẻ Cặp đôi', description: 'Rèn luyện trí nhớ bằng cách tìm các cặp thẻ từ và nghĩa tương ứng.', icon: Gamepad2 }
];

const Games: React.FC = () => {
    const [activeGame, setActiveGame] = useState<Game>('menu');
    const { words } = useVocabulary();

    const handleBack = () => setActiveGame('menu');
    
    if (words.length === 0) {
        return (
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold text-white">Trò chơi</h2>
            <p className="text-gray-400 mt-2">Thêm vài từ vào danh sách của bạn để bắt đầu chơi.</p>
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
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Trò chơi</h2>
                <p className="text-slate-500 dark:text-gray-400 mt-1">Chọn một trò chơi để bắt đầu luyện tập!</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gameOptions.map(game => (
                    <div
                        key={game.id}
                        onClick={() => setActiveGame(game.id as Game)}
                        className="group bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col hover:border-indigo-500/50 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/20 transition-all duration-300 cursor-pointer"
                    >
                        <div className="flex justify-between items-start">
                           <game.icon className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
                           <ArrowRight className="w-6 h-6 text-slate-400 dark:text-gray-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" />
                        </div>
                        <div className="mt-4 flex-grow">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{game.title}</h3>
                            <p className="mt-1 text-slate-500 dark:text-gray-400 text-sm">{game.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Games;