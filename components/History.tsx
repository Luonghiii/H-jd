
import React from 'react';
import { useHistory } from '../hooks/useHistory';
import { History as HistoryIcon, Trash2, CheckCircle, Gamepad2, Feather, FileText, LogIn } from 'lucide-react';

const History: React.FC = () => {
  const { history, clearHistory } = useHistory();

  const getIcon = (type: string) => {
    switch(type) {
      case 'QUIZ_COMPLETED': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'MEMORY_MATCH_WON':
      case 'MEMORY_MATCH_LOST': return <Gamepad2 className="w-5 h-5 text-blue-500" />;
      case 'WORDS_ADDED': return <Feather className="w-5 h-5 text-purple-500" />;
      case 'STORY_GENERATED': return <FileText className="w-5 h-5 text-yellow-500" />;
      case 'LOGIN': return <LogIn className="w-5 h-5 text-cyan-500" />;
      default: return <HistoryIcon className="w-5 h-5 text-slate-500" />;
    }
  };
  
  const formatTimestamp = (timestamp: number) => {
      const date = new Date(timestamp);
      return date.toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Lịch sử hoạt động</h2>
          <p className="text-slate-500 dark:text-gray-400 mt-1">Xem lại các hoạt động học tập gần đây của bạn.</p>
        </div>
        {history.length > 0 && (
          <button onClick={clearHistory} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold rounded-xl transition-colors">
            <Trash2 className="w-4 h-4" />
            <span>Xóa lịch sử</span>
          </button>
        )}
      </div>
      
      <div className="max-h-[60vh] overflow-y-auto pr-2">
        {history.length > 0 ? (
          <ul className="space-y-3">
            {history.map(entry => (
              <li key={entry.id} className="flex items-start gap-4 p-3 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex-shrink-0 pt-1">{getIcon(entry.type)}</div>
                <div className="flex-grow">
                    <p className="font-medium text-slate-700 dark:text-gray-200">{entry.details}</p>
                    <p className="text-sm text-slate-500 dark:text-gray-400">{formatTimestamp(entry.timestamp)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <HistoryIcon className="w-12 h-12 mx-auto text-slate-400 dark:text-gray-600" />
            <h3 className="mt-4 text-lg font-semibold text-slate-800 dark:text-white">Không có hoạt động nào</h3>
            <p className="mt-1 text-slate-500 dark:text-gray-400">Lịch sử học tập của bạn sẽ xuất hiện ở đây.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
