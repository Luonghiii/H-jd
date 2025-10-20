import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Loader2, Waves, ChevronDown, History, Play, StopCircle, Mic, MicOff, RotateCcw, Trash2, Palette } from 'lucide-react';
import { useAiAssistant } from '../hooks/useAiAssistant';
import { View, AiAssistantSession } from '../types';
import { useSettings } from '../hooks/useSettings';
import { resizeBackgroundImageAsDataUrl } from '../services/storageService';
import eventBus from '../utils/eventBus';

interface AiAssistantProps {
    setCurrentView: (view: View) => void;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ setCurrentView }) => {
    const {
        isOpen,
        toggle,
        history, // This is the CURRENT conversation
        sessions, // This is the list of PAST conversations
        clearAssistantHistory,
        sendMessage,
        isLoading,
        newInsight,
        markInsightAsRead,
        position,
        setPosition,
        isDragging,
        setIsDragging,
        voiceConnectionState,
        startVoiceSession,
        stopVoiceSession,
        liveInput,
        liveOutput,
        isMuted,
        toggleMute,
        voiceError,
        startNewChat
    } = useAiAssistant();
    const { aiAssistantBackground, setAiAssistantBackground } = useSettings();

    const [userInput, setUserInput] = useState('');
    const [viewingSession, setViewingSession] = useState<AiAssistantSession | null>(null);
    const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
    const chatBodyRef = useRef<HTMLDivElement>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const dragStartDetails = useRef({ x: 0, y: 0, moved: false });
    const bgInputRef = useRef<HTMLInputElement>(null);
    const [isBgLoading, setIsBgLoading] = useState(false);
    
    const displayedHistory = viewingSession ? viewingSession.messages : history;
    const isViewingHistory = !!viewingSession;


    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [displayedHistory, liveInput, liveOutput]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (userInput.trim() && !isLoading && !isViewingHistory) {
            sendMessage(userInput.trim(), { setCurrentView });
            setUserInput('');
        }
    };
    
    const handleMouseMove = useCallback((e: MouseEvent) => {
        dragStartDetails.current.moved = true; 
        const x = e.clientX - dragStartDetails.current.x;
        const y = e.clientY - dragStartDetails.current.y;
        setPosition({ x, y });
    }, [setPosition]);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        dragStartDetails.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
            moved: false
        };
        setIsDragging(true);

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            setIsDragging(false);
            if (!dragStartDetails.current.moved) {
                toggle();
                if (newInsight) {
                    markInsightAsRead();
                }
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleNewChatClick = () => {
        startNewChat();
        setViewingSession(null);
    };

    const handleBgChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsBgLoading(true);
            try {
                const dataUrl = await resizeBackgroundImageAsDataUrl(file);
                await setAiAssistantBackground(dataUrl);
                eventBus.dispatch('notification', { type: 'success', message: 'Đã cập nhật ảnh nền trợ lý!' });
            } catch (e: any) {
                console.error("Could not process file for AI assistant BG.", e);
                eventBus.dispatch('notification', { type: 'error', message: e.message || "Không thể xử lý tệp ảnh." });
            } finally {
                setIsBgLoading(false);
                if (event.target) {
                    event.target.value = '';
                }
            }
        }
    };

    return (
        <>
            {/* The Floating Bubble */}
            <div
                ref={bubbleRef}
                className={`fixed z-50 w-16 h-16 rounded-full shadow-lg transition-all duration-300 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${isOpen ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'}`}
                style={{ top: position.y, left: position.x }}
                onMouseDown={handleMouseDown}
            >
                <div className="relative w-full h-full">
                    <div
                        className="w-full h-full bg-white/20 backdrop-blur-xl dark:bg-black/20 border border-white/30 dark:border-white/20 text-slate-800 dark:text-white/90 rounded-full flex items-center justify-center"
                        aria-label="Open AI Assistant"
                    >
                        <Waves className="w-8 h-8 drop-shadow-sm" />
                    </div>
                    {newInsight && (
                        <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                    )}
                </div>
            </div>

            {/* The Chat Modal */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex items-end justify-center sm:items-center">
                    <div 
                        className="w-full max-w-lg h-[80vh] max-h-[700px] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl animate-fade-in-up border dark:border-slate-700 relative overflow-hidden"
                        role="dialog"
                    >
                        {/* Background Layer */}
                        <div
                            className="absolute inset-0 -z-10 bg-cover bg-center transition-opacity duration-700"
                            style={{
                                backgroundImage: aiAssistantBackground ? `url(${aiAssistantBackground})` : 'none',
                                opacity: aiAssistantBackground ? 1 : 0,
                            }}
                        />
                        {/* Overlay to ensure readability */}
                         <div className={`absolute inset-0 -z-10 ${aiAssistantBackground ? 'bg-black/40 backdrop-blur-sm' : 'bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-lg'}`} />
                        
                         {/* History Panel */}
                        <div className={`absolute inset-0 z-20 transition-all duration-300 ${isHistoryPanelOpen ? 'visible' : 'invisible'}`}>
                           {/* Backdrop */}
                           <div className="absolute inset-0 bg-black/30" onClick={() => setIsHistoryPanelOpen(false)} />
                           {/* Panel Content */}
                           <div className={`absolute top-0 left-0 bottom-0 w-full max-w-xs bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-lg border-r dark:border-slate-700 flex flex-col transition-transform duration-300 ${isHistoryPanelOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                                <div className="flex-shrink-0 p-4 border-b dark:border-slate-700 flex items-center justify-between">
                                    <h3 className="font-bold text-slate-800 dark:text-white">Lịch sử trò chuyện</h3>
                                    <button onClick={() => setIsHistoryPanelOpen(false)} className="p-2 text-slate-500 hover:bg-black/10 dark:hover:bg-white/10 rounded-full">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex-grow p-2 space-y-2 overflow-y-auto">
                                    {sessions.length > 0 ? sessions.map(session => (
                                        <div key={session.id} onClick={() => { setViewingSession(session); setIsHistoryPanelOpen(false); }} className="p-2 bg-slate-200/50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-300/50 dark:hover:bg-slate-700/50">
                                            <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">{new Date(session.startTime).toLocaleString('vi-VN')}</p>
                                            <p className="text-sm text-slate-700 dark:text-gray-200 truncate"><strong>Bạn:</strong> {session.messages.find(m => m.role === 'user')?.text || '...'}</p>
                                        </div>
                                    )) : <p className="text-center text-sm text-slate-500 dark:text-gray-400 p-4">Không có lịch sử trò chuyện.</p>}
                                </div>
                                {sessions.length > 0 && (
                                    <div className="flex-shrink-0 p-2 border-t dark:border-slate-700">
                                        <button onClick={clearAssistantHistory} className="w-full text-center text-sm p-3 text-red-500 dark:text-red-400 hover:bg-red-500/10 rounded-lg flex items-center justify-center gap-2 border border-transparent hover:border-red-500/20">
                                            <Trash2 className="w-4 h-4" /> Xóa toàn bộ lịch sử
                                        </button>
                                    </div>
                                )}
                           </div>
                        </div>

                        <input
                            type="file"
                            ref={bgInputRef}
                            onChange={handleBgChange}
                            className="hidden"
                            accept="image/png, image/jpeg, image/gif, image/webp"
                        />

                        <header className="flex-shrink-0 p-4 border-b dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Waves className="w-6 h-6 text-indigo-500"/>
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Trợ lý AI Lingo</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={handleNewChatClick} className="p-2 text-slate-500 hover:bg-black/10 dark:hover:bg-white/10 rounded-full" title="Trò chuyện mới">
                                    <RotateCcw className="w-5 h-5"/>
                                </button>
                                <button onClick={() => setIsHistoryPanelOpen(true)} className="p-2 text-slate-500 hover:bg-black/10 dark:hover:bg-white/10 rounded-full" title="Lịch sử trò chuyện">
                                    <History className="w-5 h-5"/>
                                </button>
                                <button 
                                    onClick={() => !isBgLoading && bgInputRef.current?.click()}
                                    disabled={isBgLoading}
                                    className="p-2 text-slate-500 hover:bg-black/10 dark:hover:bg-white/10 rounded-full disabled:cursor-not-allowed" 
                                    title="Đổi ảnh nền"
                                >
                                    {isBgLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Palette className="w-5 h-5"/>}
                                </button>
                                <button onClick={toggle} className="p-2 text-slate-500 hover:bg-black/10 dark:hover:bg-white/10 rounded-full">
                                    <ChevronDown className="w-6 h-6" />
                                </button>
                            </div>
                        </header>
                        <div ref={chatBodyRef} className="flex-grow p-4 space-y-4 overflow-y-auto">
                           {displayedHistory.map((msg, i) => (
                                <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                     {msg.role === 'model' && <div className="w-8 h-8 flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center"><Waves className="w-5 h-5 text-indigo-500"/></div>}
                                     <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-500 text-white rounded-br-none' : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                     </div>
                                </div>
                            ))}
                            {!isViewingHistory && (liveInput || liveOutput) && (
                                <div className="mb-4 opacity-70">
                                    {liveInput && <p className="text-right"><strong className="text-cyan-500 dark:text-cyan-300">Bạn:</strong> {liveInput}</p>}
                                    {liveOutput && <p><strong className="text-indigo-500 dark:text-indigo-300">AI:</strong> {liveOutput}</p>}
                                </div>
                            )}
                             {!isViewingHistory && isLoading && (
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center"><Waves className="w-5 h-5 text-indigo-500"/></div>
                                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-700 rounded-bl-none">
                                        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                                    </div>
                                </div>
                             )}
                        </div>
                        <footer className="flex-shrink-0 p-4 border-t dark:border-slate-700 space-y-3">
                             {voiceError && !isViewingHistory && <p className="text-center text-xs text-red-500">{voiceError}</p>}
                             <div className="flex items-center justify-center gap-4">
                                {isViewingHistory ? (
                                    <p className="text-sm text-center text-slate-500 dark:text-gray-400 py-2">Bạn đang xem lại cuộc trò chuyện cũ.</p>
                                ) : voiceConnectionState === 'idle' || voiceConnectionState === 'error' ? (
                                    <button onClick={() => startVoiceSession({ setCurrentView })} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full font-semibold">
                                        <Play className="w-5 h-5" /> Bắt đầu Nói
                                    </button>
                                ) : voiceConnectionState === 'connecting' ? (
                                    <button disabled className="flex items-center gap-2 px-4 py-2 bg-indigo-400 text-white rounded-full font-semibold">
                                        <Loader2 className="w-5 h-5 animate-spin" /> Đang kết nối...
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={stopVoiceSession} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full font-semibold">
                                            <StopCircle className="w-5 h-5" /> Dừng
                                        </button>
                                        <button onClick={toggleMute} className={`p-3 rounded-full text-white ${isMuted ? 'bg-slate-600' : 'bg-slate-800'}`}>
                                            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                        </button>
                                    </>
                                )}
                            </div>
                             <form onSubmit={handleSubmit} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    placeholder={isViewingHistory ? "Xem lại lịch sử..." : "Hoặc nhập tin nhắn..."}
                                    className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-200 dark:disabled:bg-slate-800"
                                    disabled={isLoading || isViewingHistory}
                                />
                                <button type="submit" disabled={isLoading || !userInput.trim() || isViewingHistory} className="p-3 bg-indigo-600 text-white rounded-full disabled:bg-indigo-400">
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                        </footer>
                    </div>
                </div>
            )}
        </>
    );
};

export default AiAssistant;