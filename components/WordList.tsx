import React, { useState, useMemo, useRef } from 'react';
import { useVocabulary, themeTranslationMap } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { Trash2, Search, ImageIcon, Sparkles, Star, ChevronDown, Filter, ArrowUpDown, Download, Upload } from 'lucide-react';
import { VocabularyWord, GeneratedWord } from '../types';
import ImageEditModal from './ImageEditModal';
import { generateImageForWord } from '../services/geminiService';
import { useInspector } from '../hooks/useInspector';
import eventBus from '../utils/eventBus';

const WordItem: React.FC<{ word: VocabularyWord }> = ({ word }) => {
  const { deleteWord, toggleWordStar, updateWordImage } = useVocabulary();
  const { targetLanguage } = useSettings();
  const { openInspector } = useInspector();
  const [editingWord, setEditingWord] = useState<VocabularyWord | null>(null);

  const handleSaveImage = (wordId: string, imageUrl: string) => {
    updateWordImage(wordId, imageUrl);
    setEditingWord(null);
  };
  
  const handleRemoveImage = (wordId: string) => {
    updateWordImage(wordId, null);
    setEditingWord(null);
  };

  return (
    <>
      <li className={`flex items-center bg-slate-800/50 p-3 rounded-2xl border transition-all duration-200 hover:border-slate-600 hover:scale-[1.02] ${word.isStarred ? 'border-yellow-500/50' : 'border-slate-700'}`}>
        <div 
          className="flex items-center gap-4 flex-grow cursor-pointer"
          onClick={() => openInspector(word)}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); setEditingWord(word); }}
            className="w-16 h-16 flex-shrink-0 bg-slate-700/50 rounded-xl flex items-center justify-center text-gray-500 hover:bg-slate-700 transition-colors"
            aria-label={`Edit image for ${word.word}`}
          >
            {word.imageUrl ? (
              <img src={word.imageUrl} alt={word.word} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <ImageIcon className="w-8 h-8" />
            )}
          </button>
          <div>
            <p className="font-semibold text-white">{word.word}</p>
            <p className="text-sm text-gray-400">{word.translation[targetLanguage]}</p>
          </div>
        </div>
        <div className="flex items-center flex-shrink-0 ml-2">
            <button
              onClick={(e) => { e.stopPropagation(); toggleWordStar(word.id); }}
              className={`p-2 rounded-full transition duration-300 ${word.isStarred ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10'}`}
              aria-label={`Star ${word.word}`}
            >
              <Star className="w-5 h-5" fill={word.isStarred ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteWord(word.id);
              }}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition duration-300 flex-shrink-0"
              aria-label={`Delete ${word.word}`}
            >
              <Trash2 className="w-5 h-5" />
            </button>
        </div>
      </li>
      {editingWord && (
        <ImageEditModal 
            isOpen={!!editingWord}
            word={editingWord}
            onClose={() => setEditingWord(null)}
            onSave={handleSaveImage}
            onRemove={handleRemoveImage}
        />
      )}
    </>
  );
};

