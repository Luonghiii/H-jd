import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { AiAssistantMessage, View, AiAssistantSession } from '../types';
import { useAuth } from './useAuth';
import { useVocabulary } from './useVocabulary';
import { useSettings } from './useSettings';
import { getAiAssistantResponse } from '../services/geminiService';
import { updateUserData } from '../services/firestoreService';
import { useActivityTracker } from './useActivityTracker';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import eventBus from '../utils/eventBus';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

// Audio utility functions
function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    if (ctx.state === 'suspended') await ctx.resume();
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


interface AiAssistantContextType {
    isOpen: boolean;
    toggle: () => void;
    history: AiAssistantMessage[]; // Current conversation
    sessions: AiAssistantSession[]; // All past conversations
    clearAssistantHistory: () => Promise<void>;
    sendMessage: (message: string, actions: { setCurrentView: (view: View) => void; }) => Promise<void>;
    isLoading: boolean;
    newInsight: boolean;
    markInsightAsRead: () => void;
    position: { x: number; y: number };
    setPosition: (pos: { x: number; y: number }) => void;
    isDragging: boolean;
    setIsDragging: (isDragging: boolean) => void;
    voiceConnectionState: 'idle' | 'connecting' | 'connected' | 'error';
    startVoiceSession: (actions: { setCurrentView: (view: View) => void; }) => Promise<void>;
    stopVoiceSession: () => Promise<void>;
    liveInput: string;
    liveOutput: string;
    isMuted: boolean;
    toggleMute: () => void;
    voiceError: string;
    startNewChat: () => Promise<void>;
}

const AiAssistantContext = createContext<AiAssistantContextType | undefined>(undefined);

const initialPosition = {
    x: window.innerWidth - 80,
    y: window.innerHeight - 150
};

const initialMessage: AiAssistantMessage = { role: 'model', text: 'Xin chào! Tôi là Lingo. Bạn cần giúp gì?', timestamp: Date.now() };

