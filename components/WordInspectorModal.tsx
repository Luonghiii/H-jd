import React, { useState, useEffect, useRef } from 'react';
import { VocabularyWord, WordInfo, ChatMessage } from '../types';
import { getWordInfo, getChatResponseForWord } from '../services/geminiService';
import { useSettings } from '../hooks/useSettings';
import { useVocabulary } from '../hooks/useVocabulary';
import { X, Bot, User, Send, Loader2, BookCopy, Languages, Tag } from 'lucide-react';

interface WordInspectorModalProps {
  word: VocabularyWord;
  isOpen: boolean;
  onClose: () => void;
}

const WordInspectorModal: React.FC<WordInspectorModalProps> = ({ word, isOpen, onClose }) => {
  const { targetLanguage, learningLanguage } = useSettings();
  const { updateWord, getAvailableThemes } = useVocabulary();
  const [info, setInfo] = useState<WordInfo | null>(null);
  const [isInfoLoading, setIsInfoLoading] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingTheme, setEditingTheme] = useState(word.theme || '');
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const availableThemes = getAvailableThemes();

  useEffect(() => {
    if (!isOpen) return;
    setEditingTheme(word.theme || '');
    const fetchWordInfo = async () => {
      if (!word) return;
      setIsInfoLoading(true);
      setError('');
      setChatHistory([]);
      try {
        const wordInfo = await getWordInfo(word.word, targetLanguage, learningLanguage);
        setInfo(wordInfo);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load word info.');
      } finally {
        setIsInfoLoading(false);
      }
    };
    fetchWordInfo();
  }, [word, targetLanguage, learningLanguage, isOpen]);
  
  useEffect(() => {
    if (chatBodyRef.current) {
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [chatHistory, isChatLoading]);
  
  const handleThemeBlur = () => {
    if (editingTheme !== (word.theme || '')) {
      updateWord(word.id, { theme: editingTheme.trim() || undefined });
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isChatLoading) return;

    const newUserMessage: ChatMessage = { role: 'user', text: userInput };
    setChatHistory(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsChatLoading(true);

    try {
      const responseText = await getChatResponseForWord(word, userInput, chatHistory, targetLanguage, learningLanguage);
      const newModelMessage: ChatMessage = { role: 'model', text: responseText };
      setChatHistory(prev => [...prev, newModelMessage]);
    } catch (e) {
      const errorMessage: ChatMessage = { role: 'model', text: 'Sorry, I encountered an error.' };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-600 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Phân tích từ: <span className="text-cyan-300">{word.word}</span></h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-slate-700 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-4 space-y-3 bg-slate-800/50 flex-shrink-0">
            {isInfoLoading ? (
                <div className="flex items-center justify-center h-20">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                </div>
            ) : error ? (
                <p className="text-red-400 text-center">{error}</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                      <Languages className="w-5 h-5 mt-1 text-gray-400 flex-shrink-0"/>
                      <div>
                          <p className="text-sm text-gray-400">Nghĩa</p>
                          <p className="font-semibold text-white">{word.translation[targetLanguage]}</p>
                      </div>
                  </div>
                  <div className="flex items-start gap-3">
                      <BookCopy className="w-5 h-5 mt-1 text-gray-400 flex-shrink-0"/>
                      <div>
                          <p className="text-sm text-gray-400">Loại từ</p>
                          <p className="font-semibold text-white">
                            {info?.partOfSpeech} {info?.gender && `(${info.gender})`}
                          </p>
                      </div>
                  </div>
                  <div className="flex items-start gap-3 md:col-span-2">
                      <Tag className="w-5 h-5 mt-1 text-gray-400 flex-shrink-0"/>
                      <div className="w-full">
                          <p className="text-sm text-gray-400">Chủ đề</p>
                          <input
                            type="text"
                            list="inspector-themes"
                            value={editingTheme}
                            onChange={(e) => setEditingTheme(e.target.value)}
                            onBlur={handleThemeBlur}
                            placeholder="Thêm chủ đề"
                            className="w-full bg-transparent border-b border-slate-600 focus:border-indigo-500 text-white font-semibold focus:outline-none"
                           />
                           <datalist id="inspector-themes">
                                {availableThemes.map(t => <option key={t} value={t} />)}
                           </datalist>
                      </div>
                  </div>
                </div>
            )}
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-4" ref={chatBodyRef}>
            {chatHistory.length === 0 && !isChatLoading && (
                <div className="text-center text-gray-500 pt-8">
                    <p>Hỏi AI bất cứ điều gì về từ này!</p>
                    <p className="text-sm">Ví dụ: "Give me another example sentence."</p>
                </div>
            )}
            {chatHistory.map((msg, index) => (
                <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0"><Bot className="w-5 h-5 text-white"/></div>}
                    <div className={`max-w-xs md:max-w-md p-3 rounded-xl text-white ${msg.role === 'user' ? 'bg-slate-600' : 'bg-slate-700'}`}>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                    {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0"><User className="w-5 h-5 text-white"/></div>}
                </div>
            ))}
            {isChatLoading && (
                 <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0"><Bot className="w-5 h-5 text-white"/></div>
                    <div className="max-w-xs md:max-w-md p-3 rounded-xl text-white bg-slate-700">
                        <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                </div>
            )}
        </div>

        <div className="p-4 border-t border-slate-600 flex-shrink-0">
          <form onSubmit={handleChatSubmit} className="flex items-center gap-3">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Hỏi thêm về từ này..."
              className="flex-grow w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isInfoLoading}
            />
            <button
              type="submit"
              disabled={!userInput.trim() || isChatLoading}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-full transition-transform duration-200 active:scale-90 disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WordInspectorModal;