const WordList: React.FC = () => {
  const { words, lastDeletedWord, undoDelete, updateWordImage, addMultipleWords } = useVocabulary();
  const { targetLanguage } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'starred'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'az' | 'za' | 'review'>('newest');
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const importFileRef = useRef<HTMLInputElement>(null);

  const processedWords = useMemo(() => {
    let processed = [...words];

    // 1. Filter
    if (filter === 'starred') {
        processed = processed.filter(word => word.isStarred);
    }
    
    if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        processed = processed.filter(word => {
            const themeName = word.theme || '';
            const themeEnName = themeTranslationMap[themeName] || '';
            return word.word.toLowerCase().includes(lowerSearch) ||
                   word.translation[targetLanguage].toLowerCase().includes(lowerSearch) ||
                   themeName.toLowerCase().includes(lowerSearch) ||
                   themeEnName.toLowerCase().includes(lowerSearch)
        });
    }

    // 2. Sort
    switch (sort) {
        case 'oldest':
            processed.sort((a, b) => a.createdAt - b.createdAt);
            break;
        case 'az':
            processed.sort((a, b) => a.word.localeCompare(b.word));
            break;
        case 'za':
            processed.sort((a, b) => b.word.localeCompare(a.word));
            break;
        case 'review':
             processed.sort((a, b) => a.nextReview - b.nextReview);
            break;
        case 'newest':
        default:
            processed.sort((a, b) => b.createdAt - a.createdAt);
            break;
    }

    return processed;
  }, [words, filter, sort, searchTerm, targetLanguage]);
  
  const groupedWords = useMemo(() => {
    if (searchTerm) return null; // No grouping when searching

    const groups = processedWords.reduce((acc, word) => {
        const theme = word.theme || 'Chưa phân loại';
        if (!acc[theme]) {
            acc[theme] = [];
        }
        acc[theme].push(word);
        return acc;
    }, {} as Record<string, VocabularyWord[]>);
    
    return Object.entries(groups);
  }, [processedWords, searchTerm]);
  
  const wordsWithoutImages = useMemo(() => words.filter(w => !w.imageUrl), [words]);

  const handleGenerateAllImages = async () => {
    if (wordsWithoutImages.length === 0 || isBatchGenerating) return;

    setIsBatchGenerating(true);
    setBatchProgress({ current: 0, total: wordsWithoutImages.length });

    let current = 0;
    for (const word of wordsWithoutImages) {
        try {
            await new Promise(resolve => setTimeout(resolve, 500)); 
            const imageUrl = await generateImageForWord(word.word);
            updateWordImage(word.id, imageUrl);
        } catch (error) {
            console.error(`Failed to generate image for "${word.word}":`, error);
        }
        current++;
        setBatchProgress(prev => ({ ...prev, current }));
    }

    setIsBatchGenerating(false);
  };

  const handleExport = (format: 'csv' | 'json') => {
    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'json') {
      const exportData = words.map(({ id, srsLevel, nextReview, ...rest }) => rest);
      content = JSON.stringify(exportData, null, 2);
      filename = 'vocabulary.json';
      mimeType = 'application/json';
    } else { // csv
      const headers = ['word', 'translation_vi', 'translation_en', 'theme', 'isStarred', 'createdAt', 'imageUrl'];
      const rows = words.map(w => [
        `"${w.word}"`,
        `"${w.translation.vietnamese}"`,
        `"${w.translation.english}"`,
        `"${w.theme || ''}"`,
        w.isStarred,
        new Date(w.createdAt).toISOString(),
        `"${w.imageUrl || ''}"`
      ].join(','));
      content = [headers.join(','), ...rows].join('\n');
      filename = 'vocabulary.csv';
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        let wordsToImport: GeneratedWord[] = [];

        if (file.name.endsWith('.json')) {
          const data = JSON.parse(content);
          wordsToImport = data.map((item: any) => ({
            word: item.word,
            translation_vi: item.translation?.vietnamese || item.translation_vi || '',
            translation_en: item.translation?.english || item.translation_en || '',
            theme: item.theme || 'Imported',
          }));
        } else if (file.name.endsWith('.csv')) {
            const lines = content.split('\n').slice(1); // Skip header
            wordsToImport = lines.map(line => {
                const values = line.split(',');
                return {
                    word: values[0]?.replace(/"/g, ''),
                    translation_vi: values[1]?.replace(/"/g, ''),
                    translation_en: values[2]?.replace(/"/g, ''),
                    theme: values[3]?.replace(/"/g, '') || 'Imported',
                };
            }).filter(w => w.word); // Filter out empty lines
        } else {
            throw new Error("Unsupported file format.");
        }
        
        const addedCount = await addMultipleWords(wordsToImport);
        eventBus.dispatch('notification', { type: 'success', message: `Đã nhập thành công ${addedCount} từ mới!` });

      } catch (error) {
        console.error("Import failed:", error);
        eventBus.dispatch('notification', { type: 'error', message: `Nhập file thất bại. Vui lòng kiểm tra định dạng file.` });
      } finally {
        // Reset file input
        if (importFileRef.current) {
            importFileRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };
  
  const renderControl = (id: string, label: string, icon: React.ElementType, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, children: React.ReactNode) => {
    const Icon = icon;
    return (
        <div className="relative">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <select
                id={id}
                aria-label={label}
                value={value}
                onChange={onChange}
                className="w-full appearance-none pl-9 pr-8 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                {children}
            </select>
        </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Danh sách từ của bạn</h2>
        <p className="text-gray-400 mt-1">Bạn đã lưu {words.length} từ.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input ref={importFileRef} type="file" className="hidden" accept=".csv, .json" onChange={handleImport} />
        <button onClick={() => importFileRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 text-sm px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"> <Upload className="w-4 h-4" /> Nhập</button>
        <button onClick={() => handleExport('csv')} className="flex-1 flex items-center justify-center gap-2 text-sm px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"> <Download className="w-4 h-4" /> Xuất CSV</button>
        <button onClick={() => handleExport('json')} className="flex-1 flex items-center justify-center gap-2 text-sm px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"> <Download className="w-4 h-4" /> Xuất JSON</button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Tìm kiếm từ hoặc chủ đề..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {renderControl('filter-select', 'Lọc từ', Filter, filter, (e) => setFilter(e.target.value as 'all' | 'starred'), <>
              <option value="all">Tất cả từ</option>
              <option value="starred">Đã gắn sao</option>
          </>)}
          {renderControl('sort-select', 'Sắp xếp từ', ArrowUpDown, sort, (e) => setSort(e.target.value as any), <>
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="az">A-Z</option>
              <option value="za">Z-A</option>
              <option value="review">Cần ôn tập</option>
          </>)}
      </div>

      <button
          onClick={handleGenerateAllImages}
          disabled={isBatchGenerating || wordsWithoutImages.length === 0}
          className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600/50 hover:bg-indigo-600 text-indigo-200 hover:text-white font-semibold rounded-xl transition-all duration-200 disabled:bg-slate-700 disabled:text-gray-400 disabled:cursor-not-allowed"
          title={isBatchGenerating ? 'Đang trong tiến trình...' : 'Tạo ảnh cho tất cả các từ còn thiếu'}
      >
          <Sparkles className={`w-4 h-4 mr-2 ${isBatchGenerating ? 'animate-spin' : ''}`} />
          <span>Tạo ảnh còn thiếu ({wordsWithoutImages.length})</span>
      </button>

      {isBatchGenerating && (
        <div className="text-center text-gray-300">
            <p>Đang tạo ảnh... ({batchProgress.current} / {batchProgress.total})</p>
            <div className="w-full bg-slate-700 rounded-full h-2.5 mt-2 overflow-hidden">
                <div 
                    className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%` }}
                ></div>
            </div>
        </div>
      )}

      <div className="max-h-[50vh] overflow-y-auto pr-2">
        {processedWords.length > 0 ? (
          groupedWords ? (
            <div className="space-y-4">
              {groupedWords.map(([theme, themeWords]) => (
                <details key={theme} className="group" open={!searchTerm}>
                  <summary className="list-none flex items-center justify-between cursor-pointer p-3 bg-slate-800/60 rounded-xl sticky top-0 backdrop-blur-sm border-b border-slate-700">
                    <h3 className="font-semibold text-white">
                      {targetLanguage === 'english' ? (themeTranslationMap[theme] || theme) : theme} ({themeWords.length})
                    </h3>
                    <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform"/>
                  </summary>
                  <ul className="space-y-3 mt-2">
                     {themeWords.map(word => <WordItem key={word.id} word={word} />)}
                  </ul>
                </details>
              ))}
            </div>
          ) : (
            <ul className="space-y-3">
              {processedWords.map(word => <WordItem key={word.id} word={word} />)}
            </ul>
          )
        ) : (
          <p className="text-center text-gray-400 py-8">
            {words.length === 0 ? "Danh sách từ của bạn trống. Hãy thêm từ để bắt đầu!" : "Không có từ nào khớp với lựa chọn của bạn."}
          </p>
        )}
      </div>

      {lastDeletedWord && (
        <div className="bg-slate-700 text-white rounded-xl shadow-lg flex items-center justify-between p-3 animate-fade-in-up">
            <span>Đã xóa từ <strong>"{lastDeletedWord.word.word}"</strong></span>
            <button
                onClick={undoDelete}
                className="font-semibold text-indigo-300 hover:underline px-3 py-1 rounded-md hover:bg-slate-600/50"
            >
                Hoàn tác
            </button>
        </div>
      )}
    </div>
  );
};

export default WordList;