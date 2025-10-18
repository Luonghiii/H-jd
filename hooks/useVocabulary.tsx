import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { VocabularyWord, TargetLanguage, LearningLanguage, GeneratedWord } from '../types';
import { translateWord } from '../services/geminiService';
import { useSettings } from './useSettings';

interface VocabularyContextType {
  words: VocabularyWord[];
  addWord: (word: string, translation: string, language: TargetLanguage, theme?: string) => Promise<void>;
  addMultipleWords: (newWords: GeneratedWord[]) => number;
  deleteWord: (id: string) => void;
  updateWord: (id: string, updates: Partial<VocabularyWord>) => void;
  updateWordImage: (wordId: string, imageUrl: string | null) => void;
  updateWordSrs: (wordId: string, performance: 'hard' | 'good' | 'easy') => void;
  getWordsForStory: (count: number) => VocabularyWord[];
  getAvailableThemes: () => string[];
  toggleWordStar: (id: string) => void;
  lastDeletedWord: { word: VocabularyWord; index: number } | null;
  undoDelete: () => void;
}

const VocabularyContext = createContext<VocabularyContextType | undefined>(undefined);

export const themeTranslationMap: Record<string, string> = {
  'Thức ăn': 'Food',
  'Đồ uống': 'Drinks',
  'Đồ vật': 'Objects',
  'Địa điểm': 'Places',
  'Động từ': 'Verbs',
  'Công việc': 'Work',
  'Tính từ': 'Adjectives',
  'Chào hỏi': 'Greetings',
  'Từ thông dụng': 'Common Words',
  'Đại từ': 'Pronouns',
  'Gia đình': 'Family',
  'Con người': 'People',
  'Trừu tượng': 'Abstract',
  'Cơ thể': 'Body',
  'Quần áo': 'Clothes',
  'Động vật': 'Animals',
  'Thiên nhiên': 'Nature',
  'Thời gian': 'Time',
  'Thời tiết': 'Weather',
  'Số đếm': 'Numbers',
  'Màu sắc': 'Colors',
  'Du lịch': 'Travel',
  'Trường học': 'School',
  'Nhà cửa': 'House',
  'Từ để hỏi': 'Question Words',
  'Trạng từ': 'Adverbs',
  'Giới từ': 'Prepositions',
  'Liên từ': 'Conjunctions',
  'Phương tiện': 'Transportation',
  'Mua sắm': 'Shopping',
  'Sở thích': 'Hobbies',
  'Cảm xúc': 'Feelings',
};

