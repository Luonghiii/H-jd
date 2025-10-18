import React, { useState } from 'react';
import StoryGenerator from './StoryGenerator';
import SentenceGenerator from './SentenceGenerator';
import { Sparkles, MessageSquarePlus, ArrowRight } from 'lucide-react';
import { useVocabulary } from '../hooks/useVocabulary';

type AiTool = 'menu' | 'story' | 'sentence';

const toolOptions = [
    { id: 'story', component: StoryGenerator, title: 'Tạo Truyện AI', description: 'Chọn các từ vựng và để AI viết một câu chuyện ngắn thú vị.', icon: Sparkles },
    { id: 'sentence', component: SentenceGenerator, title: 'Tạo Câu AI', description: 'Chọn một từ và nhận ngay một câu ví dụ thực tế do AI tạo ra.', icon: MessageSquarePlus }
];

const AiTools: React.FC = () => {
    const [activeTool, setActiveTool] = useState<AiTool>('menu');
    const { words } = useVocabulary();

    const handleBack = () => setActiveTool('menu');

    if (words.length === 0) {
        return (
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold text-white">Công cụ AI</h2>
            <p className="text-gray-400 mt-2">Thêm vài từ vào danh sách để sử dụng các công cụ AI.</p>
          </div>
        );
    }

    if (activeTool !== 'menu') {
        const selectedTool = toolOptions.find(t => t.id === activeTool);
        if (selectedTool) {
            const ToolComponent = selectedTool.component;
            return <ToolComponent onBack={handleBack} />;
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Công cụ AI</h2>
                <p className="text-slate-500 dark:text-gray-400 mt-1">Khai thác sức mạnh của AI để việc học trở nên dễ dàng hơn.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {toolOptions.map(tool => (
                     <div
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id as AiTool)}
                        className="group bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col hover:border-indigo-500/50 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/20 transition-all duration-300 cursor-pointer"
                    >
                        <div className="flex justify-between items-start">
                           <tool.icon className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
                           <ArrowRight className="w-6 h-6 text-slate-400 dark:text-gray-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" />
                        </div>
                        <div className="mt-4 flex-grow">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{tool.title}</h3>
                            <p className="mt-1 text-slate-500 dark:text-gray-400 text-sm">{tool.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AiTools;