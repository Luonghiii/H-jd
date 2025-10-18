import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { useSettings } from '../hooks/useSettings';
import { getChatResponseForTutor } from '../services/geminiService';
import { ArrowLeft, Mic, MicOff, Loader2, Play, StopCircle, Trash2, ChevronDown, Send } from 'lucide-react';
import eventBus from '../utils/eventBus';

// Audio utility functions from @google/genai documentation
function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    // Ensure the AudioContext is running
    if (ctx.state === 'suspended') {
        await ctx.resume();
    }
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

const langToVoiceCode = {
    german: 'de-DE',
    english: 'en-US',
    chinese: 'zh-CN',
};

interface AiTutorProps {
  onBack: () => void;
}

type Turn = { user: string; model: string };
type ConversationSession = {
    id: number;
    startTime: number;
    turns: Turn[];
};

const AiTutor: React.FC<AiTutorProps> = ({ onBack }) => {
    const { learningLanguage, targetLanguage, userApiKeys } = useSettings();
    const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    
    // Full completed turns
    const [currentTurns, setCurrentTurns] = useState<Turn[]>([]);
    // Live transcription parts
    const [liveInput, setLiveInput] = useState('');
    const [liveOutput, setLiveOutput] = useState('');

    const [pastSessions, setPastSessions] = useState<ConversationSession[]>([]);
    const [isMuted, setIsMuted] = useState(false);
    const [error, setError] = useState('');
    const [textInput, setTextInput] = useState('');
    const [isTextLoading, setIsTextLoading] = useState(false);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const audioResourcesRef = useRef<{
        inputCtx: AudioContext;
        outputCtx: AudioContext;
        stream: MediaStream;
        scriptProcessor: ScriptProcessorNode;
        sourceNode: MediaStreamAudioSourceNode;
    } | null>(null);
    
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
    
    // Use refs for callbacks to get latest values without re-triggering effects
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');
    const liveTranscriptRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            const savedHistory = localStorage.getItem('aiTutorHistory');
            if (savedHistory) setPastSessions(JSON.parse(savedHistory));
        } catch (e) { console.error("Failed to load AI Tutor history:", e); }
    }, []);

    const cleanup = useCallback(async (saveSession: boolean) => {
        window.speechSynthesis.cancel();
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) { /* Ignore closing errors */ }
            sessionPromiseRef.current = null;
        }
        if (audioResourcesRef.current) {
            audioResourcesRef.current.scriptProcessor.disconnect();
            audioResourcesRef.current.sourceNode.disconnect();
            audioResourcesRef.current.stream.getTracks().forEach(track => track.stop());
            if (audioResourcesRef.current.inputCtx.state !== 'closed') await audioResourcesRef.current.inputCtx.close();
            if (audioResourcesRef.current.outputCtx.state !== 'closed') await audioResourcesRef.current.outputCtx.close();
            audioResourcesRef.current = null;
        }
        sourcesRef.current.forEach(source => source.stop());
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;
        
        if (saveSession) {
            // Combine final live transcript parts with completed turns for a full history
            const finalInput = currentInputTranscriptionRef.current.trim();
            const finalOutput = currentOutputTranscriptionRef.current.trim();
            let allTurns = [...currentTurns];
            if (finalInput || finalOutput) {
                allTurns.push({ user: finalInput, model: finalOutput });
            }

            if (allTurns.length > 0) {
                 const newSession: ConversationSession = {
                    id: Date.now(),
                    startTime: Date.now(),
                    turns: allTurns,
                };

                try {
                    const savedHistory = localStorage.getItem('aiTutorHistory');
                    const past = savedHistory ? JSON.parse(savedHistory) : [];
                    const newHistory = [newSession, ...past];
                    localStorage.setItem('aiTutorHistory', JSON.stringify(newHistory));
                    setPastSessions(newHistory);
                } catch (e) { console.error("Failed to save AI Tutor history:", e); }
            }
        }

        setCurrentTurns([]);
        setLiveInput('');
        setLiveOutput('');
        currentInputTranscriptionRef.current = '';
        currentOutputTranscriptionRef.current = '';
    }, [currentTurns]);

    const stopSession = useCallback(async () => {
        await cleanup(true);
        setConnectionState('idle');
    }, [cleanup]);
    
    useEffect(() => {
        return () => {
            (async () => {
                window.speechSynthesis.cancel();
                await cleanup(true);
            })();
        };
    }, [cleanup]);

    const startSession = useCallback(async () => {
        if (connectionState !== 'idle' && connectionState !== 'error') return;
        
        await cleanup(true);
        setConnectionState('connecting');
        setError('');

        const systemApiKey = process.env.API_KEY;
        const keysToTry: string[] = userApiKeys.length > 0 ? [...userApiKeys] : (systemApiKey ? [systemApiKey] : []);
        
        if (keysToTry.length === 0) {
            setError("Không có khóa API nào được cấu hình. Vui lòng thêm khóa trong Cài đặt.");
            setConnectionState('error');
            return;
        }

        let connectionSuccessful = false;
        for (const key of keysToTry) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                const historySummary = currentTurns.map(t => `User: ${t.user}\nAI: ${t.model}`).join('\n\n');
                const systemInstruction = `You are a friendly language tutor... (Context: ${historySummary})`;

                const ai = new GoogleGenAI({ apiKey: key });
                const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

                sessionPromiseRef.current = ai.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    config: { responseModalities: [Modality.AUDIO], inputAudioTranscription: {}, outputAudioTranscription: {}, systemInstruction },
                    callbacks: {
                        onopen: () => {
                            setConnectionState('connected');
                            const sourceNode = inputCtx.createMediaStreamSource(stream);
                            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
                            audioResourcesRef.current = { inputCtx, outputCtx, stream, scriptProcessor, sourceNode };

                            scriptProcessor.onaudioprocess = (e) => {
                                if (isMuted) return;
                                sessionPromiseRef.current?.then((s) => s.sendRealtimeInput({ media: createBlob(e.inputBuffer.getChannelData(0)) }));
                            };
                            sourceNode.connect(scriptProcessor);
                            scriptProcessor.connect(inputCtx.destination);
                        },
                        onmessage: async (msg) => {
                            if (msg.serverContent?.inputTranscription) {
                                currentInputTranscriptionRef.current += msg.serverContent.inputTranscription.text;
                                setLiveInput(currentInputTranscriptionRef.current);
                            }
                            if (msg.serverContent?.outputTranscription) {
                                currentOutputTranscriptionRef.current += msg.serverContent.outputTranscription.text;
                                setLiveOutput(currentOutputTranscriptionRef.current);
                            }
                            if (msg.serverContent?.turnComplete) {
                                setCurrentTurns(prev => [...prev, { user: currentInputTranscriptionRef.current, model: currentOutputTranscriptionRef.current }]);
                                currentInputTranscriptionRef.current = ''; setLiveInput('');
                                currentOutputTranscriptionRef.current = ''; setLiveOutput('');
                            }
                            if(msg.serverContent?.interrupted) {
                                sourcesRef.current.forEach(s => s.stop());
                                sourcesRef.current.clear();
                                nextStartTimeRef.current = 0;
                            }

                            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                            if (audioData && audioResourcesRef.current?.outputCtx) {
                                const outCtx = audioResourcesRef.current.outputCtx;
                                await outCtx.resume();
                                const nextStart = Math.max(nextStartTimeRef.current, outCtx.currentTime);
                                const buffer = await decodeAudioData(decode(audioData), outCtx, 24000, 1);
                                const source = outCtx.createBufferSource();
                                source.buffer = buffer;
                                source.connect(outCtx.destination);
                                source.start(nextStart);
                                sourcesRef.current.add(source);
                                source.onended = () => sourcesRef.current.delete(source);
                                nextStartTimeRef.current = nextStart + buffer.duration;
                            }
                        },
                        onclose: () => {
                            stopSession();
                        },
                        onerror: (e) => { 
                           throw new Error("Live session error");
                        },
                    },
                });
                await sessionPromiseRef.current;
                connectionSuccessful = true;
                break; // Exit loop on successful connection
            } catch (err: any) {
                const keyIdentifier = `...${key.slice(-4)}`;
                eventBus.dispatch('apiKeyNotification', { type: 'warning', message: `Khóa API ${keyIdentifier} thất bại. Đang thử khóa tiếp theo...` });
                await cleanup(false); // Cleanup failed attempt
            }
        }
        if (!connectionSuccessful) {
            setError("Tất cả các khóa API đều không hoạt động hoặc không thể truy cập micro.");
            setConnectionState('error');
        }
    }, [cleanup, learningLanguage, targetLanguage, userApiKeys, isMuted, stopSession, connectionState, currentTurns]);
    
    const handleSendText = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!textInput.trim() || isTextLoading) return;
        
        await stopSession();
        
        const userMessage = textInput.trim();
        setTextInput('');
        setIsTextLoading(true);
        const newTurnsWithUser = [...currentTurns, { user: userMessage, model: '...' }];
        setCurrentTurns(newTurnsWithUser);

        try {
            const modelResponse = await getChatResponseForTutor(currentTurns, userMessage, learningLanguage, targetLanguage);
            setCurrentTurns(prev => {
                const updatedTurns = [...prev];
                updatedTurns[updatedTurns.length - 1].model = modelResponse;
                return updatedTurns;
            });
            const utterance = new SpeechSynthesisUtterance(modelResponse);
            utterance.lang = langToVoiceCode[learningLanguage] || 'en-US';
            window.speechSynthesis.speak(utterance);
        } catch (error) {
             setCurrentTurns(prev => {
                const updatedTurns = [...prev];
                updatedTurns[updatedTurns.length - 1].model = 'Xin lỗi, đã có lỗi xảy ra.';
                return updatedTurns;
            });
        } finally {
            setIsTextLoading(false);
        }
    }

    const clearHistory = () => {
        if (window.confirm("Bạn có chắc muốn xóa toàn bộ lịch sử trò chuyện?")) {
            setPastSessions([]);
            localStorage.removeItem('aiTutorHistory');
        }
    }

    return (
        <div className="space-y-4 animate-fade-in flex flex-col h-full max-h-[75vh]">
            <div className="flex items-center justify-between flex-shrink-0">
                <h2 className="text-2xl font-bold text-white">Gia sư AI</h2>
                <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 rounded-xl">
                    <ArrowLeft className="w-4 h-4" /> <span>Quay lại</span>
                </button>
            </div>
            
            <div ref={liveTranscriptRef} className="flex-grow p-4 bg-slate-800/50 border border-slate-700 rounded-2xl overflow-y-auto">
                {currentTurns.map((turn, i) => (
                    <div key={i} className="mb-4">
                        <p><strong className="text-cyan-300">Bạn:</strong> {turn.user}</p>
                        <p><strong className="text-indigo-300">AI:</strong> {turn.model}</p>
                    </div>
                ))}
                {(liveInput || liveOutput) && (
                    <div className="mb-4 opacity-70">
                        {liveInput && <p><strong className="text-cyan-300">Bạn:</strong> {liveInput}</p>}
                        {liveOutput && <p><strong className="text-indigo-300">AI:</strong> {liveOutput}</p>}
                    </div>
                )}
                 {currentTurns.length === 0 && !liveInput && !liveOutput && (
                    <div className="m-auto text-center text-gray-400">
                        {connectionState === 'connected' ? 'Bắt đầu nói để trò chuyện...' : 'Nhấn nút Bắt đầu để nói hoặc nhập tin nhắn.'}
                    </div>
                 )}
            </div>
            
            <div className="flex-shrink-0 space-y-3">
                <form onSubmit={handleSendText} className="flex items-center gap-2">
                    <input 
                        type="text" 
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="...hoặc nhập tin nhắn ở đây"
                        className="flex-grow px-4 py-2 bg-slate-800 border border-slate-600 rounded-full text-white placeholder-gray-500"
                        disabled={isTextLoading || connectionState === 'connecting'}
                    />
                    <button type="submit" disabled={!textInput.trim() || isTextLoading} className="p-3 bg-indigo-600 rounded-full text-white disabled:bg-indigo-400">
                        <Send className="w-5 h-5"/>
                    </button>
                </form>
                <div className="flex items-center justify-center gap-4">
                    {connectionState === 'idle' || connectionState === 'error' ? (
                        <button onClick={startSession} disabled={isTextLoading} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-full text-white font-semibold disabled:bg-indigo-400">
                            <Play className="w-5 h-5" /> Bắt đầu Nói
                        </button>
                    ) : connectionState === 'connecting' ? (
                        <button disabled className="flex items-center gap-2 px-6 py-3 bg-indigo-400 rounded-full text-white font-semibold">
                            <Loader2 className="w-5 h-5 animate-spin" /> Đang kết nối...
                        </button>
                    ) : (
                        <>
                            <button onClick={stopSession} className="flex items-center gap-2 px-6 py-3 bg-red-600 rounded-full text-white font-semibold">
                                <StopCircle className="w-5 h-5" /> Dừng
                            </button>
                            <button onClick={() => setIsMuted(!isMuted)} className="p-3 bg-slate-700 rounded-full text-white">
                                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            </button>
                        </>
                    )}
                </div>
            </div>
            {error && <p className="text-center text-sm text-red-400">{error}</p>}
            
            {pastSessions.length > 0 && (
                <details className="flex-shrink-0 rounded-2xl border border-slate-700 bg-slate-800/50">
                    <summary className="p-3 cursor-pointer flex justify-between items-center font-semibold">
                        Lịch sử trò chuyện ({pastSessions.length})
                        <ChevronDown className="w-5 h-5 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="p-3 border-t border-slate-700 max-h-48 overflow-y-auto space-y-4">
                        {pastSessions.map(session => (
                            <div key={session.id} className="p-2 bg-slate-900/50 rounded-lg">
                                <p className="text-xs text-gray-400 mb-2">{new Date(session.startTime).toLocaleString()}</p>
                                {session.turns.map((turn, i) => (
                                    <div key={i} className="text-sm">
                                        <p><strong className="text-cyan-400">B:</strong> {turn.user}</p>
                                        <p><strong className="text-indigo-400">A:</strong> {turn.model}</p>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                     <button onClick={clearHistory} className="w-full text-center text-xs p-2 text-red-400 hover:bg-red-500/10 border-t border-slate-700">
                        <Trash2 className="w-3 h-3 inline mr-1" /> Xóa lịch sử
                    </button>
                </details>
            )}
        </div>
    );
};

export default AiTutor;