const germanA1Words: { german: string; translation: { vietnamese: string, english: string }, theme: string }[] = [
    // Con người & Gia đình
    { german: 'der Mann', translation: { vietnamese: 'người đàn ông', english: 'the man' }, theme: 'Con người' },
    { german: 'die Frau', translation: { vietnamese: 'người phụ nữ', english: 'the woman' }, theme: 'Con người' },
    { german: 'das Kind', translation: { vietnamese: 'đứa trẻ', english: 'the child' }, theme: 'Con người' },
    { german: 'die Familie', translation: { vietnamese: 'gia đình', english: 'the family' }, theme: 'Gia đình' },
    { german: 'der Vater', translation: { vietnamese: 'bố', english: 'the father' }, theme: 'Gia đình' },
    { german: 'die Mutter', translation: { vietnamese: 'mẹ', english: 'the mother' }, theme: 'Gia đình' },
    { german: 'der Sohn', translation: { vietnamese: 'con trai', english: 'the son' }, theme: 'Gia đình' },
    { german: 'die Tochter', translation: { vietnamese: 'con gái', english: 'the daughter' }, theme: 'Gia đình' },
    { german: 'der Bruder', translation: { vietnamese: 'anh/em trai', english: 'the brother' }, theme: 'Gia đình' },
    { german: 'die Schwester', translation: { vietnamese: 'chị/em gái', english: 'the sister' }, theme: 'Gia đình' },
    { german: 'der Freund', translation: { vietnamese: 'bạn trai', english: 'the friend (male)' }, theme: 'Con người' },
    { german: 'die Freundin', translation: { vietnamese: 'bạn gái', english: 'the friend (female)' }, theme: 'Con người' },
    { german: 'die Leute', translation: { vietnamese: 'mọi người', english: 'the people' }, theme: 'Con người' },

    // Động từ
    { german: 'sein', translation: { vietnamese: 'thì, là, ở', english: 'to be' }, theme: 'Động từ' },
    { german: 'haben', translation: { vietnamese: 'có', english: 'to have' }, theme: 'Động từ' },
    { german: 'werden', translation: { vietnamese: 'trở nên', english: 'to become' }, theme: 'Động từ' },
    { german: 'können', translation: { vietnamese: 'có thể', english: 'can, to be able to' }, theme: 'Động từ' },
    { german: 'müssen', translation: { vietnamese: 'phải', english: 'must, to have to' }, theme: 'Động từ' },
    { german: 'sagen', translation: { vietnamese: 'nói', english: 'to say' }, theme: 'Động từ' },
    { german: 'machen', translation: { vietnamese: 'làm', english: 'to do, to make' }, theme: 'Động từ' },
    { german: 'geben', translation: { vietnamese: 'đưa, cho', english: 'to give' }, theme: 'Động từ' },
    { german: 'kommen', translation: { vietnamese: 'đến', english: 'to come' }, theme: 'Động từ' },
    { german: 'gehen', translation: { vietnamese: 'đi', english: 'to go' }, theme: 'Động từ' },
    { german: 'sehen', translation: { vietnamese: 'nhìn, thấy', english: 'to see' }, theme: 'Động từ' },
    { german: 'essen', translation: { vietnamese: 'ăn', english: 'to eat' }, theme: 'Động từ' },
    { german: 'trinken', translation: { vietnamese: 'uống', english: 'to drink' }, theme: 'Động từ' },
    { german: 'arbeiten', translation: { vietnamese: 'làm việc', english: 'to work' }, theme: 'Động từ' },
    { german: 'lernen', translation: { vietnamese: 'học', english: 'to learn' }, theme: 'Động từ' },
    { german: 'sprechen', translation: { vietnamese: 'nói', english: 'to speak' }, theme: 'Động từ' },
    { german: 'fragen', translation: { vietnamese: 'hỏi', english: 'to ask' }, theme: 'Động từ' },
    { german: 'antworten', translation: { vietnamese: 'trả lời', english: 'to answer' }, theme: 'Động từ' },
    { german: 'kaufen', translation: { vietnamese: 'mua', english: 'to buy' }, theme: 'Động từ' },
    { german: 'wohnen', translation: { vietnamese: 'sống, ở', english: 'to live' }, theme: 'Động từ' },
    { german: 'heißen', translation: { vietnamese: 'tên là', english: 'to be called' }, theme: 'Động từ' },
    { german: 'verstehen', translation: { vietnamese: 'hiểu', english: 'to understand' }, theme: 'Động từ' },
    { german: 'schreiben', translation: { vietnamese: 'viết', english: 'to write' }, theme: 'Động từ' },
    { german: 'lesen', translation: { vietnamese: 'đọc', english: 'to read' }, theme: 'Động từ' },
    { german: 'fahren', translation: { vietnamese: 'lái xe, đi', english: 'to drive, to go' }, theme: 'Động từ' },
    { german: 'schlafen', translation: { vietnamese: 'ngủ', english: 'to sleep' }, theme: 'Động từ' },
    { german: 'helfen', translation: { vietnamese: 'giúp đỡ', english: 'to help' }, theme: 'Động từ' },

    // Đồ vật & Nhà cửa
    { german: 'das Haus', translation: { vietnamese: 'ngôi nhà', english: 'the house' }, theme: 'Nhà cửa' },
    { german: 'die Wohnung', translation: { vietnamese: 'căn hộ', english: 'the apartment' }, theme: 'Nhà cửa' },
    { german: 'das Zimmer', translation: { vietnamese: 'căn phòng', english: 'the room' }, theme: 'Nhà cửa' },
    { german: 'die Tür', translation: { vietnamese: 'cái cửa', english: 'the door' }, theme: 'Nhà cửa' },
    { german: 'das Fenster', translation: { vietnamese: 'cửa sổ', english: 'the window' }, theme: 'Nhà cửa' },
    { german: 'der Tisch', translation: { vietnamese: 'cái bàn', english: 'the table' }, theme: 'Đồ vật' },
    { german: 'der Stuhl', translation: { vietnamese: 'cái ghế', english: 'the chair' }, theme: 'Đồ vật' },
    { german: 'das Bett', translation: { vietnamese: 'cái giường', english: 'the bed' }, theme: 'Đồ vật' },
    { german: 'das Buch', translation: { vietnamese: 'quyển sách', english: 'the book' }, theme: 'Đồ vật' },
    { german: 'das Handy', translation: { vietnamese: 'điện thoại di động', english: 'the mobile phone' }, theme: 'Đồ vật' },
    { german: 'der Computer', translation: { vietnamese: 'máy tính', english: 'the computer' }, theme: 'Đồ vật' },
    { german: 'das Auto', translation: { vietnamese: 'ô tô', english: 'the car' }, theme: 'Phương tiện' },

    // Thức ăn & Đồ uống
    { german: 'das Brot', translation: { vietnamese: 'bánh mì', english: 'the bread' }, theme: 'Thức ăn' },
    { german: 'das Wasser', translation: { vietnamese: 'nước', english: 'the water' }, theme: 'Đồ uống' },
    { german: 'der Apfel', translation: { vietnamese: 'quả táo', english: 'the apple' }, theme: 'Thức ăn' },
    { german: 'die Milch', translation: { vietnamese: 'sữa', english: 'the milk' }, theme: 'Đồ uống' },
    { german: 'der Kaffee', translation: { vietnamese: 'cà phê', english: 'the coffee' }, theme: 'Đồ uống' },
    { german: 'der Käse', translation: { vietnamese: 'pho mát', english: 'the cheese' }, theme: 'Thức ăn' },
    { german: 'das Ei', translation: { vietnamese: 'quả trứng', english: 'the egg' }, theme: 'Thức ăn' },
    { german: 'das Fleisch', translation: { vietnamese: 'thịt', english: 'the meat' }, theme: 'Thức ăn' },
    { german: 'der Fisch', translation: { vietnamese: 'cá', english: 'the fish' }, theme: 'Thức ăn' },

    // Địa điểm
    { german: 'die Stadt', translation: { vietnamese: 'thành phố', english: 'the city' }, theme: 'Địa điểm' },
    { german: 'das Land', translation: { vietnamese: 'đất nước, vùng quê', english: 'the country' }, theme: 'Địa điểm' },
    { german: 'die Schule', translation: { vietnamese: 'trường học', english: 'the school' }, theme: 'Địa điểm' },
    { german: 'der Supermarkt', translation: { vietnamese: 'siêu thị', english: 'the supermarket' }, theme: 'Địa điểm' },
    { german: 'der Bahnhof', translation: { vietnamese: 'nhà ga', english: 'the train station' }, theme: 'Địa điểm' },
    { german: 'das Restaurant', translation: { vietnamese: 'nhà hàng', english: 'the restaurant' }, theme: 'Địa điểm' },

    // Thời gian
    { german: 'die Zeit', translation: { vietnamese: 'thời gian', english: 'the time' }, theme: 'Thời gian' },
    { german: 'der Tag', translation: { vietnamese: 'ngày', english: 'the day' }, theme: 'Thời gian' },
    { german: 'die Woche', translation: { vietnamese: 'tuần', english: 'the week' }, theme: 'Thời gian' },
    { german: 'der Monat', translation: { vietnamese: 'tháng', english: 'the month' }, theme: 'Thời gian' },
    { german: 'das Jahr', translation: { vietnamese: 'năm', english: 'the year' }, theme: 'Thời gian' },
    { german: 'heute', translation: { vietnamese: 'hôm nay', english: 'today' }, theme: 'Thời gian' },
    { german: 'gestern', translation: { vietnamese: 'hôm qua', english: 'yesterday' }, theme: 'Thời gian' },
    { german: 'morgen', translation: { vietnamese: 'ngày mai', english: 'tomorrow' }, theme: 'Thời gian' },
    { german: 'der Morgen', translation: { vietnamese: 'buổi sáng', english: 'the morning' }, theme: 'Thời gian' },
    { german: 'der Abend', translation: { vietnamese: 'buổi tối', english: 'the evening' }, theme: 'Thời gian' },
    
    // Tính từ
    { german: 'gut', translation: { vietnamese: 'tốt', english: 'good' }, theme: 'Tính từ' },
    { german: 'schlecht', translation: { vietnamese: 'tệ', english: 'bad' }, theme: 'Tính từ' },
    { german: 'groß', translation: { vietnamese: 'to, lớn', english: 'big, large' }, theme: 'Tính từ' },
    { german: 'klein', translation: { vietnamese: 'nhỏ', english: 'small' }, theme: 'Tính từ' },
    { german: 'neu', translation: { vietnamese: 'mới', english: 'new' }, theme: 'Tính từ' },
    { german: 'alt', translation: { vietnamese: 'cũ, già', english: 'old' }, theme: 'Tính từ' },
    { german: 'schön', translation: { vietnamese: 'đẹp', english: 'beautiful' }, theme: 'Tính từ' },
    { german: 'kalt', translation: { vietnamese: 'lạnh', english: 'cold' }, theme: 'Tính từ' },
    { german: 'warm', translation: { vietnamese: 'ấm', english: 'warm' }, theme: 'Tính từ' },
    { german: 'richtig', translation: { vietnamese: 'đúng', english: 'right, correct' }, theme: 'Tính từ' },
    { german: 'falsch', translation: { vietnamese: 'sai', english: 'wrong, false' }, theme: 'Tính từ' },

    // Trạng từ
    { german: 'hier', translation: { vietnamese: 'ở đây', english: 'here' }, theme: 'Trạng từ' },
    { german: 'dort', translation: { vietnamese: 'ở đó', english: 'there' }, theme: 'Trạng từ' },
    { german: 'jetzt', translation: { vietnamese: 'bây giờ', english: 'now' }, theme: 'Trạng từ' },
    { german: 'immer', translation: { vietnamese: 'luôn luôn', english: 'always' }, theme: 'Trạng từ' },
    { german: 'nie', translation: { vietnamese: 'không bao giờ', english: 'never' }, theme: 'Trạng từ' },
    { german: 'oft', translation: { vietnamese: 'thường xuyên', english: 'often' }, theme: 'Trạng từ' },
    { german: 'gern', translation: { vietnamese: 'thích', english: 'gladly' }, theme: 'Trạng từ' },
    { german: 'sehr', translation: { vietnamese: 'rất', english: 'very' }, theme: 'Trạng từ' },
    
    // Đại từ & Từ để hỏi
    { german: 'ich', translation: { vietnamese: 'tôi', english: 'I' }, theme: 'Đại từ' },
    { german: 'du', translation: { vietnamese: 'bạn (thân mật)', english: 'you (informal)' }, theme: 'Đại từ' },
    { german: 'er', translation: { vietnamese: 'anh ấy', english: 'he' }, theme: 'Đại từ' },
    { german: 'sie', translation: { vietnamese: 'cô ấy, họ, ngài', english: 'she, they, you (formal)' }, theme: 'Đại từ' },
    { german: 'es', translation: { vietnamese: 'nó', english: 'it' }, theme: 'Đại từ' },
    { german: 'wir', translation: { vietnamese: 'chúng tôi', english: 'we' }, theme: 'Đại từ' },
    { german: 'ihr', translation: { vietnamese: 'các bạn', english: 'you (plural informal)' }, theme: 'Đại từ' },
    { german: 'wer', translation: { vietnamese: 'ai', english: 'who' }, theme: 'Từ để hỏi' },
    { german: 'was', translation: { vietnamese: 'cái gì', english: 'what' }, theme: 'Từ để hỏi' },
    { german: 'wo', translation: { vietnamese: 'ở đâu', english: 'where' }, theme: 'Từ để hỏi' },
    { german: 'wann', translation: { vietnamese: 'khi nào', english: 'when' }, theme: 'Từ để hỏi' },
    { german: 'warum', translation: { vietnamese: 'tại sao', english: 'why' }, theme: 'Từ để hỏi' },
    { german: 'wie', translation: { vietnamese: 'như thế nào', english: 'how' }, theme: 'Từ để hỏi' },

    // Số đếm
    { german: 'eins', translation: { vietnamese: 'một', english: 'one' }, theme: 'Số đếm' },
    { german: 'zwei', translation: { vietnamese: 'hai', english: 'two' }, theme: 'Số đếm' },
    { german: 'drei', translation: { vietnamese: 'ba', english: 'three' }, theme: 'Số đếm' },
    { german: 'vier', translation: { vietnamese: 'bốn', english: 'four' }, theme: 'Số đếm' },
    { german: 'fünf', translation: { vietnamese: 'năm', english: 'five' }, theme: 'Số đếm' },
    { german: 'sechs', translation: { vietnamese: 'sáu', english: 'six' }, theme: 'Số đếm' },
    { german: 'sieben', translation: { vietnamese: 'bảy', english: 'seven' }, theme: 'Số đếm' },
    { german: 'acht', translation: { vietnamese: 'tám', english: 'eight' }, theme: 'Số đếm' },
    { german: 'neun', translation: { vietnamese: 'chín', english: 'nine' }, theme: 'Số đếm' },
    { german: 'zehn', translation: { vietnamese: 'mười', english: 'ten' }, theme: 'Số đếm' },

    // Giới từ & Liên từ
    { german: 'in', translation: { vietnamese: 'trong', english: 'in' }, theme: 'Giới từ' },
    { german: 'auf', translation: { vietnamese: 'trên', english: 'on' }, theme: 'Giới từ' },
    { german: 'mit', translation: { vietnamese: 'với', english: 'with' }, theme: 'Giới từ' },
    { german: 'für', translation: { vietnamese: 'cho', english: 'for' }, theme: 'Giới từ' },
    { german: 'und', translation: { vietnamese: 'và', english: 'and' }, theme: 'Liên từ' },
    { german: 'oder', translation: { vietnamese: 'hoặc', english: 'or' }, theme: 'Liên từ' },
    { german: 'aber', translation: { vietnamese: 'nhưng', english: 'but' }, theme: 'Liên từ' },
    
    // Màu sắc
    { german: 'rot', translation: { vietnamese: 'màu đỏ', english: 'red' }, theme: 'Màu sắc' },
    { german: 'blau', translation: { vietnamese: 'màu xanh dương', english: 'blue' }, theme: 'Màu sắc' },
    { german: 'grün', translation: { vietnamese: 'màu xanh lá', english: 'green' }, theme: 'Màu sắc' },
    { german: 'gelb', translation: { vietnamese: 'màu vàng', english: 'yellow' }, theme: 'Màu sắc' },
    { german: 'schwarz', translation: { vietnamese: 'màu đen', english: 'black' }, theme: 'Màu sắc' },
    { german: 'weiß', translation: { vietnamese: 'màu trắng', english: 'white' }, theme: 'Màu sắc' },

    // Chào hỏi
    { german: 'Hallo', translation: { vietnamese: 'xin chào', english: 'hello' }, theme: 'Chào hỏi' },
    { german: 'Danke', translation: { vietnamese: 'cảm ơn', english: 'thank you' }, theme: 'Chào hỏi' },
    { german: 'Bitte', translation: { vietnamese: 'làm ơn, không có gì', english: 'please, you\'re welcome' }, theme: 'Chào hỏi' },
    { german: 'Tschüss', translation: { vietnamese: 'tạm biệt', english: 'bye' }, theme: 'Chào hỏi' },
    { german: 'Ja', translation: { vietnamese: 'vâng, có', english: 'yes' }, theme: 'Từ thông dụng' },
    { german: 'Nein', translation: { vietnamese: 'không', english: 'no' }, theme: 'Từ thông dụng' },
];

