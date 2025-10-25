import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { useHistory } from '../hooks/useHistory';
import { GeneratedWord } from '../types';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob, FunctionDeclaration, Type } from '@google/genai';
import { ArrowLeft, Video, PhoneOff, Check, X, Loader2, PlusCircle, Trash2, Camera, Circle } from 'lucide-react';
import eventBus from '../utils/eventBus';

// Audio/Blob utility functions
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
    return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
}

const RealWorldExplorer: React.FC<{onBack: () => void;}> = ({ onBack }) => {
    const [gameState, setGameState] = useState<'setup' | 'calling' | 'review'>('setup');
    const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [collectedWords, setCollectedWords] = useState<GeneratedWord[]>([]);
    const [error, setError] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const audioResourcesRef = useRef<{ inputCtx: AudioContext; outputCtx: AudioContext; stream: MediaStream; scriptProcessor: ScriptProcessorNode; sourceNode: MediaStreamAudioSourceNode; } | null>(null);
    const frameIntervalRef = useRef<number | null>(null);
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

    const { addMultipleWords } = useVocabulary();
    const { addHistoryEntry, history } = useHistory();
    const { learningLanguage, userApiKeys, recordActivity, addXp } = useSettings();

    const cleanup = useCallback(async () => {
        if (audioResourcesRef.current?.stream) {
            audioResourcesRef.current.stream.getTracks().forEach(track => track.stop());
        }
        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) { /* ignore */ }
            sessionPromiseRef.current = null;
        }
        if (audioResourcesRef.current) {
            try {
                audioResourcesRef.current.scriptProcessor.disconnect();
                audioResourcesRef.current.sourceNode.disconnect();
                if (audioResourcesRef.current.inputCtx.state !== 'closed') await audioResourcesRef.current.inputCtx.close();
                if (audioResourcesRef.current.outputCtx.state !== 'closed') await audioResourcesRef.current.outputCtx.close();
            } catch (e) { console.error("Error during audio context cleanup:", e); }
        }
        sourcesRef.current.forEach(source => source.stop());
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;
        audioResourcesRef.current = null;
        setConnectionState('idle');
    }, []);

    useEffect(() => { return () => { cleanup(); }; }, [cleanup]);

    const startCall = async () => {
        setGameState('calling');
        setConnectionState('connecting');
        setError('');
        setCollectedWords([]);

        const systemApiKey = process.env.API_KEY;
        const keysToTry: string[] = userApiKeys.length > 0 ? [...userApiKeys] : (systemApiKey ? [systemApiKey] : []);
        
        if (keysToTry.length === 0) {
            setError("Không có khóa API. Vui lòng thêm trong Cài đặt.");
            setConnectionState('error');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode: "environment" } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            const foundObjectFunc: FunctionDeclaration = {
                name: 'foundObject',
                parameters: {
                    type: Type.OBJECT,
                    description: 'Called when an object is identified.',
                    properties: {
                        word: { type: Type.STRING, description: `The object's name in ${learningLanguage}.` },
                        translation_vi: { type: Type.STRING, description: 'Vietnamese translation.' },
                        translation_en: { type: Type.STRING, description: 'English translation.' },
                        theme: { type: Type.STRING, description: 'A theme in Vietnamese.' },
                    },
                    required: ['word', 'translation_vi', 'translation_en', 'theme'],
                },
            };
            const systemInstruction = `You are an object identifier. When the user asks "what is this" or a similar question, analyze video frames, identify the main object, and call the 'foundObject' function with the object's name in ${learningLanguage}, its translations, and theme. Also, speak the object's name out loud in ${learningLanguage}. Example: say "That is a book."`;

            let connectionSuccessful = false;
            for (const key of keysToTry) {
                try {
                    const ai = new GoogleGenAI({ apiKey: key });
                    const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                    const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                    
                    sessionPromiseRef.current = ai.live.connect({
                        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                        config: { responseModalities: [Modality.AUDIO], tools: [{ functionDeclarations: [foundObjectFunc] }], systemInstruction },
                        callbacks: {
                            onopen: () => {
                                setConnectionState('connected');
                                const sourceNode = inputCtx.createMediaStreamSource(stream);
                                const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
                                audioResourcesRef.current = { inputCtx, outputCtx, stream, scriptProcessor, sourceNode };

                                scriptProcessor.onaudioprocess = (e) => sessionPromiseRef.current?.then((s) => s.sendRealtimeInput({ media: createBlob(e.inputBuffer.getChannelData(0)) }));
                                sourceNode.connect(scriptProcessor);
                                scriptProcessor.connect(inputCtx.destination);
                                
                                frameIntervalRef.current = window.setInterval(() => {
                                    const video = videoRef.current;
                                    const canvas = canvasRef.current;
                                    if (video && canvas) {
                                        canvas.width = video.videoWidth;
                                        canvas.height = video.videoHeight;
                                        canvas.getContext('2d')?.drawImage(video, 0, 0);
                                        canvas.toBlob(async (blob) => {
                                            if (blob) {
                                                const reader = new FileReader();
                                                reader.onload = () => {
                                                    const base64Data = (reader.result as string).split(',')[1];
                                                    sessionPromiseRef.current?.then((s) => s.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } }));
                                                };
                                                reader.readAsDataURL(blob);
                                            }
                                        }, 'image/jpeg', 0.8);
                                    }
                                }, 1000); // Send 1 frame per second
                            },
                            onmessage: async (msg) => {
                                if (msg.toolCall) {
                                    for (const fc of msg.toolCall.functionCalls) {
                                        if (fc.name === 'foundObject') {
                                            const newWord: GeneratedWord = fc.args as any;
                                            if (newWord && newWord.word) { // Robustness check
                                                setCollectedWords(prev => {
                                                    const newWordLower = newWord.word.toLowerCase();
                                                    if (!prev.some(w => w && w.word && w.word.toLowerCase() === newWordLower)) {
                                                        addHistoryEntry('IMAGE_OBJECT_IDENTIFIED', `Xác định đối tượng "${newWord.word}" từ camera.`, { word: newWord.word });
                                                        addXp(5);
                                                        return [...prev, newWord];
                                                    }
                                                    return prev;
                                                });
                                            }
                                        }
                                    }
                                }
                                const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                                if (audioData && audioResourcesRef.current?.outputCtx) {
                                    const outCtx = audioResourcesRef.current.outputCtx;
                                    if (nextStartTimeRef.current < outCtx.currentTime) nextStartTimeRef.current = outCtx.currentTime;
                                    const buffer = await decodeAudioData(decode(audioData), outCtx, 24000, 1);
                                    const source = outCtx.createBufferSource();
                                    source.buffer = buffer;
                                    source.connect(outCtx.destination);
                                    source.start(nextStartTimeRef.current);
                                    nextStartTimeRef.current += buffer.duration;
                                }
                            },
                            onclose: () => { if (connectionState !== 'idle') endCall(); },
                            onerror: (e) => { console.error("Live session error:", e); setError("Lỗi kết nối."); setConnectionState('error'); },
                        },
                    });
                    await sessionPromiseRef.current;
                    connectionSuccessful = true;
                    break;
                } catch (err) { /* Try next key */ }
            }
            if (!connectionSuccessful) throw new Error("Tất cả API key đều lỗi.");
        } catch (err: any) {
            console.error("Failed to start call:", err);
            setError(err.message || "Không thể truy cập camera/micro. Vui lòng cấp quyền.");
            setConnectionState('error');
            await cleanup();
        }
    };

    const endCall = async () => {
        await cleanup();
        if (collectedWords.length > 0) {
            recordActivity();
            setGameState('review');
        } else {
            setGameState('setup');
        }
    };

    const [wordsToConfirm, setWordsToConfirm] = useState<Set<string>>(new Set());
    useEffect(() => {
        if (gameState === 'review') setWordsToConfirm(new Set(collectedWords.map(w => w.word)));
    }, [gameState, collectedWords]);
    const handleToggleWord = (word: string) => setWordsToConfirm(p => { const n = new Set(p); if (n.has(word)) n.delete(word); else n.add(word); return n; });

    const handleConfirmReview = async () => {
        const wordsToAdd = collectedWords.filter(w => wordsToConfirm.has(w.word));
        if (wordsToAdd.length > 0) {
            const count = await addMultipleWords(wordsToAdd);
            eventBus.dispatch('notification', { type: 'success', message: `Đã thêm ${count} từ mới!` });
        }
        setGameState('setup');
    };

    if (gameState === 'setup') {
        return (
            <div className="space-y-6 text-center">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Khám phá Thế giới thực</h2>
                    <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 rounded-xl"><ArrowLeft className="w-4 h-4" /> <span>Quay lại</span></button>
                </div>
                <p className="text-gray-400">Bắt đầu cuộc gọi video với AI để nhận diện vật thể xung quanh bạn và học từ vựng mới trong thời gian thực.</p>
                <button onClick={startCall} className="w-full max-w-xs mx-auto flex items-center justify-center gap-3 px-4 py-3 bg-indigo-600 rounded-xl font-semibold"><Video className="w-6 h-6"/>Bắt đầu cuộc gọi</button>
            </div>
        );
    }

    if (gameState === 'review') {
        return (
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-white">Xem lại từ đã thu thập</h2>
                <div className="max-h-80 overflow-y-auto space-y-2 p-2 bg-slate-800/50 rounded-lg">
                    {collectedWords.map(word => (
                        <div key={word.word} onClick={() => handleToggleWord(word.word)} className={`flex items-center gap-2 p-2 rounded-md cursor-pointer ${wordsToConfirm.has(word.word) ? 'bg-indigo-900/50' : 'hover:bg-slate-700'}`}>
                            <div className={`w-5 h-5 flex-shrink-0 rounded-md flex items-center justify-center border-2 ${wordsToConfirm.has(word.word) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500'}`}>
                                {wordsToConfirm.has(word.word) && <Check className="w-4 h-4 text-white" />}
                            </div>
                            <div>
                                <p className="font-medium text-white">{word.word}</p>
                                <p className="text-xs text-gray-400">{word.translation_vi}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={handleConfirmReview} disabled={wordsToConfirm.size === 0} className="w-full py-3 bg-indigo-600 rounded-lg font-semibold disabled:bg-indigo-400">Thêm {wordsToConfirm.size} từ</button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Cuộc gọi Khám phá</h2>
                <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 text-sm ${connectionState === 'connected' ? 'text-green-400' : 'text-amber-400'}`}>
                        <Circle className={`w-2 h-2 fill-current ${connectionState === 'connected' ? 'animate-pulse' : ''}`} />
                        {connectionState === 'connecting' ? 'Đang kết nối...' : connectionState === 'connected' ? 'Đã kết nối' : 'Đã mất kết nối'}
                    </span>
                    <button onClick={endCall} className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 rounded-xl font-semibold"><PhoneOff className="w-4 h-4"/> Kết thúc</button>
                </div>
            </div>
            {error && <p className="text-red-400 text-center text-sm">{error}</p>}
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                <canvas ref={canvasRef} className="hidden" />
                {collectedWords.length > 0 && (
                    <div className="absolute bottom-2 left-2 max-w-xs max-h-48 overflow-y-auto p-2 bg-black/50 backdrop-blur-sm rounded-lg space-y-1">
                        {collectedWords.map(w => (
                            <div key={w.word} className="text-xs p-1 bg-slate-700/80 rounded-md">
                                <p className="font-bold text-white">{w.word}</p>
                                <p className="text-gray-300">{w.translation_vi}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RealWorldExplorer;