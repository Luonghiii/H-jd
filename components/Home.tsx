import React, { useMemo } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { View } from '../types';
import { PenSquare, Layers, Dices, ArrowRight, Book, Star } from 'lucide-react';

interface HomeProps {
  setCurrentView: (view: View) => void;
}

const Home: React.FC<HomeProps> = ({ setCurrentView }) => {
  const { words } = useVocabulary();

  const bestStreak = useMemo(() => {
    try {
      return localStorage.getItem('luckyWheelBestStreak') || '0';
    } catch {
      return '0';
    }
  }, []);
  
  const featureCards = [
    {
      view: View.Practice,
      icon: PenSquare,
      title: 'Luyện tập Viết',
      description: 'Cải thiện kỹ năng viết và ghi nhớ từ bằng cách dịch qua lại.',
      color: 'from-blue-500 to-blue-400',
    },
    {
      view: View.Flashcards,
      icon: Layers,
      title: 'Thẻ ghi nhớ',
      description: 'Ôn tập từ vựng nhanh chóng với thẻ lật hai mặt cổ điển.',
      color: 'from-purple-500 to-purple-400',
    },
    {
      view: View.LuckyWheel,
      icon: Dices,
      title: 'Vòng Quay May Mắn',
      description: 'Kiểm tra kiến thức của bạn một cách vui nhộn và nhận điểm thưởng.',
      color: 'from-teal-500 to-teal-400',
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center p-6 bg-slate-800/30 rounded-2xl">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-300 text-transparent bg-clip-text">
          Chào mừng trở lại!
        </h1>
        <p className="mt-2 text-lg text-gray-400 max-w-2xl mx-auto">
          Sẵn sàng để chinh phục thêm nhiều từ vựng tiếng Đức hôm nay chưa?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white">
        <div className="bg-slate-800/50 p-5 rounded-2xl flex items-center gap-4 border border-slate-700">
            <div className="p-3 bg-indigo-500/20 rounded-full">
                <Book className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
                <div className="text-3xl font-bold">{words.length}</div>
                <div className="text-sm text-gray-400">Từ đã lưu</div>
            </div>
        </div>
        <div className="bg-slate-800/50 p-5 rounded-2xl flex items-center gap-4 border border-slate-700">
            <div className="p-3 bg-yellow-500/20 rounded-full">
                <Star className="w-7 h-7 text-yellow-400" />
            </div>
            <div>
                <div className="text-3xl font-bold">{bestStreak}</div>
                <div className="text-sm text-gray-400">Chuỗi thắng dài nhất</div>
            </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Bắt đầu học</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                <p className="mt-1 text-gray-400">{card.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;