const englishA1Words: { word: string; translation: { vietnamese: string, english: string }, theme: string }[] = [
    // People & Family
    { word: 'man', translation: { vietnamese: 'người đàn ông', english: 'man' }, theme: 'Con người' },
    { word: 'woman', translation: { vietnamese: 'người phụ nữ', english: 'woman' }, theme: 'Con người' },
    { word: 'child', translation: { vietnamese: 'đứa trẻ', english: 'child' }, theme: 'Con người' },
    { word: 'family', translation: { vietnamese: 'gia đình', english: 'family' }, theme: 'Gia đình' },
    { word: 'father', translation: { vietnamese: 'bố', english: 'father' }, theme: 'Gia đình' },
    { word: 'mother', translation: { vietnamese: 'mẹ', english: 'mother' }, theme: 'Gia đình' },
    { word: 'son', translation: { vietnamese: 'con trai', english: 'son' }, theme: 'Gia đình' },
    { word: 'daughter', translation: { vietnamese: 'con gái', english: 'daughter' }, theme: 'Gia đình' },
    { word: 'brother', translation: { vietnamese: 'anh/em trai', english: 'brother' }, theme: 'Gia đình' },
    { word: 'sister', translation: { vietnamese: 'chị/em gái', english: 'sister' }, theme: 'Gia đình' },
    { word: 'friend', translation: { vietnamese: 'bạn bè', english: 'friend' }, theme: 'Con người' },
    { word: 'people', translation: { vietnamese: 'mọi người', english: 'people' }, theme: 'Con người' },

    // Verbs
    { word: 'be', translation: { vietnamese: 'thì, là, ở', english: 'be' }, theme: 'Động từ' },
    { word: 'have', translation: { vietnamese: 'có', english: 'have' }, theme: 'Động từ' },
    { word: 'do', translation: { vietnamese: 'làm', english: 'do' }, theme: 'Động từ' },
    { word: 'say', translation: { vietnamese: 'nói', english: 'say' }, theme: 'Động từ' },
    { word: 'go', translation: { vietnamese: 'đi', english: 'go' }, theme: 'Động từ' },
    { word: 'get', translation: { vietnamese: 'nhận, có được', english: 'get' }, theme: 'Động từ' },
    { word: 'make', translation: { vietnamese: 'làm, chế tạo', english: 'make' }, theme: 'Động từ' },
    { word: 'know', translation: { vietnamese: 'biết', english: 'know' }, theme: 'Động từ' },
    { word: 'think', translation: { vietnamese: 'nghĩ', english: 'think' }, theme: 'Động từ' },
    { word: 'see', translation: { vietnamese: 'nhìn, thấy', english: 'see' }, theme: 'Động từ' },
    { word: 'come', translation: { vietnamese: 'đến', english: 'come' }, theme: 'Động từ' },
    { word: 'want', translation: { vietnamese: 'muốn', english: 'want' }, theme: 'Động từ' },
    { word: 'use', translation: { vietnamese: 'sử dụng', english: 'use' }, theme: 'Động từ' },
    { word: 'find', translation: { vietnamese: 'tìm thấy', english: 'find' }, theme: 'Động từ' },
    { word: 'give', translation: { vietnamese: 'đưa, cho', english: 'give' }, theme: 'Động từ' },
    { word: 'tell', translation: { vietnamese: 'kể, bảo', english: 'tell' }, theme: 'Động từ' },
    { word: 'work', translation: { vietnamese: 'làm việc', english: 'work' }, theme: 'Động từ' },
    { word: 'call', translation: { vietnamese: 'gọi điện', english: 'call' }, theme: 'Động từ' },
    { word: 'try', translation: { vietnamese: 'thử', english: 'try' }, theme: 'Động từ' },
    { word: 'ask', translation: { vietnamese: 'hỏi', english: 'ask' }, theme: 'Động từ' },
    { word: 'need', translation: { vietnamese: 'cần', english: 'need' }, theme: 'Động từ' },
    { word: 'feel', translation: { vietnamese: 'cảm thấy', english: 'feel' }, theme: 'Động từ' },
    { word: 'eat', translation: { vietnamese: 'ăn', english: 'eat' }, theme: 'Động từ' },
    { word: 'drink', translation: { vietnamese: 'uống', english: 'drink' }, theme: 'Động từ' },
    { word: 'learn', translation: { vietnamese: 'học', english: 'learn' }, theme: 'Động từ' },
    { word: 'speak', translation: { vietnamese: 'nói', english: 'speak' }, theme: 'Động từ' },
    { word: 'write', translation: { vietnamese: 'viết', english: 'write' }, theme: 'Động từ' },
    { word: 'read', translation: { vietnamese: 'đọc', english: 'read' }, theme: 'Động từ' },
    { word: 'sleep', translation: { vietnamese: 'ngủ', english: 'sleep' }, theme: 'Động từ' },
    { word: 'help', translation: { vietnamese: 'giúp đỡ', english: 'help' }, theme: 'Động từ' },
    { word: 'buy', translation: { vietnamese: 'mua', english: 'buy' }, theme: 'Động từ' },
    { word: 'live', translation: { vietnamese: 'sống', english: 'live' }, theme: 'Động từ' },

    // Objects & House
    { word: 'house', translation: { vietnamese: 'ngôi nhà', english: 'house' }, theme: 'Nhà cửa' },
    { word: 'room', translation: { vietnamese: 'căn phòng', english: 'room' }, theme: 'Nhà cửa' },
    { word: 'door', translation: { vietnamese: 'cửa ra vào', english: 'door' }, theme: 'Nhà cửa' },
    { word: 'window', translation: { vietnamese: 'cửa sổ', english: 'window' }, theme: 'Nhà cửa' },
    { word: 'table', translation: { vietnamese: 'cái bàn', english: 'table' }, theme: 'Đồ vật' },
    { word: 'chair', translation: { vietnamese: 'cái ghế', english: 'chair' }, theme: 'Đồ vật' },
    { word: 'bed', translation: { vietnamese: 'cái giường', english: 'bed' }, theme: 'Đồ vật' },
    { word: 'book', translation: { vietnamese: 'quyển sách', english: 'book' }, theme: 'Đồ vật' },
    { word: 'phone', translation: { vietnamese: 'điện thoại', english: 'phone' }, theme: 'Đồ vật' },
    { word: 'computer', translation: { vietnamese: 'máy tính', english: 'computer' }, theme: 'Đồ vật' },
    { word: 'car', translation: { vietnamese: 'ô tô', english: 'car' }, theme: 'Phương tiện' },
    { word: 'key', translation: { vietnamese: 'chìa khóa', english: 'key' }, theme: 'Đồ vật' },

    // Food & Drink
    { word: 'food', translation: { vietnamese: 'đồ ăn', english: 'food' }, theme: 'Thức ăn' },
    { word: 'water', translation: { vietnamese: 'nước', english: 'water' }, theme: 'Đồ uống' },
    { word: 'bread', translation: { vietnamese: 'bánh mì', english: 'bread' }, theme: 'Thức ăn' },
    { word: 'apple', translation: { vietnamese: 'quả táo', english: 'apple' }, theme: 'Thức ăn' },
    { word: 'milk', translation: { vietnamese: 'sữa', english: 'milk' }, theme: 'Đồ uống' },
    { word: 'coffee', translation: { vietnamese: 'cà phê', english: 'coffee' }, theme: 'Đồ uống' },
    { word: 'cheese', translation: { vietnamese: 'pho mát', english: 'cheese' }, theme: 'Thức ăn' },
    { word: 'egg', translation: { vietnamese: 'quả trứng', english: 'egg' }, theme: 'Thức ăn' },
    { word: 'meat', translation: { vietnamese: 'thịt', english: 'meat' }, theme: 'Thức ăn' },
    { word: 'fish', translation: { vietnamese: 'cá', english: 'fish' }, theme: 'Thức ăn' },

    // Places
    { word: 'city', translation: { vietnamese: 'thành phố', english: 'city' }, theme: 'Địa điểm' },
    { word: 'country', translation: { vietnamese: 'đất nước', english: 'country' }, theme: 'Địa điểm' },
    { word: 'school', translation: { vietnamese: 'trường học', english: 'school' }, theme: 'Địa điểm' },
    { word: 'shop', translation: { vietnamese: 'cửa hàng', english: 'shop' }, theme: 'Địa điểm' },
    { word: 'station', translation: { vietnamese: 'nhà ga', english: 'station' }, theme: 'Địa điểm' },
    { word: 'restaurant', translation: { vietnamese: 'nhà hàng', english: 'restaurant' }, theme: 'Địa điểm' },

    // Time
    { word: 'time', translation: { vietnamese: 'thời gian', english: 'time' }, theme: 'Thời gian' },
    { word: 'day', translation: { vietnamese: 'ngày', english: 'day' }, theme: 'Thời gian' },
    { word: 'week', translation: { vietnamese: 'tuần', english: 'week' }, theme: 'Thời gian' },
    { word: 'month', translation: { vietnamese: 'tháng', english: 'month' }, theme: 'Thời gian' },
    { word: 'year', translation: { vietnamese: 'năm', english: 'year' }, theme: 'Thời gian' },
    { word: 'today', translation: { vietnamese: 'hôm nay', english: 'today' }, theme: 'Thời gian' },
    { word: 'yesterday', translation: { vietnamese: 'hôm qua', english: 'yesterday' }, theme: 'Thời gian' },
    { word: 'tomorrow', translation: { vietnamese: 'ngày mai', english: 'tomorrow' }, theme: 'Thời gian' },
    { word: 'morning', translation: { vietnamese: 'buổi sáng', english: 'morning' }, theme: 'Thời gian' },
    { word: 'evening', translation: { vietnamese: 'buổi tối', english: 'evening' }, theme: 'Thời gian' },
    
    // Adjectives
    { word: 'good', translation: { vietnamese: 'tốt', english: 'good' }, theme: 'Tính từ' },
    { word: 'bad', translation: { vietnamese: 'tệ', english: 'bad' }, theme: 'Tính từ' },
    { word: 'big', translation: { vietnamese: 'to, lớn', english: 'big' }, theme: 'Tính từ' },
    { word: 'small', translation: { vietnamese: 'nhỏ', english: 'small' }, theme: 'Tính từ' },
    { word: 'new', translation: { vietnamese: 'mới', english: 'new' }, theme: 'Tính từ' },
    { word: 'old', translation: { vietnamese: 'cũ, già', english: 'old' }, theme: 'Tính từ' },
    { word: 'beautiful', translation: { vietnamese: 'đẹp', english: 'beautiful' }, theme: 'Tính từ' },
    { word: 'cold', translation: { vietnamese: 'lạnh', english: 'cold' }, theme: 'Tính từ' },
    { word: 'hot', translation: { vietnamese: 'nóng', english: 'hot' }, theme: 'Tính từ' },
    { word: 'right', translation: { vietnamese: 'đúng', english: 'right' }, theme: 'Tính từ' },
    { word: 'wrong', translation: { vietnamese: 'sai', english: 'wrong' }, theme: 'Tính từ' },
    { word: 'happy', translation: { vietnamese: 'vui vẻ', english: 'happy' }, theme: 'Tính từ' },
    { word: 'sad', translation: { vietnamese: 'buồn', english: 'sad' }, theme: 'Tính từ' },

    // Adverbs
    { word: 'here', translation: { vietnamese: 'ở đây', english: 'here' }, theme: 'Trạng từ' },
    { word: 'there', translation: { vietnamese: 'ở đó', english: 'there' }, theme: 'Trạng từ' },
    { word: 'now', translation: { vietnamese: 'bây giờ', english: 'now' }, theme: 'Trạng từ' },
    { word: 'always', translation: { vietnamese: 'luôn luôn', english: 'always' }, theme: 'Trạng từ' },
    { word: 'never', translation: { vietnamese: 'không bao giờ', english: 'never' }, theme: 'Trạng từ' },
    { word: 'often', translation: { vietnamese: 'thường xuyên', english: 'often' }, theme: 'Trạng từ' },
    { word: 'very', translation: { vietnamese: 'rất', english: 'very' }, theme: 'Trạng từ' },

    // Pronouns & Question Words
    { word: 'I', translation: { vietnamese: 'tôi', english: 'I' }, theme: 'Đại từ' },
    { word: 'you', translation: { vietnamese: 'bạn', english: 'you' }, theme: 'Đại từ' },
    { word: 'he', translation: { vietnamese: 'anh ấy', english: 'he' }, theme: 'Đại từ' },
    { word: 'she', translation: { vietnamese: 'cô ấy', english: 'she' }, theme: 'Đại từ' },
    { word: 'it', translation: { vietnamese: 'nó', english: 'it' }, theme: 'Đại từ' },
    { word: 'we', translation: { vietnamese: 'chúng tôi', english: 'we' }, theme: 'Đại từ' },
    { word: 'they', translation: { vietnamese: 'họ', english: 'they' }, theme: 'Đại từ' },
    { word: 'who', translation: { vietnamese: 'ai', english: 'who' }, theme: 'Từ để hỏi' },
    { word: 'what', translation: { vietnamese: 'cái gì', english: 'what' }, theme: 'Từ để hỏi' },
    { word: 'where', translation: { vietnamese: 'ở đâu', english: 'where' }, theme: 'Từ để hỏi' },
    { word: 'when', translation: { vietnamese: 'khi nào', english: 'when' }, theme: 'Từ để hỏi' },
    { word: 'why', translation: { vietnamese: 'tại sao', english: 'why' }, theme: 'Từ để hỏi' },
    { word: 'how', translation: { vietnamese: 'như thế nào', english: 'how' }, theme: 'Từ để hỏi' },

    // Numbers
    { word: 'one', translation: { vietnamese: 'một', english: 'one' }, theme: 'Số đếm' },
    { word: 'two', translation: { vietnamese: 'hai', english: 'two' }, theme: 'Số đếm' },
    { word: 'three', translation: { vietnamese: 'ba', english: 'three' }, theme: 'Số đếm' },
    { word: 'four', translation: { vietnamese: 'bốn', english: 'four' }, theme: 'Số đếm' },
    { word: 'five', translation: { vietnamese: 'năm', english: 'five' }, theme: 'Số đếm' },
    { word: 'six', translation: { vietnamese: 'sáu', english: 'six' }, theme: 'Số đếm' },
    { word: 'seven', translation: { vietnamese: 'bảy', english: 'seven' }, theme: 'Số đếm' },
    { word: 'eight', translation: { vietnamese: 'tám', english: 'eight' }, theme: 'Số đếm' },
    { word: 'nine', translation: { vietnamese: 'chín', english: 'nine' }, theme: 'Số đếm' },
    { word: 'ten', translation: { vietnamese: 'mười', english: 'ten' }, theme: 'Số đếm' },

    // Prepositions & Conjunctions
    { word: 'in', translation: { vietnamese: 'trong', english: 'in' }, theme: 'Giới từ' },
    { word: 'on', translation: { vietnamese: 'trên', english: 'on' }, theme: 'Giới từ' },
    { word: 'with', translation: { vietnamese: 'với', english: 'with' }, theme: 'Giới từ' },
    { word: 'for', translation: { vietnamese: 'cho', english: 'for' }, theme: 'Giới từ' },
    { word: 'and', translation: { vietnamese: 'và', english: 'and' }, theme: 'Liên từ' },
    { word: 'or', translation: { vietnamese: 'hoặc', english: 'or' }, theme: 'Liên từ' },
    { word: 'but', translation: { vietnamese: 'nhưng', english: 'but' }, theme: 'Liên từ' },

    // Colors
    { word: 'red', translation: { vietnamese: 'màu đỏ', english: 'red' }, theme: 'Màu sắc' },
    { word: 'blue', translation: { vietnamese: 'màu xanh dương', english: 'blue' }, theme: 'Màu sắc' },
    { word: 'green', translation: { vietnamese: 'màu xanh lá', english: 'green' }, theme: 'Màu sắc' },
    { word: 'yellow', translation: { vietnamese: 'màu vàng', english: 'yellow' }, theme: 'Màu sắc' },
    { word: 'black', translation: { vietnamese: 'màu đen', english: 'black' }, theme: 'Màu sắc' },
    { word: 'white', translation: { vietnamese: 'màu trắng', english: 'white' }, theme: 'Màu sắc' },

    // Greetings
    { word: 'hello', translation: { vietnamese: 'xin chào', english: 'hello' }, theme: 'Chào hỏi' },
    { word: 'thank you', translation: { vietnamese: 'cảm ơn', english: 'thank you' }, theme: 'Chào hỏi' },
    { word: 'please', translation: { vietnamese: 'làm ơn', english: 'please' }, theme: 'Chào hỏi' },
    { word: 'goodbye', translation: { vietnamese: 'tạm biệt', english: 'goodbye' }, theme: 'Chào hỏi' },
    { word: 'yes', translation: { vietnamese: 'vâng, có', english: 'yes' }, theme: 'Từ thông dụng' },
    { word: 'no', translation: { vietnamese: 'không', english: 'no' }, theme: 'Từ thông dụng' },
];

