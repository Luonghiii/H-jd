import React, { useState, useEffect, useRef } from 'react';
import { VocabularyWord, WordInfo, ChatMessage } from '../types';
import { useSettings } from '../hooks/useSettings';
import { getWordInfo, generateSentence, checkSentence, rewriteSentence, getChatResponseForWord, generateSpeech } from '../services/geminiService';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useHistory } from '../hooks/useHistory';
import { X, Info, MessageSquare, BookOpen, Send, RefreshCw, Volume2, Loader2, Edit, Save, PlusCircle } from 'lucide-react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useInspector, useQuickTranslate } from '../hooks/useInspector';
import eventBus from '../utils/eventBus';

export const QuickTranslateModal: React.FC = () => {
    const { data, closeQuickTranslate } = useQuickTranslate();
    const { addWord } = useVocabulary();
    const { uiLanguage } = useSettings();
    const modalRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({});
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                closeQuickTranslate();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [closeQuickTranslate]);

    useEffect(() => {
        if (data) {
            setIsAdding(false); // Reset on new word
            if (modalRef.current) {
                const rect = modalRef.current.getBoundingClientRect();
                let left = data.position.left;
                if (left + rect.width > window.innerWidth) {
                    left = window.innerWidth - rect.width - 16;
                }
                if (left < 16) {
                    left = 16;
                }
                setStyle({
                    position: 'absolute',
                    top: `${data.position.top + 8}px`,
                    left: `${left}px`,
                });
            } else {
                 setStyle({
                    position: 'absolute',
                    top: `${data.position.top + 8}px`,
                    left: `${data.position.left}px`,
                    opacity: 0, // Render invisible first to measure
                });
            }
        }
    }, [data]);
    
    if (!data) return null;

    const handleAdd = async () => {
        if (data.isLoading || isAdding) return;
        setIsAdding(true);
        const success = await addWord(data.word, data.translation, uiLanguage, data.theme);
        if (success) {
            eventBus.dispatch('notification', { type: 'success', message: `Đã thêm từ "${data.word}"!` });
        }
        setIsAdding(false);
        closeQuickTranslate();
    };

    return (
        <div
            ref={modalRef}
            style={style}
            className="fixed z-[999] bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl p-4 w-72 animate-fade-in-up"
        >
            {data.isLoading ? (
                <div className="flex items-center justify-center h-24">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex justify-between items-start">
                        <p className="font-bold text-white text-lg">{data.word}</p>
                        <button onClick={closeQuickTranslate} className="-mt-2 -mr-2 p-1 text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                    {data.translation !== 'Lỗi phân tích' ? (
                        <>
                            <p className="text-gray-300 text-base">{data.translation}</p>
                            <div className="text-sm space-y-1 border-t border-slate-700 pt-2">
                                <div className="flex justify-between text-gray-400">
                                    <span>Từ loại:</span>
                                    <span className="font-semibold text-gray-200">{data.partOfSpeech}</span>
                                </div>
                                <div className="flex justify-between text-gray-400">
                                    <span>Chủ đề:</span>
                                    <span className="font-semibold text-gray-200">{data.theme}</span>
                                </div>
                            </div>
                            <button onClick={handleAdd} disabled={isAdding} className="w-full flex items-center justify-center gap-2 text-sm px-2 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold disabled:bg-indigo-500/50 disabled:cursor-wait">
                                {isAdding ? (
                                    <Loader2 className="w-4 h-4 animate-spin"/>
                                ) : (
                                    <><PlusCircle className="w-4 h-4"/> Thêm vào từ vựng</>
                                )}
                            </button>
                        </>
                    ) : (
                        <p className="text-red-400 text-center py-4">{data.translation}</p>
                    )}
                </div>
            )}
        </div>
    );
};


interface WordInspectorModalProps {
  isOpen: boolean;
  word: VocabularyWord;
  onClose: () => void;
}

type Tab = 'info' | 'examples' | 'chat';

