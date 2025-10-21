import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { Trash2, Search, ImageIcon, Star, ChevronDown, Filter, ArrowUpDown, Download, Upload, ArrowLeft, Loader2 } from 'lucide-react';
import { VocabularyWord, GeneratedWord } from '../types';
import ImageEditModal from './ImageEditModal';
import { useInspector } from '../hooks/useInspector';
import eventBus from '../utils/eventBus';
import { useI18n } from '../hooks/useI18n';

const WordItem: React.FC<{ word: VocabularyWord }> = ({ word }) => {
  const { deleteWord, toggleWordStar, updateWordImage } = useVocabulary();
  const { uiLanguage } = useSettings();
  const { openInspector } = useInspector();
  const [editingWord, setEditingWord] = useState<VocabularyWord | null>(null);

  // State for smooth image loading
  const [isImageLoading, setIsImageLoading] = useState(!!word.imageUrl);

  useEffect(() => {
    // When word.imageUrl changes, reset the loading state.
    // The onLoad handler on the img tag will set it to false when ready.
    setIsImageLoading(!!word.imageUrl);
  }, [word.imageUrl]);

  const handleImageLoad = () => {
    setIsImageLoading(false);
  };

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
            className="w-16 h-16 flex-shrink-0 bg-slate-700/50 rounded-xl flex items-center justify-center text-gray-500 hover:bg-slate-700 transition-colors relative"
            aria-label={`Edit image for ${word.word}`}
          >
            {word.imageUrl ? (
              <>
                {isImageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-700/80 rounded-xl">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                )}
                <img 
                    src={word.imageUrl} 
                    alt={word.word} 
                    className={`w-full h-full object-cover rounded-xl transition-opacity duration-500 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={handleImageLoad}
                    onError={handleImageLoad} // Hide loader on error too
                />
              </>
            ) : (
              <ImageIcon className="w-8 h-8" />
            )}
          </button>
          <div>
            <p className="font-semibold text-white">{word.word}</p>
            <p className="text-sm text-gray-400">{word.translation[uiLanguage]}</p>
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

interface WordListProps {
    onBack: () => void;
}

const WordList: React.FC<WordListProps> = ({ onBack }) => {
  const { words, lastDeletion, undoLastDeletion, addMultipleWords, deleteAllWords } = useVocabulary();
  const { uiLanguage } = useSettings();
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'starred'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'az' | 'za' | 'review'>('newest');
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
            const themeEnName = t(`themes.${themeName}`, {});
            return word.word.toLowerCase().includes(lowerSearch) ||
                   word.translation[uiLanguage].toLowerCase().includes(lowerSearch) ||
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
  }, [words, filter, sort, searchTerm, uiLanguage, t]);
  
  const groupedWords = useMemo(() => {
    if (searchTerm) return null; // No grouping when searching

    const groups = processedWords.reduce((acc, word) => {
        const theme = word.theme || t('word_list.unclassified');
        if (!acc[theme]) {
            acc[theme] = [];
        }
        acc[theme].push(word);
        return acc;
    }, {} as Record<string, VocabularyWord[]>);
    
    return Object.entries(groups);
  }, [processedWords, searchTerm, t]);

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
        `"${w.word.replace(/"/g, '""')}"`,
        `"${w.translation.vietnamese.replace(/"/g, '""')}"`,
        `"${w.translation.english.replace(/"/g, '""')}"`,
        `"${(w.theme || '').replace(/"/g, '""')}"`,
        w.isStarred,
        new Date(w.createdAt).toISOString(),
        `"${(w.imageUrl || '').replace(/"/g, '""')}"`
      ].join(','));
      content = [headers.join(','), ...rows].join('\n');
      filename = 'vocabulary.csv';
      mimeType = 'text/csv;charset=utf-8;';
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
            const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) throw new Error("CSV file is empty or has no data.");
            
            // This regex splits on commas that are not inside quotes.
            const csvRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

            const header = lines[0].split(csvRegex).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
            const dataRows = lines.slice(1);

            const wordIndex = header.indexOf('word');
            const viIndex = header.indexOf('translation_vi');
            const enIndex = header.indexOf('translation_en');
            const themeIndex = header.indexOf('theme');

            if (wordIndex === -1) {
                throw new Error("CSV file must contain a 'word' column.");
            }

            wordsToImport = dataRows.map(line => {
                const values = line.split(csvRegex).map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
                
                const word = values[wordIndex];
                if (!word) return null;

                return {
                    word: word,
                    translation_vi: viIndex > -1 ? (values[viIndex] || '') : '',
                    translation_en: enIndex > -1 ? (values[enIndex] || '') : '',
                    theme: themeIndex > -1 ? (values[themeIndex] || 'Imported') : 'Imported',
                };
            }).filter((w): w is GeneratedWord => w !== null);
        } else {
            throw new Error("Unsupported file format.");
        }
        
        const addedCount = await addMultipleWords(wordsToImport);
        eventBus.dispatch('notification', { type: 'success', message: `Đã nhập thành công ${addedCount} từ mới!` });

      } catch (error: any) {
        console.error("Import failed:", error);
        eventBus.dispatch('notification', { type: 'error', message: `Nhập file thất bại: ${error.message}` });
      } finally {
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

  const renderThemeHeader = (theme: string, count: number) => {
    const translationKey = `themes.${theme}`;
    const translatedTheme = t(translationKey);
    // If translation fails, `t` returns the key. In that case, use the original theme name.
    const displayTheme = translatedTheme === translationKey ? theme : translatedTheme;
    return `${displayTheme} (${count})`;
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Danh sách từ của bạn</h2>
            <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 text-gray-200 font-semibold rounded-xl transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại</span>
            </button>
        </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input ref={importFileRef} type="file" className="hidden" accept=".csv, .json" onChange={handleImport} />
        <button onClick={() => importFileRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 text-sm px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"> <Upload className="w-4 h-4" /> {t('word_list.import')}</button>
        <button onClick={() => handleExport('csv')} className="flex-1 flex items-center justify-center gap-2 text-sm px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"> <Download className="w-4 h-4" /> {t('word_list.export_csv')}</button>
        <button onClick={() => handleExport('json')} className="flex-1 flex items-center justify-center gap-2 text-sm px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"> <Download className="w-4 h-4" /> {t('word_list.export_json')}</button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder={t('word_list.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {renderControl('filter-select', 'Lọc từ', Filter, filter, (e) => setFilter(e.target.value as 'all' | 'starred'), <>
              <option value="all">{t('word_list.filter_all')}</option>
              <option value="starred">{t('word_list.filter_starred')}</option>
          </>)}
          {renderControl('sort-select', 'Sắp xếp từ', ArrowUpDown, sort, (e) => setSort(e.target.value as any), <>
              <option value="newest">{t('word_list.sort_newest')}</option>
              <option value="oldest">{t('word_list.sort_oldest')}</option>
              <option value="az">{t('word_list.sort_az')}</option>
              <option value="za">{t('word_list.sort_za')}</option>
              <option value="review">{t('word_list.sort_review')}</option>
          </>)}
      </div>

      <div className="max-h-[50vh] overflow-y-auto pr-2">
        {processedWords.length > 0 ? (
          groupedWords ? (
            <div className="space-y-4">
              {groupedWords.map(([theme, themeWords]) => (
                <details key={theme} className="group" open={!searchTerm}>
                  <summary className="list-none flex items-center justify-between cursor-pointer p-3 bg-slate-800/60 rounded-xl sticky top-0 backdrop-blur-sm border-b border-slate-700">
                    <h3 className="font-semibold text-white">
                      {renderThemeHeader(theme, themeWords.length)}
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
            {words.length === 0 ? t('word_list.empty_list') : t('word_list.no_match')}
          </p>
        )}
      </div>

      {lastDeletion && (
        <div className="bg-slate-700 text-white rounded-xl shadow-lg flex items-center justify-between p-3 animate-fade-in-up">
            <span>
                {Array.isArray(lastDeletion)
                    ? `Đã xóa ${lastDeletion.length} từ.`
                    : t('word_list.deleted_word', { word: (lastDeletion as VocabularyWord).word })
                }
            </span>
            <button
                onClick={undoLastDeletion}
                className="font-semibold text-indigo-300 hover:underline px-3 py-1 rounded-md hover:bg-slate-600/50"
            >
                {t('word_list.undo')}
            </button>
        </div>
      )}
      
      <div className="pt-4 mt-4 border-t border-slate-700/50">
        <button 
            onClick={deleteAllWords} 
            disabled={words.length === 0}
            className="w-full flex items-center justify-center gap-2 text-sm px-4 py-2 bg-red-900/70 hover:bg-red-800/80 border border-red-700/50 rounded-lg text-red-200 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"> 
            <Trash2 className="w-4 h-4" /> Xóa toàn bộ từ vựng ({words.length})
        </button>
        <p className="text-xs text-center text-gray-500 mt-2">Hành động này có thể hoàn tác trong vài giây.</p>
      </div>
    </div>
  );
};

export default WordList;