const chineseA1Words: { word: string; translation: { vietnamese: string, english: string }, theme: string }[] = [
    // Con người & Gia đình
    { word: '人 (rén)', translation: { vietnamese: 'người', english: 'person' }, theme: 'Con người' },
    { word: '家 (jiā)', translation: { vietnamese: 'nhà, gia đình', english: 'home, family' }, theme: 'Gia đình' },
    { word: '爸爸 (bàba)', translation: { vietnamese: 'bố', english: 'dad' }, theme: 'Gia đình' },
    { word: '妈妈 (māma)', translation: { vietnamese: 'mẹ', english: 'mom' }, theme: 'Gia đình' },
    { word: '朋友 (péngyou)', translation: { vietnamese: 'bạn bè', english: 'friend' }, theme: 'Con người' },
    { word: '男人 (nánrén)', translation: { vietnamese: 'đàn ông', english: 'man' }, theme: 'Con người' },
    { word: '女人 (nǚrén)', translation: { vietnamese: 'phụ nữ', english: 'woman' }, theme: 'Con người' },
    { word: '孩子 (háizi)', translation: { vietnamese: 'đứa trẻ', english: 'child' }, theme: 'Con người' },
    
    // Động từ
    { word: '是 (shì)', translation: { vietnamese: 'là', english: 'to be' }, theme: 'Động từ' },
    { word: '有 (yǒu)', translation: { vietnamese: 'có', english: 'to have' }, theme: 'Động từ' },
    { word: '看 (kàn)', translation: { vietnamese: 'nhìn, xem, đọc', english: 'to see, to watch, to read' }, theme: 'Động từ' },
    { word: '说 (shuō)', translation: { vietnamese: 'nói', english: 'to speak' }, theme: 'Động từ' },
    { word: '去 (qù)', translation: { vietnamese: 'đi', english: 'to go' }, theme: 'Động từ' },
    { word: '来 (lái)', translation: { vietnamese: 'đến', english: 'to come' }, theme: 'Động từ' },
    { word: '吃 (chī)', translation: { vietnamese: 'ăn', english: 'to eat' }, theme: 'Động từ' },
    { word: '喝 (hē)', translation: { vietnamese: 'uống', english: 'to drink' }, theme: 'Động từ' },
    { word: '做 (zuò)', translation: { vietnamese: 'làm', english: 'to do, to make' }, theme: 'Động từ' },
    { word: '买 (mǎi)', translation: { vietnamese: 'mua', english: 'to buy' }, theme: 'Động từ' },
    { word: '叫 (jiào)', translation: { vietnamese: 'gọi là, tên là', english: 'to be called' }, theme: 'Động từ' },
    { word: '学习 (xuéxí)', translation: { vietnamese: 'học tập', english: 'to study, to learn' }, theme: 'Động từ' },
    { word: '工作 (gōngzuò)', translation: { vietnamese: 'làm việc', english: 'to work' }, theme: 'Động từ' },
    { word: '住 (zhù)', translation: { vietnamese: 'sống, ở', english: 'to live' }, theme: 'Động từ' },
    { word: '爱 (ài)', translation: { vietnamese: 'yêu', english: 'to love' }, theme: 'Động từ' },
    { word: '喜欢 (xǐhuan)', translation: { vietnamese: 'thích', english: 'to like' }, theme: 'Động từ' },
    { word: '认识 (rènshi)', translation: { vietnamese: 'biết, quen', english: 'to know (someone)' }, theme: 'Động từ' },
    { word: '想 (xiǎng)', translation: { vietnamese: 'muốn, nghĩ', english: 'to want, to think' }, theme: 'Động từ' },
    { word: '会 (huì)', translation: { vietnamese: 'biết, có thể', english: 'can, to be able to' }, theme: 'Động từ' },

    // Đồ vật & Nhà cửa
    { word: '东西 (dōngxi)', translation: { vietnamese: 'đồ vật', english: 'thing, stuff' }, theme: 'Đồ vật' },
    { word: '桌子 (zhuōzi)', translation: { vietnamese: 'cái bàn', english: 'table' }, theme: 'Đồ vật' },
    { word: '椅子 (yǐzi)', translation: { vietnamese: 'cái ghế', english: 'chair' }, theme: 'Đồ vật' },
    { word: '书 (shū)', translation: { vietnamese: 'sách', english: 'book' }, theme: 'Đồ vật' },
    { word: '手机 (shǒujī)', translation: { vietnamese: 'điện thoại di động', english: 'mobile phone' }, theme: 'Đồ vật' },
    { word: '电脑 (diànnǎo)', translation: { vietnamese: 'máy tính', english: 'computer' }, theme: 'Đồ vật' },
    { word: '电视 (diànshì)', translation: { vietnamese: 'ti vi', english: 'television' }, theme: 'Đồ vật' },
    { word: '衣服 (yīfu)', translation: { vietnamese: 'quần áo', english: 'clothes' }, theme: 'Quần áo' },
    
    // Thức ăn & Đồ uống
    { word: '饭 (fàn)', translation: { vietnamese: 'cơm', english: 'rice, meal' }, theme: 'Thức ăn' },
    { word: '水 (shuǐ)', translation: { vietnamese: 'nước', english: 'water' }, theme: 'Đồ uống' },
    { word: '茶 (chá)', translation: { vietnamese: 'trà', english: 'tea' }, theme: 'Đồ uống' },
    { word: '苹果 (píngguǒ)', translation: { vietnamese: 'quả táo', english: 'apple' }, theme: 'Thức ăn' },
    { word: '菜 (cài)', translation: { vietnamese: 'món ăn, rau', english: 'dish, vegetable' }, theme: 'Thức ăn' },

    // Địa điểm
    { word: '中国 (Zhōngguó)', translation: { vietnamese: 'Trung Quốc', english: 'China' }, theme: 'Địa điểm' },
    { word: '商店 (shāngdiàn)', translation: { vietnamese: 'cửa hàng', english: 'shop' }, theme: 'Địa điểm' },
    { word: '学校 (xuéxiào)', translation: { vietnamese: 'trường học', english: 'school' }, theme: 'Địa điểm' },
    { word: '医院 (yīyuàn)', translation: { vietnamese: 'bệnh viện', english: 'hospital' }, theme: 'Địa điểm' },
    { word: '饭店 (fàndiàn)', translation: { vietnamese: 'nhà hàng, khách sạn', english: 'restaurant, hotel' }, theme: 'Địa điểm' },
    { word: '火车站 (huǒchēzhàn)', translation: { vietnamese: 'ga tàu hỏa', english: 'train station' }, theme: 'Địa điểm' },
    { word: '家 (jiā)', translation: { vietnamese: 'nhà', english: 'home' }, theme: 'Địa điểm' },

    // Thời gian
    { word: '时间 (shíjiān)', translation: { vietnamese: 'thời gian', english: 'time' }, theme: 'Thời gian' },
    { word: '今天 (jīntiān)', translation: { vietnamese: 'hôm nay', english: 'today' }, theme: 'Thời gian' },
    { word: '明天 (míngtiān)', translation: { vietnamese: 'ngày mai', english: 'tomorrow' }, theme: 'Thời gian' },
    { word: '昨天 (zuótiān)', translation: { vietnamese: 'hôm qua', english: 'yesterday' }, theme: 'Thời gian' },
    { word: '年 (nián)', translation: { vietnamese: 'năm', english: 'year' }, theme: 'Thời gian' },
    { word: '月 (yuè)', translation: { vietnamese: 'tháng', english: 'month' }, theme: 'Thời gian' },
    { word: '日 (rì)', translation: { vietnamese: 'ngày', english: 'day' }, theme: 'Thời gian' },
    { word: '小时 (xiǎoshí)', translation: { vietnamese: 'tiếng, giờ', english: 'hour' }, theme: 'Thời gian' },
    { word: '分钟 (fēnzhōng)', translation: { vietnamese: 'phút', english: 'minute' }, theme: 'Thời gian' },
    
    // Tính từ
    { word: '好 (hǎo)', translation: { vietnamese: 'tốt, khỏe', english: 'good' }, theme: 'Tính từ' },
    { word: '大 (dà)', translation: { vietnamese: 'to, lớn', english: 'big' }, theme: 'Tính từ' },
    { word: '小 (xiǎo)', translation: { vietnamese: 'nhỏ, bé', english: 'small' }, theme: 'Tính từ' },
    { word: '多 (duō)', translation: { vietnamese: 'nhiều', english: 'many, much' }, theme: 'Tính từ' },
    { word: '少 (shǎo)', translation: { vietnamese: 'ít', english: 'few, little' }, theme: 'Tính từ' },
    { word: '冷 (lěng)', translation: { vietnamese: 'lạnh', english: 'cold' }, theme: 'Tính từ' },
    { word: '热 (rè)', translation: { vietnamese: 'nóng', english: 'hot' }, theme: 'Tính từ' },
    { word: '高兴 (gāoxìng)', translation: { vietnamese: 'vui mừng', english: 'happy' }, theme: 'Tính từ' },
    { word: '漂亮 (piàoliang)', translation: { vietnamese: 'xinh đẹp', english: 'beautiful' }, theme: 'Tính từ' },
    
    // Trạng từ
    { word: '不 (bù)', translation: { vietnamese: 'không', english: 'not, no' }, theme: 'Trạng từ' },
    { word: '没 (méi)', translation: { vietnamese: 'không, chưa', english: 'not, have not' }, theme: 'Trạng từ' },
    { word: '很 (hěn)', translation: { vietnamese: 'rất', english: 'very' }, theme: 'Trạng từ' },
    { word: '太 (tài)', translation: { vietnamese: 'quá', english: 'too' }, theme: 'Trạng từ' },
    { word: '都 (dōu)', translation: { vietnamese: 'đều', english: 'all, both' }, theme: 'Trạng từ' },

    // Đại từ & Từ để hỏi
    { word: '我 (wǒ)', translation: { vietnamese: 'tôi', english: 'I, me' }, theme: 'Đại từ' },
    { word: '你 (nǐ)', translation: { vietnamese: 'bạn', english: 'you' }, theme: 'Đại từ' },
    { word: '他 (tā)', translation: { vietnamese: 'anh ấy', english: 'he, him' }, theme: 'Đại từ' },
    { word: '她 (tā)', translation: { vietnamese: 'cô ấy', english: 'she, her' }, theme: 'Đại từ' },
    { word: '我们 (wǒmen)', translation: { vietnamese: 'chúng tôi', english: 'we, us' }, theme: 'Đại từ' },
    { word: '这 (zhè)', translation: { vietnamese: 'đây, này', english: 'this' }, theme: 'Đại từ' },
    { word: '那 (nà)', translation: { vietnamese: 'đó, kia', english: 'that' }, theme: 'Đại từ' },
    { word: '谁 (shéi)', translation: { vietnamese: 'ai', english: 'who' }, theme: 'Từ để hỏi' },
    { word: '什么 (shénme)', translation: { vietnamese: 'cái gì', english: 'what' }, theme: 'Từ để hỏi' },
    { word: '哪儿 (nǎr)', translation: { vietnamese: 'ở đâu', english: 'where' }, theme: 'Từ để hỏi' },
    { word: '多少 (duōshao)', translation: { vietnamese: 'bao nhiêu', english: 'how many, how much' }, theme: 'Từ để hỏi' },
    { word: '几 (jǐ)', translation: { vietnamese: 'mấy', english: 'how many (for small numbers)' }, theme: 'Từ để hỏi' },
    { word: '怎么 (zěnme)', translation: { vietnamese: 'thế nào', english: 'how' }, theme: 'Từ để hỏi' },

    // Số đếm
    { word: '一 (yī)', translation: { vietnamese: 'một', english: 'one' }, theme: 'Số đếm' },
    { word: '二 (èr)', translation: { vietnamese: 'hai', english: 'two' }, theme: 'Số đếm' },
    { word: '三 (sān)', translation: { vietnamese: 'ba', english: 'three' }, theme: 'Số đếm' },
    { word: '四 (sì)', translation: { vietnamese: 'bốn', english: 'four' }, theme: 'Số đếm' },
    { word: '五 (wǔ)', translation: { vietnamese: 'năm', english: 'five' }, theme: 'Số đếm' },
    { word: '六 (liù)', translation: { vietnamese: 'sáu', english: 'six' }, theme: 'Số đếm' },
    { word: '七 (qī)', translation: { vietnamese: 'bảy', english: 'seven' }, theme: 'Số đếm' },
    { word: '八 (bā)', translation: { vietnamese: 'tám', english: 'eight' }, theme: 'Số đếm' },
    { word: '九 (jiǔ)', translation: { vietnamese: 'chín', english: 'nine' }, theme: 'Số đếm' },
    { word: '十 (shí)', translation: { vietnamese: 'mười', english: 'ten' }, theme: 'Số đếm' },
    
    // Giới từ & Liên từ
    { word: '在 (zài)', translation: { vietnamese: 'ở, tại', english: 'at, in, on' }, theme: 'Giới từ' },
    { word: '和 (hé)', translation: { vietnamese: 'và', english: 'and' }, theme: 'Liên từ' },
    
    // Chào hỏi & Từ thông dụng
    { word: '你好 (nǐ hǎo)', translation: { vietnamese: 'xin chào', english: 'hello' }, theme: 'Chào hỏi' },
    { word: '谢谢 (xièxie)', translation: { vietnamese: 'cảm ơn', english: 'thank you' }, theme: 'Chào hỏi' },
    { word: '不客气 (bú kèqi)', translation: { vietnamese: 'đừng khách sáo', english: 'you\'re welcome' }, theme: 'Chào hỏi' },
    { word: '对不起 (duìbuqǐ)', translation: { vietnamese: 'xin lỗi', english: 'sorry' }, theme: 'Chào hỏi' },
    { word: '没关系 (méi guānxi)', translation: { vietnamese: 'không sao đâu', english: 'it doesn\'t matter' }, theme: 'Chào hỏi' },
    { word: '再见 (zàijiàn)', translation: { vietnamese: 'tạm biệt', english: 'goodbye' }, theme: 'Chào hỏi' },
];

