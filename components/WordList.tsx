import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useSettings } from '../hooks/useSettings';
import { Trash2, Search, Star, ChevronDown, ArrowUpDown, Download, Upload, ArrowLeft, CheckSquare, ListPlus, Edit, Share2, Check } from 'lucide-react';
import { VocabularyWord, GeneratedWord, StudySet } from '../types';
import { useInspector } from '../hooks/useInspector';
import eventBus from '../utils/eventBus';
import { useI18n } from '../hooks/useI18n';
import ShareStudySetModal from './ShareStudySetModal';

const WordItem: React.FC<{ 
  word: VocabularyWord,
  selectionMode: boolean,
  isSelected: boolean,
  onToggleSelect: (id: string) => void
}> = ({ word, selectionMode, isSelected, onToggleSelect }) => {
  const { deleteWord, toggleWordStar } = useVocabulary();
  const { uiLanguage } = useSettings();
  const { openInspector } = useInspector();

  const mainContent = (
    <div onClick={() => !selectionMode && openInspector(word)} className={`flex-grow ${selectionMode ? '' : 'cursor-pointer'}`}>
      <p className="font-semibold text-white">{word.word}</p>
      <p className="text-sm text-gray-400">{word.translation[uiLanguage]}</p>
    </div>
  );

  return (
    <li 
      className={`flex items-center bg-slate-800/50 p-3 rounded-2xl border transition-all duration-200 ${selectionMode ? 'hover:bg-slate-700/60 cursor-pointer' : 'hover:border-slate-600 hover:scale-[1.01]'} ${isSelected ? 'border-indigo-500 bg-indigo-900/30' : (word.isStarred ? 'border-yellow-500/50' : 'border-slate-700')}`}
      onClick={() => selectionMode && onToggleSelect(word.id)}
    >
      {selectionMode ? (
        <div className="flex items-center gap-3 flex-grow">
          <div className={`w-6 h-6 flex-shrink-0 rounded-md flex items-center justify-center border-2 ${isSelected ? 'bg-indigo-500 border-indigo-400' : 'border-slate-500'}`}>
            {isSelected && <Check className="w-5 h-5 text-white" />}
          </div>
          {mainContent}
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-grow">
          {mainContent}
        </div>
      )}
      <div className="flex items-center flex-shrink-0 ml-2">
        {!selectionMode && (
          <>
            <button onClick={(e) => { e.stopPropagation(); toggleWordStar(word.id); }} className={`p-2 rounded-full transition duration-300 ${word.isStarred ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10'}`} aria-label={`Star ${word.word}`}>
              <Star className="w-5 h-5" fill={word.isStarred ? 'currentColor' : 'none'} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); deleteWord(word.id); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition duration-300 flex-shrink-0" aria-label={`Delete ${word.word}`}>
              <Trash2 className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </li>
  );
};


interface WordListProps {
    onBack: () => void;
}

const WordList: React.FC<WordListProps> = ({ onBack }) => {
  const { words, lastDeletion, undoLastDeletion, addMultipleWords, deleteAllWords } = useVocabulary();
  const { uiLanguage, studySets, createStudySet, deleteStudySet, updateStudySet, batchCreateStudySets } = useSettings();
  const { t } = useI18n();
  
  const [activeTab, setActiveTab] = useState<'themes' | 'studySets'>('themes');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSetNameModal, setShowSetNameModal] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  
  const [editingSet, setEditingSet] = useState<StudySet | null>(null);
  const [renamingSet, setRenamingSet] = useState<{ id: string; name: string } | null>(null);
  const [sharingSet, setSharingSet] = useState<StudySet | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'az' | 'za' | 'review'>('newest');
  const importFileRef = useRef<HTMLInputElement>(null);
  const studySetImportFileRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (editingSet) {
      setSelectionMode(true);
      setSelectedIds(new Set(editingSet.wordIds));
      setActiveTab('themes');
    } else {
      setSelectionMode(false);
      setSelectedIds(new Set());
    }
  }, [editingSet]);
  
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        return newSet;
    });
  };

  const handleCreateSet = async () => {
    if (newSetName.trim() && selectedIds.size > 0) {
        await createStudySet(newSetName.trim(), Array.from(selectedIds));
        setShowSetNameModal(false);
        setNewSetName('');
        setSelectionMode(false);
        setSelectedIds(new Set());
        eventBus.dispatch('notification', { type: 'success', message: `Đã tạo bộ từ học "${newSetName.trim()}"!` });
    }
  };

  const handleSaveChanges = async () => {
    if (editingSet) {
      await updateStudySet(editingSet.id, { wordIds: Array.from(selectedIds) });
      eventBus.dispatch('notification', { type: 'success', message: `Đã cập nhật bộ "${editingSet.name}"!` });
      setEditingSet(null);
    }
  };

  const handleRenameSet = async () => {
    if (renamingSet && renamingSet.name.trim()) {
      await updateStudySet(renamingSet.id, { name: renamingSet.name.trim() });
      eventBus.dispatch('notification', { type: 'success', message: `Đã đổi tên thành "${renamingSet.name.trim()}"!` });
    }
    setRenamingSet(null);
  };
  
  const handleCancelSelection = () => {
    setSelectionMode(false);
    setEditingSet(null);
    setSelectedIds(new Set());
  };

  const processedWordsForDisplay = useMemo(() => {
    let processed = [...words];

    if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        processed = processed.filter(word => {
            const themeName = word.theme || '';
            const themeEnName = t(`themes.${themeName}`, {});
            return word.word.toLowerCase().includes(lowerSearch) || word.translation[uiLanguage].toLowerCase().includes(lowerSearch) || themeName.toLowerCase().includes(lowerSearch) || themeEnName.toLowerCase().includes(lowerSearch);
        });
    }

    switch (sort) {
        case 'oldest': processed.sort((a, b) => a.createdAt - b.createdAt); break;
        case 'az': processed.sort((a, b) => a.word.localeCompare(b.word)); break;
        case 'za': processed.sort((a, b) => b.word.localeCompare(a.word)); break;
        case 'review': processed.sort((a, b) => a.nextReview - b.nextReview); break;
        default: processed.sort((a, b) => b.createdAt - a.createdAt); break;
    }
    return processed;
  }, [words, sort, searchTerm, uiLanguage, t]);

  const { starredWords, groupedWords } = useMemo(() => {
    if (searchTerm) {
        return { starredWords: [], groupedWords: null };
    }

    const starred: VocabularyWord[] = [];
    const regular: VocabularyWord[] = [];
    processedWordsForDisplay.forEach(word => {
        if (word.isStarred) {
            starred.push(word);
        } else {
            regular.push(word);
        }
    });
    
    const groups = regular.reduce((acc, word) => {
        const theme = word.theme || t('word_list.unclassified');
        if (!acc[theme]) acc[theme] = [];
        acc[theme].push(word);
        return acc;
    }, {} as Record<string, VocabularyWord[]>);

    return { starredWords: starred, groupedWords: Object.entries(groups) };
  }, [processedWordsForDisplay, searchTerm, t]);


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
      const headers = ['word', 'translation_vi', 'translation_en', 'theme', 'isStarred', 'createdAt'];
      const rows = words.map(w => [`"${w.word.replace(/"/g, '""')}"`, `"${w.translation.vietnamese.replace(/"/g, '""')}"`, `"${w.translation.english.replace(/"/g, '""')}"`, `"${(w.theme || '').replace(/"/g, '""')}"`, w.isStarred, new Date(w.createdAt).toISOString()].join(','));
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
          wordsToImport = data.map((item: any) => ({ word: item.word, translation_vi: item.translation?.vietnamese || item.translation_vi || '', translation_en: item.translation?.english || item.translation_en || '', theme: item.theme || 'Imported' }));
        } else if (file.name.endsWith('.csv')) {
            const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) throw new Error("CSV file is empty or has no data.");
            const csvRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
            const header = lines[0].split(csvRegex).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
            const dataRows = lines.slice(1);
            const wordIndex = header.indexOf('word');
            if (wordIndex === -1) throw new Error("CSV file must contain a 'word' column.");
            wordsToImport = dataRows.map(line => {
                const values = line.split(csvRegex).map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
                const word = values[wordIndex];
                if (!word) return null;
                return { word, translation_vi: values[header.indexOf('translation_vi')] || '', translation_en: values[header.indexOf('translation_en')] || '', theme: values[header.indexOf('theme')] || 'Imported' };
            }).filter((w): w is GeneratedWord => w !== null);
        } else {
            throw new Error("Unsupported file format.");
        }
        
        const addedCount = await addMultipleWords(wordsToImport);
        eventBus.dispatch('notification', { type: 'success', message: `Đã nhập thành công ${addedCount} từ mới!` });

      } catch (error: any) {
        eventBus.dispatch('notification', { type: 'error', message: `Nhập file thất bại: ${error.message}` });
      } finally {
        if (importFileRef.current) importFileRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleExportStudySets = () => {
    if (!studySets || studySets.length === 0) {
      eventBus.dispatch('notification', { type: 'info', message: 'Không có bộ từ học nào để xuất.' });
      return;
    }
    const content = JSON.stringify(studySets.map(({ id, createdAt, ...rest }) => rest), null, 2);
    const filename = 'study_sets_backup.json';
    const mimeType = 'application/json';
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

  const handleImportStudySets = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
          const validSets = data.filter(item => item.name && Array.isArray(item.wordIds));
          if (validSets.length > 0) {
            await batchCreateStudySets(validSets);
            eventBus.dispatch('notification', { type: 'success', message: `Đã nhập thành công ${validSets.length} bộ từ học!` });
          } else {
            throw new Error("File không chứa bộ từ học hợp lệ.");
          }
        } else {
          throw new Error("Định dạng file JSON không hợp lệ.");
        }
      } catch (error: any) {
        eventBus.dispatch('notification', { type: 'error', message: `Nhập file thất bại: ${error.message}` });
      } finally {
        if (studySetImportFileRef.current) studySetImportFileRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };
  
  const renderThemeHeader = (theme: string, count: number) => {
    const translationKey = `themes.${theme}`;
    const translatedTheme = t(translationKey);
    const displayTheme = translatedTheme === translationKey ? theme : translatedTheme;
    return `${displayTheme} (${count})`;
  };

  const sortedStudySets = useMemo(() => {
    return [...(studySets || [])].sort((a, b) => b.createdAt - a.createdAt);
  }, [studySets]);

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Danh sách từ của bạn</h2>
            <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 text-gray-200 font-semibold rounded-xl transition-colors">
                <ArrowLeft className="w-4 h-4" /> <span>Quay lại</span>
            </button>
        </div>
        
        <div className="flex justify-center p-1 bg-slate-800/60 rounded-full">
            <button onClick={() => { setActiveTab('themes'); setEditingSet(null); }} className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all ${activeTab === 'themes' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-700'}`}>Tất cả từ</button>
            <button onClick={() => { setActiveTab('studySets'); setEditingSet(null); }} className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all ${activeTab === 'studySets' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-700'}`}>Bộ từ học</button>
        </div>
        
        {activeTab === 'themes' ? (
          <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input ref={importFileRef} type="file" className="hidden" accept=".csv, .json" onChange={handleImport} />
                <button onClick={() => importFileRef.current?.click()} className="flex items-center justify-center gap-2 text-sm px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"> <Upload className="w-4 h-4" /> {t('word_list.import')}</button>
                <button onClick={() => handleExport('csv')} className="flex items-center justify-center gap-2 text-sm px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"> <Download className="w-4 h-4" /> {t('word_list.export_csv')}</button>
                <button onClick={() => handleExport('json')} className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 text-sm px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"> <Download className="w-4 h-4" /> {t('word_list.export_json')}</button>
                <button onClick={deleteAllWords} disabled={words.length === 0} className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 text-sm px-4 py-2 bg-red-900/70 hover:bg-red-800/80 border border-red-700/50 rounded-lg text-red-200 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"> 
                    <Trash2 className="w-4 h-4" /> Xóa hết
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="relative md:col-span-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input type="text" placeholder={t('word_list.search_placeholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  </div>
                  <div className="relative">
                      <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      <select id="sort-select" aria-label="Sắp xếp từ" value={sort} onChange={(e) => setSort(e.target.value as any)} className="w-full appearance-none pl-9 pr-8 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="newest">{t('word_list.sort_newest')}</option>
                          <option value="oldest">{t('word_list.sort_oldest')}</option>
                          <option value="az">{t('word_list.sort_az')}</option>
                          <option value="za">{t('word_list.sort_za')}</option>
                          <option value="review">{t('word_list.sort_review')}</option>
                      </select>
                  </div>
              </div>
              
              <div className="flex justify-end">
                {!selectionMode && !editingSet && (
                  <button onClick={() => setSelectionMode(true)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-sm rounded-lg text-white flex items-center gap-2">
                      <CheckSquare className="w-4 h-4"/>
                      Chọn từ
                  </button>
                )}
              </div>
        
              <div className="max-h-[50vh] overflow-y-auto pr-2 pb-20">
                {processedWordsForDisplay.length > 0 ? (
                  searchTerm ? (
                     <ul className="space-y-3">
                        {processedWordsForDisplay.map(word => <WordItem key={word.id} word={word} selectionMode={selectionMode} isSelected={selectedIds.has(word.id)} onToggleSelect={handleToggleSelect} />)}
                     </ul>
                  ) : (
                    <div className="space-y-4">
                       {starredWords.length > 0 && (
                          <details key="starred" className="group" open>
                              <summary className="list-none flex items-center justify-between cursor-pointer p-3 bg-slate-800/60 rounded-xl sticky top-0 backdrop-blur-sm border-b border-slate-700">
                                  <h3 className="font-semibold text-white flex items-center gap-2">
                                      <Star className="w-5 h-5 text-yellow-400" />
                                      Đã gắn sao ({starredWords.length})
                                  </h3>
                                  <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform"/>
                              </summary>
                              <ul className="space-y-3 mt-2">
                                  {starredWords.map(word => <WordItem key={word.id} word={word} selectionMode={selectionMode} isSelected={selectedIds.has(word.id)} onToggleSelect={handleToggleSelect} />)}
                              </ul>
                          </details>
                        )}
                        {groupedWords && groupedWords.map(([theme, themeWords]) => (
                            <details key={theme} className="group" open={!searchTerm}>
                              <summary className="list-none flex items-center justify-between cursor-pointer p-3 bg-slate-800/60 rounded-xl sticky top-0 backdrop-blur-sm border-b border-slate-700">
                                <h3 className="font-semibold text-white">{renderThemeHeader(theme, themeWords.length)}</h3>
                                <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform"/>
                              </summary>
                              <ul className="space-y-3 mt-2">
                                 {themeWords.map(word => <WordItem key={word.id} word={word} selectionMode={selectionMode} isSelected={selectedIds.has(word.id)} onToggleSelect={handleToggleSelect} />)}
                              </ul>
                            </details>
                        ))}
                    </div>
                  )
                ) : <p className="text-center text-gray-400 py-8">{words.length === 0 ? t('word_list.empty_list') : t('word_list.no_match')}</p>}
              </div>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
              <p className="text-center text-gray-400">Đây là nơi quản lý các bộ từ bạn tự tạo để tiện cho việc ôn tập.</p>
              <div className="grid grid-cols-2 gap-2">
                <input ref={studySetImportFileRef} type="file" className="hidden" accept=".json" onChange={handleImportStudySets} />
                <button onClick={() => studySetImportFileRef.current?.click()} className="flex items-center justify-center gap-2 text-sm px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"> <Upload className="w-4 h-4" /> Nhập JSON</button>
                <button onClick={handleExportStudySets} className="flex items-center justify-center gap-2 text-sm px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"> <Download className="w-4 h-4" /> Xuất JSON</button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
                  {sortedStudySets.length > 0 ? sortedStudySets.map(set => {
                      const wordsInSet = words.filter(w => set.wordIds.includes(w.id));
                      return (
                          <details key={set.id} className="group bg-slate-800/50 border border-slate-700 rounded-2xl">
                              <summary className="list-none flex items-center justify-between cursor-pointer p-4">
                                  <div>
                                    {renamingSet?.id === set.id ? (
                                      <input
                                        type="text"
                                        value={renamingSet.name}
                                        onChange={(e) => setRenamingSet({ ...renamingSet, name: e.target.value })}
                                        onBlur={handleRenameSet}
                                        onKeyDown={(e) => e.key === 'Enter' && handleRenameSet()}
                                        className="bg-slate-700 text-white font-semibold p-1 rounded"
                                        autoFocus
                                        onClick={e => e.stopPropagation()}
                                      />
                                    ) : (
                                      <h3 className="font-semibold text-white cursor-text" onClick={(e) => { e.stopPropagation(); setRenamingSet({ id: set.id, name: set.name }); }}>{set.name}</h3>
                                    )}
                                    <p className="text-sm text-gray-400">{set.wordIds.length} từ</p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); setSharingSet(set); }} className="p-2 text-sky-400 hover:bg-sky-500/10 rounded-full"><Share2 className="w-4 h-4"/></button>
                                    <button onClick={(e) => { e.stopPropagation(); setEditingSet(set); }} className="p-2 text-amber-400 hover:bg-amber-500/10 rounded-full"><Edit className="w-4 h-4"/></button>
                                    <button onClick={(e) => { e.stopPropagation(); if(window.confirm(`Bạn có chắc muốn xóa bộ "${set.name}"?`)) deleteStudySet(set.id); }} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full"><Trash2 className="w-4 h-4"/></button>
                                    <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform"/>
                                  </div>
                              </summary>
                              <div className="border-t border-slate-700 p-2 space-y-2">
                                  {wordsInSet.map(word => <WordItem key={word.id} word={word} selectionMode={false} isSelected={false} onToggleSelect={() => {}} />)}
                              </div>
                          </details>
                      )
                  }) : <p className="text-center text-gray-500 py-10">Bạn chưa tạo bộ từ học nào.</p>}
              </div>
          </div>
        )}

      {selectionMode && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4 animate-fade-in-up">
              <div className="bg-slate-900/80 backdrop-blur-lg p-2 rounded-full flex items-center justify-between shadow-lg border border-slate-700">
                  <span className="text-sm font-medium text-white px-3">{selectedIds.size} từ đã chọn</span>
                  <div className="flex items-center gap-2">
                     <button onClick={handleCancelSelection} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-full text-sm font-semibold">
                          Hủy
                      </button>
                      {editingSet ? (
                           <button onClick={handleSaveChanges} disabled={selectedIds.size === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-full text-sm font-semibold flex items-center gap-2 disabled:bg-indigo-400">
                              Lưu thay đổi
                          </button>
                      ) : (
                          <button onClick={() => setShowSetNameModal(true)} disabled={selectedIds.size === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-full text-sm font-semibold flex items-center gap-2 disabled:bg-indigo-400">
                              <ListPlus className="w-4 h-4" /> Lưu vào bộ
                          </button>
                      )}
                  </div>
              </div>
          </div>
      )}
      
      {showSetNameModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowSetNameModal(false)}>
              <div className="bg-slate-800 p-6 rounded-2xl space-y-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                  <h3 className="font-bold text-white text-lg">Đặt tên cho bộ từ học mới</h3>
                  <input type="text" value={newSetName} onChange={e => setNewSetName(e.target.value)} placeholder="vd: Từ vựng Chương 1" autoFocus className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"/>
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setShowSetNameModal(false)} className="px-4 py-2 bg-slate-600 rounded-lg text-white">Hủy</button>
                      <button onClick={handleCreateSet} disabled={!newSetName.trim()} className="px-4 py-2 bg-indigo-600 rounded-lg text-white disabled:bg-indigo-400">Tạo</button>
                  </div>
              </div>
          </div>
      )}

      {lastDeletion && !selectionMode && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-auto animate-fade-in-up">
          <div className="bg-slate-700 text-white rounded-full shadow-lg flex items-center justify-between p-2">
              <span className="px-3 text-sm">{Array.isArray(lastDeletion) ? `Đã xóa ${lastDeletion.length} từ.` : t('word_list.deleted_word', { word: (lastDeletion as VocabularyWord).word })}</span>
              <button onClick={undoLastDeletion} className="font-semibold text-indigo-300 hover:underline px-4 py-1.5 rounded-full hover:bg-slate-600/50 text-sm">{t('word_list.undo')}</button>
          </div>
        </div>
      )}

      <ShareStudySetModal
        isOpen={!!sharingSet}
        onClose={() => setSharingSet(null)}
        deckToShare={sharingSet}
      />
    </div>
  );
};

export default WordList;