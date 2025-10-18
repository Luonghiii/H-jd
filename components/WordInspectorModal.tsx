

import React, { useState, useEffect, useRef } from 'react';
import { VocabularyWord, WordInfo, ChatMessage } from '../types';
import { useSettings } from '../hooks/useSettings';
import { getWordInfo, generateSentence, checkSentence, rewriteSentence, getChatResponseForWord } from '../services/geminiService';
import { X, Info, MessageSquare, BookOpen, Send, RefreshCw } from 'lucide-react';

interface WordInspectorModalProps {
  isOpen: boolean;
  word: VocabularyWord;
  onClose: () => void;
}

type Tab = 'info' | 'examples' | 'chat';

const WordInspectorModal: React.FC<WordInspectorModalProps> = ({ isOpen, word, onClose }) => {
  const { targetLanguage, learningLanguage } = useSettings();
  const [activeTab, setActiveTab] = useState<Tab>('info');
  
  // Info Tab State
  const [wordInfo, setWordInfo] = useState<WordInfo | null>(null);
  const [isInfoLoading, setIsInfoLoading] = useState(false);
  
  // Examples Tab State
  const [exampleSentence, setExampleSentence] = useState('');
  const [exampleTranslation, setExampleTranslation] = useState('');
  const [isExampleLoading, setIsExampleLoading] = useState(false);
  const [userSentence, setUserSentence] = useState('');
  const [sentenceFeedback, setSentenceFeedback] = useState('');
  const [isCheckingSentence, setIsCheckingSentence] = useState(false);
  const [rewrittenSentence, setRewrittenSentence] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);

  // Chat Tab State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userQuestion, setUserQuestion] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens or word changes
      setActiveTab('info');
      setWordInfo(null);
      setExampleSentence('');
      setExampleTranslation('');
      setChatHistory([]);
    }
  }, [isOpen, word]);

  useEffect(() => {
    if (isOpen && activeTab === 'info' && !wordInfo) {
      const fetchInfo = async () => {
        setIsInfoLoading(true);
        try {
          const info = await getWordInfo(word.word, targetLanguage, learningLanguage);
          setWordInfo(info);
        } catch (error) { console.error(error); }
        setIsInfoLoading(false);
      };
      fetchInfo();
    }
  }, [isOpen, activeTab, wordInfo, word, targetLanguage, learningLanguage]);

  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleGenerateExample = async () => {
    setIsExampleLoading(true);
    const result = await generateSentence(word, targetLanguage, learningLanguage);
    const parts = result.split('---Translation---');
    setExampleSentence(parts[0].trim());
    setExampleTranslation(parts.length > 1 ? parts[1].trim() : '');
    setIsExampleLoading(false);
  };

  const handleCheckSentence = async () => {
    if (!userSentence.trim()) return;
    setIsCheckingSentence(true);
    const feedback = await checkSentence(userSentence, word.word, targetLanguage, learningLanguage);
    setSentenceFeedback(feedback);
    setIsCheckingSentence(false);
  };
  
  const handleRewriteSentence = async () => {
    if (!userSentence.trim()) return;
    setIsRewriting(true);
    const result = await rewriteSentence(userSentence, word.word, targetLanguage, learningLanguage);
    setRewrittenSentence(result);
    setIsRewriting(false);
  };
  
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim() || isChatLoading) return;
    
    const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', text: userQuestion }];
    setChatHistory(newHistory);
    setUserQuestion('');
    setIsChatLoading(true);

    const response = await getChatResponseForWord(word, userQuestion, newHistory, targetLanguage, learningLanguage);
    setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    setIsChatLoading(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 sm:p-6 flex-shrink-0 border-b border-slate-600">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">{word.word}</h2>
                    <p className="text-gray-400">{word.translation[targetLanguage]}</p>
                </div>
                <button onClick={onClose} className="p-2 text-gray-400 hover:bg-slate-700 rounded-full">
                    <X className="w-5 h-5" />
                </button>
            </div>
            <div className="mt-4 flex border-b border-slate-700">
                <button onClick={() => setActiveTab('info')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'info' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-gray-200'}`}><Info className="w-4 h-4 inline mr-1"/> Thông tin</button>
                <button onClick={() => setActiveTab('examples')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'examples' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-gray-200'}`}><BookOpen className="w-4 h-4 inline mr-1"/> Ví dụ</button>
                <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'chat' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-gray-200'}`}><MessageSquare className="w-4 h-4 inline mr-1"/> Hỏi đáp</button>
            </div>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto">
            {activeTab === 'info' && (
                <div className="space-y-4">
                    {isInfoLoading ? <p>Đang tải thông tin...</p> : wordInfo ? (
                        <>
                           {word.imageUrl && <img src={word.imageUrl} alt={word.word} className="w-full h-48 object-contain rounded-xl bg-slate-700/50 p-2"/>}
                           <p><strong>Loại từ:</strong> {wordInfo.partOfSpeech}</p>
                           {wordInfo.gender && <p><strong>Giống:</strong> {wordInfo.gender}</p>}
                           <p><strong>Định nghĩa:</strong> {wordInfo.definition}</p>
                        </>
                    ) : <p>Không thể tải thông tin.</p>}
                </div>
            )}
            {activeTab === 'examples' && (
                <div className="space-y-6">
                    <div>
                        <button onClick={handleGenerateExample} disabled={isExampleLoading} className="text-sm font-semibold text-indigo-400 hover:underline disabled:opacity-50 flex items-center">
                            {isExampleLoading && <RefreshCw className="w-4 h-4 mr-2 animate-spin"/>} Tạo câu ví dụ
                        </button>
                        {exampleSentence && <div className="mt-2 p-3 bg-slate-700/50 rounded-lg">
                            <p className="font-semibold">{exampleSentence}</p>
                            <p className="text-sm text-gray-400">{exampleTranslation}</p>
                        </div>}
                    </div>
                     <div className="space-y-4">
                        <textarea value={userSentence} onChange={e => setUserSentence(e.target.value)} placeholder={`Viết câu của bạn với từ "${word.word}"`} className="w-full p-2 border rounded-lg bg-transparent border-slate-600" rows={2}></textarea>
                        <div className="flex gap-2">
                            <button onClick={handleCheckSentence} disabled={!userSentence.trim() || isCheckingSentence} className="text-sm flex-1 font-semibold text-indigo-400 p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 disabled:opacity-50">Kiểm tra câu</button>
                            <button onClick={handleRewriteSentence} disabled={!userSentence.trim() || isRewriting} className="text-sm flex-1 font-semibold text-purple-400 p-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 disabled:opacity-50">Viết lại câu</button>
                        </div>
                        {isCheckingSentence && <p>Đang kiểm tra...</p>}
                        {sentenceFeedback && <div className="mt-2 p-3 bg-slate-700/50 rounded-lg whitespace-pre-wrap">{sentenceFeedback}</div>}
                        {isRewriting && <p>Đang viết lại...</p>}
                        {rewrittenSentence && <div className="mt-2 p-3 bg-slate-700/50 rounded-lg whitespace-pre-wrap">{rewrittenSentence}</div>}
                    </div>
                </div>
            )}
            {activeTab === 'chat' && (
                <div className="flex flex-col h-full max-h-[60vh]">
                   <div ref={chatContainerRef} className="flex-grow space-y-4 overflow-y-auto pr-2">
                        {chatHistory.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-500 text-white rounded-br-none' : 'bg-slate-700 text-white rounded-bl-none'}`}>{msg.text}</div>
                            </div>
                        ))}
                        {isChatLoading && <div className="flex justify-start"><div className="p-3 rounded-2xl bg-slate-700 rounded-bl-none">...</div></div>}
                   </div>
                   <form onSubmit={handleChatSubmit} className="mt-4 flex gap-2 pt-4 border-t border-slate-600">
                        <input type="text" value={userQuestion} onChange={e => setUserQuestion(e.target.value)} placeholder="Hỏi AI về từ này..." className="flex-grow p-2 border rounded-lg bg-transparent border-slate-600" />
                        <button type="submit" disabled={!userQuestion.trim() || isChatLoading} className="p-2 bg-indigo-500 text-white rounded-lg disabled:bg-indigo-400"><Send className="w-5 h-5"/></button>
                   </form>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default WordInspectorModal;