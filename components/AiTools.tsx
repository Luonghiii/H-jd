import React, { useState } from 'react';
import StoryGenerator from './StoryGenerator';
import SentenceGenerator from './SentenceGenerator';
import GrammarChecker from './GrammarChecker';
import { Sparkles, BookText, FileText, CheckSquare, ArrowRight } from 'lucide-react';
import { useVocabulary } from '../hooks/useVocabulary';

type AiTool = 'menu' | 'story' | 'sentence' | 'grammar';

const toolOptions = [
    { id: 'story', component: StoryGenerator, title: 'Tạo truyện', description: 'Chọn từ vựng và để AI viết một câu chuyện ngắn độc đáo.', icon: BookText },
    { id: 'sentence', component: SentenceGenerator, title: 'Tạo câu ví dụ', description: 'Chọn một từ và xem cách nó được sử dụng trong một câu hoàn chỉnh.', icon: FileText },
    { id: 'grammar', component: GrammarChecker, title: 'Kiểm tra ngữ pháp', description: 'Viết một câu hoặc đoạn văn và để AI kiểm tra, sửa lỗi ngữ pháp.', icon: CheckSquare },
];

const AiTools: React.FC = () => {
    const [activeTool, setActiveTool] = useState<AiTool>('menu');
    const { words } = useVocabulary();

    const handleBack = () => setActiveTool('menu');

    if (words.length === 0 && (activeTool === 'story' || activeTool === 'sentence')) {
        return (
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold text-white">Công cụ AI</h2>
            <p className="text-gray-400 mt-2">Công cụ này yêu cầu bạn có ít nhất một từ trong danh sách. Hãy thêm từ trước nhé.</p>
            <button onClick={handleBack} className="mt-4 px-4 py-2 bg-indigo-600 rounded-lg">Quay lại</button>
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
                <div className="inline-block p-3 bg-amber-500/10 rounded-full mb-3">
                    <Sparkles className="w-8 h-8 text-amber-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Công cụ AI</h2>
                <p className="text-gray-400 mt-1">Khai phá sức mạnh của AI để học ngôn ngữ hiệu quả hơn.</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {toolOptions.map(tool => (
                    <div
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id as AiTool)}
                        className="group bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex items-center gap-4 hover:border-indigo-500/50 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/20 transition-all duration-300 cursor-pointer"
                    >
                       <tool.icon className="w-8 h-8 text-indigo-400 flex-shrink-0" />
                       <div className="flex-grow">
                            <h3 className="text-xl font-bold text-white">{tool.title}</h3>
                            <p className="mt-1 text-gray-400 text-sm">{tool.description}</p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-gray-600 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AiTools;