export const AiAssistantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const { words } = useVocabulary();
    const { stats, userApiKeys } = useSettings();
    const { activityLog } = useActivityTracker();

    const [isOpen, setIsOpen] = useState(false);
    const [history, setHistory] = useState<AiAssistantMessage[]>([initialMessage]);
    const [sessions, setSessions] = useState<AiAssistantSession[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newInsight, setNewInsight] = useState(false);
    const [position, setPosition] = useState(initialPosition);
    const [isDragging, setIsDragging] = useState(false);

    // Voice state
    const [voiceConnectionState, setVoiceConnectionState] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [liveInput, setLiveInput] = useState('');
    const [liveOutput, setLiveOutput] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [voiceError, setVoiceError] = useState('');

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const audioResourcesRef = useRef<{ inputCtx: AudioContext; outputCtx: AudioContext; stream: MediaStream; scriptProcessor: ScriptProcessorNode; sourceNode: MediaStreamAudioSourceNode; } | null>(null);
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');
    const historyRef = useRef(history);
    useEffect(() => { historyRef.current = history; }, [history]);
    const sessionsRef = useRef(sessions);
    useEffect(() => { sessionsRef.current = sessions; }, [sessions]);
    const sessionJustSavedRef = useRef(true);

    useEffect(() => {
        if (currentUser?.uid) {
            const userRef = doc(db, 'users', currentUser.uid);
            const unsubscribe = onSnapshot(userRef, (doc) => {
                const data = doc.data();
                setSessions(data?.aiAssistantSessions || []);
            });
            return () => unsubscribe();
        }
    }, [currentUser]);

    const markInsightAsRead = () => setNewInsight(false);
    const toggleMute = () => setIsMuted(prev => !prev);

    const saveCurrentSession = useCallback(async () => {
        if (!currentUser || historyRef.current.length <= 1 || sessionJustSavedRef.current) {
            return;
        }
        const newSession: AiAssistantSession = {
            id: Date.now(),
            startTime: historyRef.current[0]?.timestamp || Date.now(),
            messages: historyRef.current,
        };
        const newSessions = [newSession, ...sessionsRef.current].slice(0, 50);
        await updateUserData(currentUser.uid, { aiAssistantSessions: newSessions });
        sessionJustSavedRef.current = true;
    }, [currentUser]);

    const cleanup = useCallback(async () => {
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) {}
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
        setLiveInput('');
        setLiveOutput('');
        currentInputTranscriptionRef.current = '';
        currentOutputTranscriptionRef.current = '';
    }, []);

    const toggle = () => {
        setIsOpen(prev => {
            if (prev) saveCurrentSession();
            return !prev;
        });
    };
    
    useEffect(() => {
        const handleBeforeUnload = () => saveCurrentSession();
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            saveCurrentSession();
        };
    }, [saveCurrentSession]);


    const sendMessage = useCallback(async (message: string, actions: { setCurrentView: (view: View) => void; }) => {
        if (!currentUser) return;
        
        sessionJustSavedRef.current = false;
        const userMessage: AiAssistantMessage = { role: 'user', text: message, timestamp: Date.now() };
        const newHistory = [...history, userMessage];
        setHistory(newHistory);
        setIsLoading(true);

        const context = { detailedActivityLog: activityLog, vocabularyList: words.map(w => ({ word: w.word, srsLevel: w.srsLevel, theme: w.theme })), userStats: stats };
        const { responseText, functionCalls } = await getAiAssistantResponse(message, newHistory, context);
        
        const modelMessage: AiAssistantMessage = { role: 'model', text: responseText, timestamp: Date.now() };
        setHistory(prev => [...prev, modelMessage]);
        setIsLoading(false);

        if (functionCalls?.length) {
            for (const call of functionCalls) {
                if (call.name === 'navigateToGame' && call.args.gameName) {
                    const gameView = (call.args.gameName as string).toLowerCase() as View;
                    if (Object.values(View).includes(gameView)) {
                         setTimeout(() => { actions.setCurrentView(gameView); toggle(); }, 1000);
                    }
                }
            }
        }
    }, [currentUser, history, words, stats, activityLog, toggle]);

    const startNewChat = useCallback(async () => {
        await saveCurrentSession();
        setHistory([initialMessage]);
        sessionJustSavedRef.current = true;
        eventBus.dispatch('notification', { type: 'info', message: 'Đã bắt đầu cuộc trò chuyện mới.' });
    }, [saveCurrentSession]);

    const clearAssistantHistory = useCallback(async () => {
        if (!currentUser) return;
        if (window.confirm("Bạn có chắc muốn xóa toàn bộ lịch sử trò chuyện với Lingo?")) {
            await updateUserData(currentUser.uid, { aiAssistantSessions: [] });
            setSessions([]);
        }
    }, [currentUser]);
    
    const stopVoiceSession = useCallback(async () => {
        if (currentUser) {
            const finalInput = currentInputTranscriptionRef.current.trim();
            const finalOutput = currentOutputTranscriptionRef.current.trim();
            let currentMessages = [...historyRef.current];
            if (finalInput) currentMessages.push({ role: 'user', text: finalInput, timestamp: Date.now() });
            if (finalOutput) currentMessages.push({ role: 'model', text: finalOutput, timestamp: Date.now() });

            if (currentMessages.length > 1) {
                const newSession: AiAssistantSession = {
                    id: Date.now(),
                    startTime: currentMessages[0]?.timestamp || Date.now(),
                    messages: currentMessages
                };
                const newSessions = [newSession, ...sessionsRef.current].slice(0, 50);
                await updateUserData(currentUser.uid, { aiAssistantSessions: newSessions });
            }
        }
        await cleanup();
        setHistory([initialMessage]);
        sessionJustSavedRef.current = true;
        setVoiceConnectionState('idle');
    }, [cleanup, currentUser]);
    
    const startVoiceSession = useCallback(async (actions: { setCurrentView: (view: View) => void; }) => {
        if (voiceConnectionState !== 'idle' && voiceConnectionState !== 'error') return;
        
        await saveCurrentSession();
        await cleanup();
        setHistory([initialMessage]);
        sessionJustSavedRef.current = true;

        setVoiceConnectionState('connecting');
        setVoiceError('');

        const systemApiKey = process.env.API_KEY;
        const keysToTry = userApiKeys.length > 0 ? [...userApiKeys] : (systemApiKey ? [systemApiKey] : []);
        
        if (keysToTry.length === 0) {
            setVoiceError("Không có khóa API nào được cấu hình.");
            setVoiceConnectionState('error');
            return;
        }

        let connectionSuccessful = false;
        for (const key of keysToTry) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const context = { detailedActivityLog: activityLog, vocabularyList: words.map(w => ({ word: w.word, srsLevel: w.srsLevel, theme: w.theme })), userStats: stats };
                const systemInstruction = `You are Lingo...`; // Same as sendMessage

                const ai = new GoogleGenAI({ apiKey: key });
                const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

                sessionPromiseRef.current = ai.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    config: { responseModalities: [Modality.AUDIO], inputAudioTranscription: {}, outputAudioTranscription: {}, systemInstruction },
                    callbacks: {
                        onopen: () => {
                            setVoiceConnectionState('connected');
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
                             if (msg.serverContent?.inputTranscription) { currentInputTranscriptionRef.current += msg.serverContent.inputTranscription.text; setLiveInput(prev => prev + msg.serverContent.inputTranscription.text); }
                             if (msg.serverContent?.outputTranscription) { currentOutputTranscriptionRef.current += msg.serverContent.outputTranscription.text; setLiveOutput(prev => prev + msg.serverContent.outputTranscription.text); }
                             if (msg.serverContent?.turnComplete) {
                                const newHistory = [...historyRef.current, { role: 'user', text: currentInputTranscriptionRef.current, timestamp: Date.now() }, { role: 'model', text: currentOutputTranscriptionRef.current, timestamp: Date.now() }];
                                setHistory(newHistory);
                                currentInputTranscriptionRef.current = ''; setLiveInput('');
                                currentOutputTranscriptionRef.current = ''; setLiveOutput('');
                             }
                             if(msg.serverContent?.interrupted) { sourcesRef.current.forEach(s => s.stop()); sourcesRef.current.clear(); nextStartTimeRef.current = 0; }
                             const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                             if (audioData && audioResourcesRef.current?.outputCtx) {
                                const outCtx = audioResourcesRef.current.outputCtx;
                                if (nextStartTimeRef.current < outCtx.currentTime) nextStartTimeRef.current = outCtx.currentTime;
                                const buffer = await decodeAudioData(decode(audioData), outCtx, 24000, 1);
                                const source = outCtx.createBufferSource();
                                source.buffer = buffer;
                                source.connect(outCtx.destination);
                                source.start(nextStartTimeRef.current);
                                sourcesRef.current.add(source);
                                source.onended = () => sourcesRef.current.delete(source);
                                nextStartTimeRef.current += buffer.duration;
                             }
                             if (msg.toolCall) {
                                for (const call of msg.toolCall.functionCalls) {
                                    if (call.name === 'navigateToGame' && call.args.gameName) {
                                        const gameView = (call.args.gameName as string).toLowerCase() as View;
                                        if (Object.values(View).includes(gameView)) {
                                            setTimeout(() => { actions.setCurrentView(gameView); toggle(); }, 1000);
                                        }
                                        sessionPromiseRef.current?.then((s) => s.sendToolResponse({functionResponses: { id: call.id, name: call.name, response: { result: "ok" } }}));
                                    }
                                }
                             }
                        },
                        onclose: () => { if (voiceConnectionState !== 'idle') stopVoiceSession(); },
                        onerror: (e) => { console.error(e); setVoiceError("Lỗi kết nối."); setVoiceConnectionState('error'); },
                    },
                });
                await sessionPromiseRef.current;
                connectionSuccessful = true;
                break;
            } catch (err: any) {
                eventBus.dispatch('notification', { type: 'warning', message: `Khóa API ...${key.slice(-4)} thất bại. Thử khóa tiếp theo...` });
                await cleanup();
            }
        }
        if (!connectionSuccessful) {
            setVoiceError("Tất cả API đều lỗi hoặc không thể truy cập micro.");
            setVoiceConnectionState('error');
        }
    }, [cleanup, userApiKeys, isMuted, stopVoiceSession, voiceConnectionState, activityLog, words, stats, saveCurrentSession, toggle]);

    return (
        <AiAssistantContext.Provider value={{ isOpen, toggle, history, sessions, clearAssistantHistory, sendMessage, isLoading, newInsight, markInsightAsRead, position, setPosition, isDragging, setIsDragging, voiceConnectionState, startVoiceSession, stopVoiceSession, liveInput, liveOutput, isMuted, toggleMute, voiceError, startNewChat }}>
            {children}
        </AiAssistantContext.Provider>
    );
};

export const useAiAssistant = (): AiAssistantContextType => {
    const context = useContext(AiAssistantContext);
    if (context === undefined) {
        throw new Error('useAiAssistant must be used within an AiAssistantProvider');
    }
    return context;
};