const createDefaultWords = (wordList: any[]): VocabularyWord[] => {
    return wordList.map((entry, index) => ({
        id: `default-${index}-${(entry.word || entry.german).replace(/\s/g, '')}`,
        word: entry.word || entry.german,
        translation: entry.translation,
        theme: entry.theme,
        createdAt: Date.now() - index * 1000,
        isStarred: false,
        srsLevel: 0,
        nextReview: Date.now(),
    })).sort((a, b) => b.createdAt - a.createdAt);
};

const defaultWords: Record<LearningLanguage, VocabularyWord[]> = {
    german: createDefaultWords(germanA1Words),
    english: createDefaultWords(englishA1Words),
    chinese: createDefaultWords(chineseA1Words),
};

const srsIntervalsDays = [1, 3, 7, 14, 30, 90, 180, 365];
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MINUTE_IN_MS = 60 * 1000;

export const VocabularyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { learningLanguage } = useSettings();
  const [allWords, setAllWords] = useState<Record<LearningLanguage, VocabularyWord[]>>(() => {
    try {
      const savedData = localStorage.getItem('vocabulary');
      let parsedData = savedData ? JSON.parse(savedData) : {};
      
      // Migration for old data structures
      if (Array.isArray(parsedData)) {
          parsedData = { german: parsedData };
      }

      // Merge with defaults and ensure SRS fields exist
      const merged: Record<LearningLanguage, VocabularyWord[]> = {
          german: [],
          english: [],
          chinese: []
      };

      for (const lang of Object.keys(defaultWords) as LearningLanguage[]) {
          const userWords = (parsedData[lang] || []).map((w: any) => ({
              ...w,
              srsLevel: w.srsLevel ?? 0,
              nextReview: w.nextReview ?? Date.now()
          }));
          const userWordSet = new Set(userWords.map((w: VocabularyWord) => w.word));
          const newDefaultWords = defaultWords[lang].filter(dw => !userWordSet.has(dw.word));
          merged[lang] = [...userWords, ...newDefaultWords];
      }
      
      return merged;

    } catch (error) {
      console.error("Could not load words from localStorage", error);
      return defaultWords;
    }
  });
  
  const [lastDeletedWord, setLastDeletedWord] = useState<{ word: VocabularyWord; index: number } | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  const words = allWords[learningLanguage] || [];

  useEffect(() => {
    try {
      localStorage.setItem('vocabulary', JSON.stringify(allWords));
    } catch (error) {
      console.error("Could not save words to localStorage", error);
    }
  }, [allWords]);

  const updateWordsForCurrentLanguage = (newWords: VocabularyWord[]) => {
      setAllWords(prev => ({
          ...prev,
          [learningLanguage]: newWords
      }));
  };

  const addWord = async (word: string, providedTranslation: string, language: TargetLanguage, theme?: string) => {
    let vietnamese = '';
    let english = '';

    if (language === 'vietnamese') {
      vietnamese = providedTranslation;
      english = await translateWord(word, 'English', learningLanguage);
    } else {
      english = providedTranslation;
      vietnamese = await translateWord(word, 'Vietnamese', learningLanguage);
    }

    const newWord: VocabularyWord = {
      id: crypto.randomUUID(),
      word,
      translation: { vietnamese, english },
      theme: theme || undefined,
      createdAt: Date.now(),
      isStarred: false,
      srsLevel: 0,
      nextReview: Date.now(),
    };
    updateWordsForCurrentLanguage([newWord, ...words]);
  };

  const addMultipleWords = (newWords: GeneratedWord[]): number => {
    const existingWordStrings = new Set(words.map(w => w.word.toLowerCase()));
    
    const uniqueNewWords = newWords.filter(nw => 
      nw.word && !existingWordStrings.has(nw.word.toLowerCase())
    );

    if (uniqueNewWords.length === 0) {
      return 0;
    }

    const wordsToAdd: VocabularyWord[] = uniqueNewWords.map(nw => ({
      id: crypto.randomUUID(),
      word: nw.word,
      translation: {
        vietnamese: nw.translation_vi,
        english: nw.translation_en,
      },
      theme: nw.theme,
      createdAt: Date.now(),
      isStarred: false,
      srsLevel: 0,
      nextReview: Date.now(),
    }));
    
    updateWordsForCurrentLanguage([...wordsToAdd, ...words]);
    return wordsToAdd.length;
  };

  const deleteWord = (id: string) => {
    if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
    }
    const wordIndex = words.findIndex(w => w.id === id);
    if (wordIndex === -1) return;

    const wordToDelete = words[wordIndex];
    const newWords = words.filter(word => word.id !== id);
    
    updateWordsForCurrentLanguage(newWords);
    setLastDeletedWord({ word: wordToDelete, index: wordIndex });

    undoTimerRef.current = window.setTimeout(() => {
        setLastDeletedWord(null);
    }, 5000); // 5 second undo window
  };

  const undoDelete = () => {
    if (!lastDeletedWord) return;

    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }

    const newWords = [...words];
    newWords.splice(lastDeletedWord.index, 0, lastDeletedWord.word);

    updateWordsForCurrentLanguage(newWords);
    setLastDeletedWord(null);
  };
  
  const updateWord = (id: string, updates: Partial<VocabularyWord>) => {
    updateWordsForCurrentLanguage(words.map(word => word.id === id ? { ...word, ...updates } : word));
  };
  
  const updateWordSrs = (wordId: string, performance: 'hard' | 'good' | 'easy') => {
    const word = words.find(w => w.id === wordId);
    if (!word) return;

    let newSrsLevel = word.srsLevel;
    let nextReview;

    switch (performance) {
        case 'hard':
            newSrsLevel = 0;
            nextReview = Date.now() + 10 * MINUTE_IN_MS; // Review again in 10 minutes
            break;
        case 'good':
            newSrsLevel = Math.min(newSrsLevel + 1, srsIntervalsDays.length - 1);
            nextReview = Date.now() + srsIntervalsDays[newSrsLevel] * DAY_IN_MS;
            break;
        case 'easy':
            newSrsLevel = Math.min(newSrsLevel + 2, srsIntervalsDays.length - 1);
            nextReview = Date.now() + srsIntervalsDays[newSrsLevel] * DAY_IN_MS;
            break;
    }
    updateWord(wordId, { srsLevel: newSrsLevel, nextReview });
  };

  const toggleWordStar = (id: string) => {
    const newWords = words.map(word =>
      word.id === id ? { ...word, isStarred: !word.isStarred } : word
    );
    updateWordsForCurrentLanguage(newWords);
  };

  const updateWordImage = (wordId: string, imageUrl: string | null) => {
    updateWordsForCurrentLanguage(words.map(word => {
      if (word.id === wordId) {
        return { ...word, imageUrl: imageUrl || undefined };
      }
      return word;
    }));
  };

  const getWordsForStory = useCallback((count: number): VocabularyWord[] => {
    const currentLangWords = allWords[learningLanguage] || [];
    const shuffled = [...currentLangWords].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }, [allWords, learningLanguage]);

  const getAvailableThemes = useCallback((): string[] => {
    const currentLangWords = allWords[learningLanguage] || [];
    const themes = new Set(currentLangWords.map(word => word.theme).filter(Boolean) as string[]);
    return Array.from(themes).sort();
  }, [allWords, learningLanguage]);

  return (
    <VocabularyContext.Provider value={{ words, addWord, addMultipleWords, deleteWord, updateWord, updateWordImage, updateWordSrs, getWordsForStory, getAvailableThemes, toggleWordStar, lastDeletedWord, undoDelete }}>
      {children}
    </VocabularyContext.Provider>
  );
};

export const useVocabulary = (): VocabularyContextType => {
  const context = useContext(VocabularyContext);
  if (context === undefined) {
    throw new Error('useVocabulary must be used within a VocabularyProvider');
  }
  return context;
};