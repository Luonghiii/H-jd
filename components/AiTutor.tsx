import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { Mic, MicOff, AlertCircle, RefreshCw } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error' | 'closed';

function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

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

const AiTutor: React.FC<{onBack: () => void;}> = ({onBack}) => {
    const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
    const [transcript, setTranscript] = useState<{ user: string, model: string }[]>([]);
    const [currentTurn, setCurrentTurn] = useState({ user: '', model: '' });
    const { apiKey, learningLanguage } = useSettings();
    
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const cleanup = () => {
        console.log("Cleaning up resources...");
        sessionPromiseRef.current?.then(session => session.close());
        sessionPromiseRef.current = null;
        
        scriptProcessorRef.current?.disconnect();
        scriptProcessorRef.current = null;
        
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;

        inputAudioContextRef.current?.close().catch(console.error);
        outputAudioContextRef.current?.close().catch(console.error);
        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;
        
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();

        setConnectionState('closed');
    };
    
    useEffect(() => {
        return () => cleanup();
    }, []);

    const startConversation = async () => {
        setConnectionState('connecting');
        setTranscript([]);
        setCurrentTurn({ user: '', model: '' });
        
        try {
            const ai = new GoogleGenAI({ apiKey: apiKey! });
            
            inputAudioContextRef.current = new (window.AudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext)({ sampleRate: 24000 });
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setConnectionState('connected');
                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;
                        
                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(f => f * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            setCurrentTurn(prev => ({ ...prev, user: message.serverContent!.inputTranscription!.text || '' }));
                        }
                        if (message.serverContent?.outputTranscription) {
                            setCurrentTurn(prev => ({ ...prev, model: message.serverContent!.outputTranscription!.text || '' }));
                        }
                        if (message.serverContent?.turnComplete) {
                            setTranscript(prev => [...prev, currentTurn]);
                            setCurrentTurn({ user: '', model: '' });
                        }
                        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (audioData) {
                            const outputAudioContext = outputAudioContextRef.current!;
                            const nextStartTime = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
                            const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContext, 24000, 1);
                            
                            const source = outputAudioContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContext.destination);
                            source.start(nextStartTime);
                            nextStartTimeRef.current = nextStartTime + audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                            source.onended = () => audioSourcesRef.current.delete(source);
                        }
                    },
                    onerror: (e) => {
                        console.error('Session error:', e);
                        setConnectionState('error');
                        cleanup();
                    },
                    onclose: () => {
                        setConnectionState('closed');
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: `You are a friendly language tutor for a student learning ${learningLanguage}. Keep your responses friendly, encouraging, and relatively simple. Converse with the user in ${learningLanguage}.`
                }
            });

        } catch (error) {
            console.error('Failed to start conversation:', error);
            setConnectionState('error');
            cleanup();
        }
    };

    const stopConversation = () => {
        cleanup();
    };
    
    const renderStatusIndicator = () => {
        switch (connectionState) {
            case 'idle':
            case 'closed':
                return <span className="text-gray-400">Chưa kết nối</span>;
            case 'connecting':
                return <span className="text-amber-400 flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Đang kết nối...</span>;
            case 'connected':
                return <span className="text-green-400 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>Đã kết nối</span>;
            case 'error':
                 return <span className="text-red-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Lỗi kết nối</span>;
        }
    }

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Gia sư Đối thoại AI</h2>
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                {renderStatusIndicator()}
                {connectionState !== 'connected' && connectionState !== 'connecting' ? (
                    <button onClick={startConversation} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg text-white font-semibold">
                        <Mic className="w-5 h-5"/> Bắt đầu
                    </button>
                ) : (
                    <button onClick={stopConversation} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-white font-semibold">
                        <MicOff className="w-5 h-5"/> Dừng
                    </button>
                )}
            </div>
            <div className="h-80 bg-slate-900/50 rounded-xl p-4 overflow-y-auto space-y-4">
                {transcript.map((turn, index) => (
                    <div key={index}>
                        <p><strong className="text-cyan-400">Bạn:</strong> {turn.user}</p>
                        <p><strong className="text-indigo-400">AI:</strong> {turn.model}</p>
                    </div>
                ))}
                 {(currentTurn.user || currentTurn.model) && (
                     <div>
                        <p className="text-gray-400"><strong className="text-cyan-400">Bạn:</strong> {currentTurn.user}</p>
                        <p className="text-gray-400"><strong className="text-indigo-400">AI:</strong> {currentTurn.model}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AiTutor;