const WordInspectorModal: React.FC<WordInspectorModalProps> = ({ isOpen, word, onClose }) => {
  const { uiLanguage, learningLanguage } = useSettings();
  const { updateWord, updateWordSpeechAudio } = useVocabulary();
  const { updateInspectingWord } = useInspector();

  const [activeTab, setActiveTab] = useState<Tab>('info');
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editableWord, setEditableWord] = useState('');
  const [editableTranslationVI, setEditableTranslationVI] = useState('');
  const [editableTranslationEN, setEditableTranslationEN] = useState('');
  const [editableTheme, setEditableTheme] = useState('');

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

  // Audio state
  const { play, isPlaying: isAudioPlaying } = useAudioPlayer();
  const { addHistoryEntry } = useHistory();
  const [isSpeechLoading, setIsSpeechLoading] = useState(false);

  const setEditableStateFromWord = (w: VocabularyWord) => {
    setEditableWord(w.word);
    setEditableTranslationVI(w.translation.vietnamese);
    setEditableTranslationEN(w.translation.english);
    setEditableTheme(w.theme || '');
  };

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens or word changes
      setActiveTab('info');
      setWordInfo(null);
      setExampleSentence('');
      setExampleTranslation('');
      setChatHistory([]);
      setUserSentence('');
      setSentenceFeedback('');
      setRewrittenSentence('');
      setIsEditing(false);
      setEditableStateFromWord(word);
    }
  }, [isOpen, word]);

  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);
  
  useEffect(() => {
    if (isOpen && activeTab === 'info') {
      const fetchInfo = async () => {
        setIsInfoLoading(true);
        try {
          const info = await getWordInfo(word.word, uiLanguage, learningLanguage);
          setWordInfo(info);
        } catch (error) {
          console.error("Failed to fetch word info:", error);
          setWordInfo({ partOfSpeech: 'Lỗi', definition: 'Không thể tải thông tin từ AI.' });
        }
        setIsInfoLoading(false);
      };
      fetchInfo();
    }
  }, [isOpen, activeTab, word, uiLanguage, learningLanguage]);

  const handlePlaySpeech = async () => {
      if (isSpeechLoading || isAudioPlaying) return;

      if (word.speechAudio) {
        await play(word.speechAudio);
        return;
      }

      setIsSpeechLoading(true);
      try {
          const audioB64 = await generateSpeech(word.word, learningLanguage);
          await updateWordSpeechAudio(word.id, audioB64);
          // Update the local state of the word in the modal so it plays instantly next time
          updateInspectingWord({ ...word, speechAudio: audioB64 });
          await play(audioB64);
          addHistoryEntry('SPEECH_GENERATED', `Phát âm từ "${word.word}".`, { word: word.word });
      } catch (error) {
          console.error("Failed to generate/play speech", error);
          eventBus.dispatch('notification', { type: 'error', message: 'Không thể tạo âm thanh.' });
      }
      setIsSpeechLoading(false);
  }

  const handleGenerateExample = async () => {
    setIsExampleLoading(true);
    const result = await generateSentence(word, uiLanguage, learningLanguage);
    const parts = result.split('---Translation---');
    setExampleSentence(parts[0].trim());
    setExampleTranslation(parts.length > 1 ? parts[1].trim() : '');
    setIsExampleLoading(false);
  };

  const handleCheckSentence = async () => {
    if (!userSentence.trim()) return;
    setIsCheckingSentence(true);
    const feedback = await checkSentence(userSentence, word.word, uiLanguage, learningLanguage);
    setSentenceFeedback(feedback);
    setIsCheckingSentence(false);
  };
  
  const handleRewriteSentence = async () => {
    if (!userSentence.trim()) return;
    setIsRewriting(true);
    const result = await rewriteSentence(userSentence, word.word, uiLanguage, learningLanguage);
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

    const response = await getChatResponseForWord(word, userQuestion, newHistory, uiLanguage, learningLanguage);
    setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    setIsChatLoading(false);
  }

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditableStateFromWord(word);
  };

  const handleSave = async () => {
      const updates: Partial<VocabularyWord> = {
          word: editableWord.trim(),
          translation: {
              vietnamese: editableTranslationVI.trim(),
              english: editableTranslationEN.trim(),
          },
          theme: editableTheme.trim(),
      };
      
      if (!updates.theme) {
          delete updates.theme;
      }

      await updateWord(word.id, updates);

      const updatedInspectingWord: VocabularyWord = {
          ...word,
          ...updates,
          translation: updates.translation!,
      };
      if (!updates.theme) {
          delete updatedInspectingWord.theme;
      }

      updateInspectingWord(updatedInspectingWord);
      setIsEditing(false);
  };

  if (!isOpen) return null;

  const hasValidInfo = wordInfo && wordInfo.partOfSpeech && wordInfo.partOfSpeech !== 'N/A' && wordInfo.partOfSpeech !== 'Lỗi';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 sm:p-6 flex-shrink-0 border-b border-slate-600">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      {word.word}
                      <button onClick={handlePlaySpeech} disabled={isSpeechLoading || isAudioPlaying} className="p-1 text-gray-400 hover:text-white disabled:opacity-50">
                          {isSpeechLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Volume2 className="w-5 h-5"/>}
                      </button>
                    </h2>
                    <p className="text-gray-400">{word.translation[uiLanguage]}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="p-2 text-gray-400 hover:bg-slate-700 rounded-full" title="Sửa từ">
                      <Edit className="w-5 h-5" />
                    </button>
                  )}
                  <button onClick={onClose} className="p-2 text-gray-400 hover:bg-slate-700 rounded-full">
                      <X className="w-5 h-5" />
                  </button>
                </div>
            </div>
            <div className="mt-4 flex border-b border-slate-700">
                <button onClick={() => setActiveTab('info')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'info' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-gray-200'}`}><Info className="w-4 h-4 inline mr-1"/> Thông tin</button>
                <button onClick={() => setActiveTab('examples')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'examples' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-gray-200'}`}><BookOpen className="w-4 h-4 inline mr-1"/> Ví dụ</button>
                <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'chat' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-gray-200'}`}><MessageSquare className="w-4 h-4 inline mr-1"/> Hỏi đáp</button>
            </div>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto">
            {activeTab === 'info' && (
                isEditing ? (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                        <label className="text-sm font-medium text-gray-400">Từ</label>
                        <input type="text" value={editableWord} onChange={e => setEditableWord(e.target.value)} className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-400">Nghĩa Tiếng Việt</label>
                        <input type="text" value={editableTranslationVI} onChange={e => setEditableTranslationVI(e.target.value)} className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-400">Nghĩa Tiếng Anh</label>
                        <input type="text" value={editableTranslationEN} onChange={e => setEditableTranslationEN(e.target.value)} className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-400">Chủ đề</label>
                        <input type="text" value={editableTheme} onChange={e => setEditableTheme(e.target.value)} className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-gray-300">
                      {isInfoLoading ? <p>Đang tải thông tin...</p> : hasValidInfo ? (
                          <>
                            {word.imageUrl && <img src={word.imageUrl} alt={word.word} className="w-full h-48 object-contain rounded-xl bg-slate-700/50 p-2"/>}
                            {word.theme && <p><strong className="text-white font-semibold">Chủ đề:</strong> {word.theme}</p>}
                            <p><strong className="text-white font-semibold">Loại từ:</strong> {wordInfo.partOfSpeech}</p>
                            {wordInfo.gender && <p><strong className="text-white font-semibold">Giống:</strong> {wordInfo.gender}</p>}
                            <p><strong className="text-white font-semibold">Định nghĩa:</strong> {wordInfo.definition}</p>
                          </>
                      ) : <p>Không thể tải thông tin.</p>}
                  </div>
                )
            )}
            {activeTab === 'examples' && (
                <div className="space-y-6">
                    <div>
                        <button onClick={handleGenerateExample} disabled={isExampleLoading} className="text-sm font-semibold text-indigo-400 hover:underline disabled:opacity-50 flex items-center">
                            {isExampleLoading && <RefreshCw className="w-4 h-4 mr-2 animate-spin"/>} Tạo câu ví dụ
                        </button>
                        {exampleSentence && <div className="mt-2 p-3 bg-slate-700/50 rounded-lg">
                            <p className="font-semibold text-white">{exampleSentence}</p>
                            <p className="text-sm text-gray-400">{exampleTranslation}</p>
                        </div>}
                    </div>
                     <div className="space-y-4">
                        <textarea value={userSentence} onChange={e => setUserSentence(e.target.value)} placeholder={`Viết câu của bạn với từ "${word.word}"`} className="w-full p-2 border rounded-lg bg-transparent border-slate-600" rows={2}></textarea>
                        <div className="flex gap-2">
                            <button onClick={handleCheckSentence} disabled={!userSentence.trim() || isCheckingSentence} className="text-sm flex-1 font-semibold text-indigo-400 p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 disabled:opacity-50">Kiểm tra câu</button>
                            <button onClick={handleRewriteSentence} disabled={!userSentence.trim() || isRewriting} className="text-sm flex-1 font-semibold text-purple-400 p-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 disabled:opacity-50">Viết lại câu</button>
                        </div>
                        {isCheckingSentence && <p className="text-gray-400">Đang kiểm tra...</p>}
                        {sentenceFeedback && <div className="mt-2 p-3 bg-slate-700/50 rounded-lg whitespace-pre-wrap text-gray-300">{sentenceFeedback}</div>}
                        {isRewriting && <p className="text-gray-400">Đang viết lại...</p>}
                        {rewrittenSentence && <div className="mt-2 p-3 bg-slate-700/50 rounded-lg whitespace-pre-wrap text-gray-300">{rewrittenSentence}</div>}
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
        {isEditing && (
            <div className="p-4 flex-shrink-0 border-t border-slate-600 flex justify-end gap-3">
                <button onClick={handleCancelEdit} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 font-semibold rounded-lg">Hủy</button>
                <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 font-semibold rounded-lg">
                    <Save className="w-4 h-4" /> Lưu thay đổi
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default WordInspectorModal;
