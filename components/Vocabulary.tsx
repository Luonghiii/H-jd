import React, { useState } from 'react';
import AddWord from './AddWord';
import WordList from './WordList';
import { BookOpen, Feather } from 'lucide-react';

type Tab = 'list' | 'add';

const Vocabulary: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('list');

    const renderTabs = () => (
        <div className="flex justify-center p-1 bg-slate-800/60 rounded-full mb-6">
            <button
                onClick={() => setActiveTab('list')}
                className={`flex items-center gap-2 px-4 py-1.5 text-sm rounded-full font-medium transition-colors ${activeTab === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-700'}`}
            >
                <BookOpen className="w-4 h-4" /> Danh sách từ
            </button>
            <button
                onClick={() => setActiveTab('add')}
                className={`flex items-center gap-2 px-4 py-1.5 text-sm rounded-full font-medium transition-colors ${activeTab === 'add' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-700'}`}
            >
                <Feather className="w-4 h-4" /> Thêm từ
            </button>
        </div>
    );

    return (
        <div className="animate-fade-in">
             <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white">{activeTab === 'list' ? 'Danh sách từ của bạn' : 'Thêm từ mới'}</h2>
                <p className="text-gray-400 mt-1">{activeTab === 'list' ? 'Quản lý từ điển cá nhân của bạn.' : 'Xây dựng từ điển cá nhân của bạn theo cách bạn muốn.'}</p>
            </div>
            {activeTab === 'list' ? <WordList /> : <AddWord />}
        </div>
    );
};

export default Vocabulary;