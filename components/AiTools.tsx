import React, { useState } from 'react';
import StoryGenerator from './StoryGenerator';
import SentenceGenerator from './SentenceGenerator';
import GrammarChecker from './GrammarChecker';
import AiTutor from './AiTutor';
import InteractiveImage from './InteractiveImage';
import AiLessonGenerator from './AiLessonGenerator';
import { Sparkles, BookText, FileText, CheckSquare, ArrowRight, MessageCircle, ImageIcon, Library } from 'lucide-react';
import { useVocabulary } from '../hooks/useVocabulary';

type AiTool = 'menu' | 'story' | 'sentence' | 'grammar' | 'tutor' | 'imageExplorer' | 'lesson';

const toolOptions = [
    { id: 'tutor', component: AiTutor, title: 'Gia sư Đối thoại AI', description: 'Trò chuyện trực tiếp với AI bằng giọng nói để luyện kỹ năng giao tiếp.', icon: MessageCircle },
    { id: 'lesson', component: AiLessonGenerator, title: 'Bài học AI', description: 'Nhập một chủ đề và nhận ngay một bài học đầy đủ do AI tạo ra.', icon: Library },
    { id: 'imageExplorer', component: InteractiveImage, title: 'Khám phá qua Ảnh', description: 'Tải lên một bức ảnh và nhấp vào các vật thể để học từ vựng.', icon: ImageIcon },
    { id: 'story', component: StoryGenerator, title: 'Tạo truyện', description: 'Chọn từ vựng và để AI viết một câu chuyện ngắn độc đáo.', icon: BookText },
    { id: 'sentence', component: SentenceGenerator, title: 'Tạo câu ví dụ', description: 'Chọn một từ và xem cách nó được sử dụng trong một câu hoàn chỉnh.', icon: FileText },
    { id: 'grammar', component: GrammarChecker, title: 'Kiểm tra ngữ pháp', description: 'Viết một câu hoặc đoạn văn và để AI kiểm tra, sửa lỗi ngữ pháp.', icon: CheckSquare },
];

const AiTools: React.FC = () => {
    const [activeTool, setActiveTool] = useState<AiTool>('menu');
    const { words } = useVocabulary();

    const handleBack = () => setActiveTool('menu');

    const toolsRequiringWords: AiTool[] = ['story', 'sentence'];

    if (words.length === 0 && toolsRequiringWords.includes(activeTool)) {
        return (
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold text-slate-800">Công cụ AI</h2>
            <p className="text-gray-600 mt-2">Công cụ này yêu cầu bạn có ít nhất một từ trong danh sách. Hãy thêm từ trước nhé.</p>
            <button onClick={handleBack} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">Quay lại</button>
          </div>
        );
    }

    if (activeTool !== 'menu') {
        const selectedTool = toolOptions.find(t => t.id === activeTool);
        if (selectedTool) {
            const ToolComponent = selectedTool.component;
            // @ts-ignore
            return <ToolComponent onBack={handleBack} />;
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center">
                <div className="inline-block p-3 bg-amber-500/10 rounded-full mb-3">
                    <Sparkles className="w-8 h-8 text-amber-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Công cụ AI</h2>
                <p className="text-gray-600 mt-1">Khai phá sức mạnh của AI để học ngôn ngữ hiệu quả hơn.</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {toolOptions.map(tool => (
                    <div
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id as AiTool)}
                        className="group bg-white/50 border border-slate-200 rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 cursor-pointer neu-button-light"
                    >
                       <tool.icon className="w-8 h-8 text-indigo-500 flex-shrink-0" />
                       <div className="flex-grow">
                            <h3 className="text-lg font-bold text-slate-800">{tool.title}</h3>
                            <p className="mt-1 text-slate-600 text-sm">{tool.description}</p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AiTools;