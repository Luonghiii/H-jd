import React from 'react';
import { X, Star, Zap, MessageSquare, Loader2 } from 'lucide-react';
import { ConversationAnalysis } from '../types';

interface ConversationReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    analysis: ConversationAnalysis | null;
    isLoading: boolean;
}

const ConversationReportModal: React.FC<ConversationReportModalProps> = ({ isOpen, onClose, analysis, isLoading }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div 
                className="bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-fade-in-up" 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 sm:p-6 flex-shrink-0 border-b border-slate-600">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">Báo cáo Hội thoại</h2>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-700 rounded-full">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="p-4 sm:p-6 overflow-y-auto text-slate-300 space-y-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mb-4" />
                            <p className="text-lg">AI đang phân tích cuộc hội thoại của bạn...</p>
                        </div>
                    ) : analysis ? (
                        <>
                            {/* Score and Overall Feedback */}
                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                <div className="flex-shrink-0 text-center">
                                    <p className="text-sm text-gray-400">Độ trôi chảy</p>
                                    <p className="text-6xl font-bold text-cyan-400">{analysis.fluencyScore}<span className="text-2xl text-gray-500">/10</span></p>
                                </div>
                                <div className="flex-grow">
                                    <h3 className="flex items-center gap-2 font-semibold text-white mb-2"><Star className="w-5 h-5 text-yellow-400"/> Nhận xét chung</h3>
                                    <p className="text-sm bg-slate-700/50 p-3 rounded-lg">{analysis.overallFeedback}</p>
                                </div>
                            </div>
                            
                            {/* Areas for Improvement */}
                            {analysis.improvements && analysis.improvements.length > 0 && (
                                <div>
                                    <h3 className="flex items-center gap-2 font-semibold text-white mb-2"><Zap className="w-5 h-5 text-amber-400"/> Điểm cần cải thiện</h3>
                                    <div className="space-y-3">
                                        {analysis.improvements.map((item, index) => (
                                            <div key={index} className="p-3 border-l-4 border-amber-500 bg-slate-900/50 rounded-r-lg">
                                                <p className="text-sm"><span className="text-red-400 line-through">{item.original}</span></p>
                                                <p className="text-sm font-medium"><span className="text-green-400">Gợi ý: {item.suggestion}</span></p>
                                                <p className="text-xs text-gray-400 mt-1">{item.explanation}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center text-gray-400 py-10">
                            <p>Không thể tạo báo cáo cho phiên này.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConversationReportModal;