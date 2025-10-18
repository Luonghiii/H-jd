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
  getWordsForStory: (count: number) => VocabularyWord[];
  getAvailableThemes: () => string[];
  toggleWordStar: (id: string) => void;
  lastDeletedWord: { word: VocabularyWord; index: number } | null;
  undoDelete: () => void;
}

// FIX: Defined VocabularyContext outside the component to be used by the provider and hook.
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
};

// Expanded word lists
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
    { german: 'der Freund', translation: { vietnamese: 'bạn (nam)', english: 'friend (male)' }, theme: 'Con người' },
    { german: 'die Freundin', translation: { vietnamese: 'bạn (nữ)', english: 'friend (female)' }, theme: 'Con người' },
    { german: 'die Leute', translation: { vietnamese: 'mọi người', english: 'people' }, theme: 'Con người' },
    { german: 'der Mensch', translation: { vietnamese: 'con người', english: 'human being' }, theme: 'Con người' },

    // Cơ thể
    { german: 'der Kopf', translation: { vietnamese: 'cái đầu', english: 'the head' }, theme: 'Cơ thể' },
    { german: 'das Auge', translation: { vietnamese: 'mắt', english: 'the eye' }, theme: 'Cơ thể' },
    { german: 'die Nase', translation: { vietnamese: 'mũi', english: 'the nose' }, theme: 'Cơ thể' },
    { german: 'der Mund', translation: { vietnamese: 'miệng', english: 'the mouth' }, theme: 'Cơ thể' },
    { german: 'die Hand', translation: { vietnamese: 'bàn tay', english: 'the hand' }, theme: 'Cơ thể' },
    { german: 'der Fuß', translation: { vietnamese: 'bàn chân', english: 'the foot' }, theme: 'Cơ thể' },

    // Công việc & Trường học
    { german: 'der Beruf', translation: { vietnamese: 'nghề nghiệp', english: 'the profession' }, theme: 'Công việc' },
    { german: 'der Lehrer', translation: { vietnamese: 'giáo viên (nam)', english: 'the teacher (male)' }, theme: 'Công việc' },
    { german: 'der Arzt', translation: { vietnamese: 'bác sĩ (nam)', english: 'the doctor (male)' }, theme: 'Công việc' },
    { german: 'der Student', translation: { vietnamese: 'sinh viên (nam)', english: 'the student (male)' }, theme: 'Công việc' },
    { german: 'arbeiten', translation: { vietnamese: 'làm việc', english: 'to work' }, theme: 'Động từ' },
    { german: 'lernen', translation: { vietnamese: 'học', english: 'to learn' }, theme: 'Động từ' },
    { german: 'die Schule', translation: { vietnamese: 'trường học', english: 'the school' }, theme: 'Trường học' },
    { german: 'die Universität', translation: { vietnamese: 'trường đại học', english: 'the university' }, theme: 'Trường học' },
    { german: 'das Buch', translation: { vietnamese: 'quyển sách', english: 'the book' }, theme: 'Trường học' },
    { german: 'der Stift', translation: { vietnamese: 'cái bút', english: 'the pen' }, theme: 'Trường học' },
    
    // Thức ăn & Đồ uống
    { german: 'das Essen', translation: { vietnamese: 'đồ ăn', english: 'the food' }, theme: 'Thức ăn' },
    { german: 'das Brot', translation: { vietnamese: 'bánh mì', english: 'the bread' }, theme: 'Thức ăn' },
    { german: 'der Käse', translation: { vietnamese: 'phô mai', english: 'the cheese' }, theme: 'Thức ăn' },
    { german: 'das Fleisch', translation: { vietnamese: 'thịt', english: 'the meat' }, theme: 'Thức ăn' },
    { german: 'der Fisch', translation: { vietnamese: 'cá', english: 'the fish' }, theme: 'Thức ăn' },
    { german: 'das Gemüse', translation: { vietnamese: 'rau củ', english: 'the vegetable' }, theme: 'Thức ăn' },
    { german: 'das Obst', translation: { vietnamese: 'hoa quả', english: 'the fruit' }, theme: 'Thức ăn' },
    { german: 'der Apfel', translation: { vietnamese: 'quả táo', english: 'the apple' }, theme: 'Thức ăn' },
    { german: 'die Banane', translation: { vietnamese: 'quả chuối', english: 'the banana' }, theme: 'Thức ăn' },
    { german: 'das Wasser', translation: { vietnamese: 'nước', english: 'the water' }, theme: 'Đồ uống' },
    { german: 'der Kaffee', translation: { vietnamese: 'cà phê', english: 'the coffee' }, theme: 'Đồ uống' },
    { german: 'die Milch', translation: { vietnamese: 'sữa', english: 'the milk' }, theme: 'Đồ uống' },
    { german: 'der Tee', translation: { vietnamese: 'trà', english: 'the tea' }, theme: 'Đồ uống' },
    { german: 'der Saft', translation: { vietnamese: 'nước ép', english: 'the juice' }, theme: 'Đồ uống' },
    { german: 'essen', translation: { vietnamese: 'ăn', english: 'to eat' }, theme: 'Động từ' },
    { german: 'trinken', translation: { vietnamese: 'uống', english: 'to drink' }, theme: 'Động từ' },

    // Địa điểm
    { german: 'das Haus', translation: { vietnamese: 'ngôi nhà', english: 'the house' }, theme: 'Địa điểm' },
    { german: 'die Wohnung', translation: { vietnamese: 'căn hộ', english: 'the apartment' }, theme: 'Địa điểm' },
    { german: 'die Stadt', translation: { vietnamese: 'thành phố', english: 'the city' }, theme: 'Địa điểm' },
    { german: 'das Land', translation: { vietnamese: 'đất nước, vùng quê', english: 'the country, countryside' }, theme: 'Địa điểm' },
    { german: 'die Straße', translation: { vietnamese: 'con đường', english: 'the street' }, theme: 'Địa điểm' },
    { german: 'der Supermarkt', translation: { vietnamese: 'siêu thị', english: 'the supermarket' }, theme: 'Địa điểm' },
    { german: 'der Bahnhof', translation: { vietnamese: 'nhà ga', english: 'the train station' }, theme: 'Địa điểm' },
    { german: 'der Flughafen', translation: { vietnamese: 'sân bay', english: 'the airport' }, theme: 'Địa điểm' },
    { german: 'das Restaurant', translation: { vietnamese: 'nhà hàng', english: 'the restaurant' }, theme: 'Địa điểm' },
    { german: 'das Hotel', translation: { vietnamese: 'khách sạn', english: 'the hotel' }, theme: 'Địa điểm' },
    
    // Động vật
    { german: 'das Tier', translation: { vietnamese: 'động vật', english: 'the animal' }, theme: 'Động vật' },
    { german: 'der Hund', translation: { vietnamese: 'con chó', english: 'the dog' }, theme: 'Động vật' },
    { german: 'die Katze', translation: { vietnamese: 'con mèo', english: 'the cat' }, theme: 'Động vật' },
    { german: 'der Vogel', translation: { vietnamese: 'con chim', english: 'the bird' }, theme: 'Động vật' },
    
    // Thời gian
    { german: 'die Zeit', translation: { vietnamese: 'thời gian', english: 'the time' }, theme: 'Thời gian' },
    { german: 'die Uhr', translation: { vietnamese: 'đồng hồ, giờ', english: 'the clock, o\'clock' }, theme: 'Thời gian' },
    { german: 'der Tag', translation: { vietnamese: 'ngày', english: 'the day' }, theme: 'Thời gian' },
    { german: 'die Woche', translation: { vietnamese: 'tuần', english: 'the week' }, theme: 'Thời gian' },
    { german: 'der Monat', translation: { vietnamese: 'tháng', english: 'the month' }, theme: 'Thời gian' },
    { german: 'das Jahr', translation: { vietnamese: 'năm', english: 'the year' }, theme: 'Thời gian' },
    { german: 'heute', translation: { vietnamese: 'hôm nay', english: 'today' }, theme: 'Thời gian' },
    { german: 'morgen', translation: { vietnamese: 'ngày mai', english: 'tomorrow' }, theme: 'Thời gian' },
    { german: 'gestern', translation: { vietnamese: 'hôm qua', english: 'yesterday' }, theme: 'Thời gian' },
    { german: 'der Morgen', translation: { vietnamese: 'buổi sáng', english: 'the morning' }, theme: 'Thời gian' },
    { german: 'der Abend', translation: { vietnamese: 'buổi tối', english: 'the evening' }, theme: 'Thời gian' },
    { german: 'die Nacht', translation: { vietnamese: 'ban đêm', english: 'the night' }, theme: 'Thời gian' },
    
    // Động từ thông dụng
    { german: 'sein', translation: { vietnamese: 'thì, là, ở', english: 'to be' }, theme: 'Động từ' },
    { german: 'haben', translation: { vietnamese: 'có', english: 'to have' }, theme: 'Động từ' },
    { german: 'werden', translation: { vietnamese: 'trở nên, sẽ', english: 'to become, will' }, theme: 'Động từ' },
    { german: 'können', translation: { vietnamese: 'có thể', english: 'can, to be able to' }, theme: 'Động từ' },
    { german: 'müssen', translation: { vietnamese: 'phải', english: 'must, to have to' }, theme: 'Động từ' },
    { german: 'wollen', translation: { vietnamese: 'muốn', english: 'to want' }, theme: 'Động từ' },
    { german: 'sagen', translation: { vietnamese: 'nói', english: 'to say' }, theme: 'Động từ' },
    { german: 'machen', translation: { vietnamese: 'làm', english: 'to do, to make' }, theme: 'Động từ' },
    { german: 'geben', translation: { vietnamese: 'cho, đưa', english: 'to give' }, theme: 'Động từ' },
    { german: 'kommen', translation: { vietnamese: 'đến', english: 'to come' }, theme: 'Động từ' },
    { german: 'gehen', translation: { vietnamese: 'đi', english: 'to go' }, theme: 'Động từ' },
    { german: 'sehen', translation: { vietnamese: 'nhìn, thấy', english: 'to see' }, theme: 'Động từ' },
    { german: 'sprechen', translation: { vietnamese: 'nói', english: 'to speak' }, theme: 'Động từ' },
    { german: 'lesen', translation: { vietnamese: 'đọc', english: 'to read' }, theme: 'Động từ' },
    { german: 'schreiben', translation: { vietnamese: 'viết', english: 'to write' }, theme: 'Động từ' },
    { german: 'fragen', translation: { vietnamese: 'hỏi', english: 'to ask' }, theme: 'Động từ' },
    { german: 'antworten', translation: { vietnamese: 'trả lời', english: 'to answer' }, theme: 'Động từ' },
    { german: 'kaufen', translation: { vietnamese: 'mua', english: 'to buy' }, theme: 'Động từ' },
    { german: 'verkaufen', translation: { vietnamese: 'bán', english: 'to sell' }, theme: 'Động từ' },
    { german: 'bezahlen', translation: { vietnamese: 'thanh toán', english: 'to pay' }, theme: 'Động từ' },
    { german: 'wohnen', translation: { vietnamese: 'sống, cư trú', english: 'to live, reside' }, theme: 'Động từ' },
    { german: 'fahren', translation: { vietnamese: 'lái xe, đi (xe)', english: 'to drive, to go (by vehicle)' }, theme: 'Động từ' },
    { german: 'fliegen', translation: { vietnamese: 'bay', english: 'to fly' }, theme: 'Động từ' },
    { german: 'schlafen', translation: { vietnamese: 'ngủ', english: 'to sleep' }, theme: 'Động từ' },
    { german: 'helfen', translation: { vietnamese: 'giúp đỡ', english: 'to help' }, theme: 'Động từ' },
    { german: 'suchen', translation: { vietnamese: 'tìm kiếm', english: 'to look for' }, theme: 'Động từ' },
    { german: 'finden', translation: { vietnamese: 'tìm thấy', english: 'to find' }, theme: 'Động từ' },
    { german: 'verstehen', translation: { vietnamese: 'hiểu', english: 'to understand' }, theme: 'Động từ' },
    
    // Tính từ
    { german: 'gut', translation: { vietnamese: 'tốt', english: 'good' }, theme: 'Tính từ' },
    { german: 'schlecht', translation: { vietnamese: 'xấu, tồi', english: 'bad' }, theme: 'Tính từ' },
    { german: 'groß', translation: { vietnamese: 'to, lớn', english: 'big, large' }, theme: 'Tính từ' },
    { german: 'klein', translation: { vietnamese: 'nhỏ', english: 'small' }, theme: 'Tính từ' },
    { german: 'neu', translation: { vietnamese: 'mới', english: 'new' }, theme: 'Tính từ' },
    { german: 'alt', translation: { vietnamese: 'cũ, già', english: 'old' }, theme: 'Tính từ' },
    { german: 'schön', translation: { vietnamese: 'đẹp', english: 'beautiful' }, theme: 'Tính từ' },
    { german: 'hässlich', translation: { vietnamese: 'xấu xí', english: 'ugly' }, theme: 'Tính từ' },
    { german: 'schnell', translation: { vietnamese: 'nhanh', english: 'fast' }, theme: 'Tính từ' },
    { german: 'langsam', translation: { vietnamese: 'chậm', english: 'slow' }, theme: 'Tính từ' },
    { german: 'kalt', translation: { vietnamese: 'lạnh', english: 'cold' }, theme: 'Tính từ' },
    { german: 'warm', translation: { vietnamese: 'ấm', english: 'warm' }, theme: 'Tính từ' },
    { german: 'heiß', translation: { vietnamese: 'nóng', english: 'hot' }, theme: 'Tính từ' },
    { german: 'teuer', translation: { vietnamese: 'đắt', english: 'expensive' }, theme: 'Tính từ' },
    { german: 'billig', translation: { vietnamese: 'rẻ', english: 'cheap' }, theme: 'Tính từ' },
    { german: 'richtig', translation: { vietnamese: 'đúng', english: 'correct' }, theme: 'Tính từ' },
    { german: 'falsch', translation: { vietnamese: 'sai', english: 'wrong' }, theme: 'Tính từ' },
    
    // Màu sắc
    { german: 'die Farbe', translation: { vietnamese: 'màu sắc', english: 'the color' }, theme: 'Màu sắc' },
    { german: 'rot', translation: { vietnamese: 'màu đỏ', english: 'red' }, theme: 'Màu sắc' },
    { german: 'blau', translation: { vietnamese: 'màu xanh dương', english: 'blue' }, theme: 'Màu sắc' },
    { german: 'grün', translation: { vietnamese: 'màu xanh lá', english: 'green' }, theme: 'Màu sắc' },
    { german: 'gelb', translation: { vietnamese: 'màu vàng', english: 'yellow' }, theme: 'Màu sắc' },
    { german: 'schwarz', translation: { vietnamese: 'màu đen', english: 'black' }, theme: 'Màu sắc' },
    { german: 'weiß', translation: { vietnamese: 'màu trắng', english: 'white' }, theme: 'Màu sắc' },
    
    // Số đếm
    { german: 'null', translation: { vietnamese: 'số không', english: 'zero' }, theme: 'Số đếm' },
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
    
    // Từ để hỏi
    { german: 'wer', translation: { vietnamese: 'ai', english: 'who' }, theme: 'Từ để hỏi' },
    { german: 'was', translation: { vietnamese: 'cái gì', english: 'what' }, theme: 'Từ để hỏi' },
    { german: 'wo', translation: { vietnamese: 'ở đâu', english: 'where' }, theme: 'Từ để hỏi' },
    { german: 'wann', translation: { vietnamese: 'khi nào', english: 'when' }, theme: 'Từ để hỏi' },
    { german: 'warum', translation: { vietnamese: 'tại sao', english: 'why' }, theme: 'Từ để hỏi' },
    { german: 'wie', translation: { vietnamese: 'như thế nào', english: 'how' }, theme: 'Từ để hỏi' },
    { german: 'woher', translation: { vietnamese: 'từ đâu', english: 'from where' }, theme: 'Từ để hỏi' },
    { german: 'wohin', translation: { vietnamese: 'đến đâu', english: 'to where' }, theme: 'Từ để hỏi' },
    
    // Chào hỏi & Từ thông dụng
    { german: 'Hallo', translation: { vietnamese: 'xin chào', english: 'hello' }, theme: 'Chào hỏi' },
    { german: 'Tschüss', translation: { vietnamese: 'tạm biệt', english: 'bye' }, theme: 'Chào hỏi' },
    { german: 'Auf Wiedersehen', translation: { vietnamese: 'tạm biệt (trang trọng)', english: 'goodbye (formal)' }, theme: 'Chào hỏi' },
    { german: 'Guten Morgen', translation: { vietnamese: 'chào buổi sáng', english: 'good morning' }, theme: 'Chào hỏi' },
    { german: 'Guten Tag', translation: { vietnamese: 'chào buổi ngày', english: 'good day' }, theme: 'Chào hỏi' },
    { german: 'Guten Abend', translation: { vietnamese: 'chào buổi tối', english: 'good evening' }, theme: 'Chào hỏi' },
    { german: 'Danke', translation: { vietnamese: 'cảm ơn', english: 'thank you' }, theme: 'Chào hỏi' },
    { german: 'Bitte', translation: { vietnamese: 'làm ơn / không có gì', english: 'please / you\'re welcome' }, theme: 'Chào hỏi' },
    { german: 'Ja', translation: { vietnamese: 'vâng, có', english: 'yes' }, theme: 'Từ thông dụng' },
    { german: 'Nein', translation: { vietnamese: 'không', english: 'no' }, theme: 'Từ thông dụng' },
    { german: 'vielleicht', translation: { vietnamese: 'có lẽ', english: 'maybe' }, theme: 'Từ thông dụng' },
    { german: 'Entschuldigung', translation: { vietnamese: 'xin lỗi', english: 'excuse me, sorry' }, theme: 'Từ thông dụng' },
    
    // Đại từ
    { german: 'ich', translation: { vietnamese: 'tôi', english: 'I' }, theme: 'Đại từ' },
    { german: 'du', translation: { vietnamese: 'bạn (thân mật)', english: 'you (informal)' }, theme: 'Đại từ' },
    { german: 'er', translation: { vietnamese: 'anh ấy', english: 'he' }, theme: 'Đại từ' },
    { german: 'sie', translation: { vietnamese: 'cô ấy, họ, ngài', english: 'she, they, you (formal)' }, theme: 'Đại từ' },
    { german: 'es', translation: { vietnamese: 'nó', english: 'it' }, theme: 'Đại từ' },
    { german: 'wir', translation: { vietnamese: 'chúng tôi', english: 'we' }, theme: 'Đại từ' },
    { german: 'ihr', translation: { vietnamese: 'các bạn', english: 'you (plural informal)' }, theme: 'Đại từ' },
];

const englishA1Words: { word: string; translation: { vietnamese: string, english: string }, theme: string }[] = [
    // Con người & Gia đình
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

    // Cơ thể
    { word: 'head', translation: { vietnamese: 'cái đầu', english: 'head' }, theme: 'Cơ thể' },
    { word: 'eye', translation: { vietnamese: 'mắt', english: 'eye' }, theme: 'Cơ thể' },
    { word: 'nose', translation: { vietnamese: 'mũi', english: 'nose' }, theme: 'Cơ thể' },
    { word: 'mouth', translation: { vietnamese: 'miệng', english: 'mouth' }, theme: 'Cơ thể' },
    { word: 'hand', translation: { vietnamese: 'bàn tay', english: 'hand' }, theme: 'Cơ thể' },
    { word: 'foot', translation: { vietnamese: 'bàn chân', english: 'foot' }, theme: 'Cơ thể' },

    // Công việc & Trường học
    { word: 'job', translation: { vietnamese: 'công việc', english: 'job' }, theme: 'Công việc' },
    { word: 'teacher', translation: { vietnamese: 'giáo viên', english: 'teacher' }, theme: 'Công việc' },
    { word: 'doctor', translation: { vietnamese: 'bác sĩ', english: 'doctor' }, theme: 'Công việc' },
    { word: 'student', translation: { vietnamese: 'học sinh, sinh viên', english: 'student' }, theme: 'Công việc' },
    { word: 'work', translation: { vietnamese: 'làm việc', english: 'work' }, theme: 'Động từ' },
    { word: 'learn', translation: { vietnamese: 'học', english: 'learn' }, theme: 'Động từ' },
    { word: 'school', translation: { vietnamese: 'trường học', english: 'school' }, theme: 'Trường học' },
    { word: 'university', translation: { vietnamese: 'trường đại học', english: 'university' }, theme: 'Trường học' },
    { word: 'book', translation: { vietnamese: 'quyển sách', english: 'book' }, theme: 'Trường học' },
    { word: 'pen', translation: { vietnamese: 'cái bút', english: 'pen' }, theme: 'Trường học' },
    
    // Thức ăn & Đồ uống
    { word: 'food', translation: { vietnamese: 'đồ ăn', english: 'food' }, theme: 'Thức ăn' },
    { word: 'bread', translation: { vietnamese: 'bánh mì', english: 'bread' }, theme: 'Thức ăn' },
    { word: 'cheese', translation: { vietnamese: 'phô mai', english: 'cheese' }, theme: 'Thức ăn' },
    { word: 'meat', translation: { vietnamese: 'thịt', english: 'meat' }, theme: 'Thức ăn' },
    { word: 'fish', translation: { vietnamese: 'cá', english: 'fish' }, theme: 'Thức ăn' },
    { word: 'vegetable', translation: { vietnamese: 'rau củ', english: 'vegetable' }, theme: 'Thức ăn' },
    { word: 'fruit', translation: { vietnamese: 'hoa quả', english: 'fruit' }, theme: 'Thức ăn' },
    { word: 'apple', translation: { vietnamese: 'quả táo', english: 'apple' }, theme: 'Thức ăn' },
    { word: 'banana', translation: { vietnamese: 'quả chuối', english: 'banana' }, theme: 'Thức ăn' },
    { word: 'water', translation: { vietnamese: 'nước', english: 'water' }, theme: 'Đồ uống' },
    { word: 'coffee', translation: { vietnamese: 'cà phê', english: 'coffee' }, theme: 'Đồ uống' },
    { word: 'milk', translation: { vietnamese: 'sữa', english: 'milk' }, theme: 'Đồ uống' },
    { word: 'tea', translation: { vietnamese: 'trà', english: 'tea' }, theme: 'Đồ uống' },
    { word: 'juice', translation: { vietnamese: 'nước ép', english: 'juice' }, theme: 'Đồ uống' },
    { word: 'eat', translation: { vietnamese: 'ăn', english: 'eat' }, theme: 'Động từ' },
    { word: 'drink', translation: { vietnamese: 'uống', english: 'drink' }, theme: 'Động từ' },

    // Địa điểm
    { word: 'house', translation: { vietnamese: 'ngôi nhà', english: 'house' }, theme: 'Địa điểm' },
    { word: 'apartment', translation: { vietnamese: 'căn hộ', english: 'apartment' }, theme: 'Địa điểm' },
    { word: 'city', translation: { vietnamese: 'thành phố', english: 'city' }, theme: 'Địa điểm' },
    { word: 'country', translation: { vietnamese: 'đất nước', english: 'country' }, theme: 'Địa điểm' },
    { word: 'street', translation: { vietnamese: 'con đường', english: 'street' }, theme: 'Địa điểm' },
    { word: 'supermarket', translation: { vietnamese: 'siêu thị', english: 'supermarket' }, theme: 'Địa điểm' },
    { word: 'station', translation: { vietnamese: 'nhà ga', english: 'station' }, theme: 'Địa điểm' },
    { word: 'airport', translation: { vietnamese: 'sân bay', english: 'airport' }, theme: 'Địa điểm' },
    { word: 'restaurant', translation: { vietnamese: 'nhà hàng', english: 'restaurant' }, theme: 'Địa điểm' },
    { word: 'hotel', translation: { vietnamese: 'khách sạn', english: 'hotel' }, theme: 'Địa điểm' },
    
    // Động vật
    { word: 'animal', translation: { vietnamese: 'động vật', english: 'animal' }, theme: 'Động vật' },
    { word: 'dog', translation: { vietnamese: 'con chó', english: 'dog' }, theme: 'Động vật' },
    { word: 'cat', translation: { vietnamese: 'con mèo', english: 'cat' }, theme: 'Động vật' },
    { word: 'bird', translation: { vietnamese: 'con chim', english: 'bird' }, theme: 'Động vật' },
    
    // Thời gian
    { word: 'time', translation: { vietnamese: 'thời gian', english: 'time' }, theme: 'Thời gian' },
    { word: 'clock', translation: { vietnamese: 'đồng hồ', english: 'clock' }, theme: 'Thời gian' },
    { word: 'day', translation: { vietnamese: 'ngày', english: 'day' }, theme: 'Thời gian' },
    { word: 'week', translation: { vietnamese: 'tuần', english: 'week' }, theme: 'Thời gian' },
    { word: 'month', translation: { vietnamese: 'tháng', english: 'month' }, theme: 'Thời gian' },
    { word: 'year', translation: { vietnamese: 'năm', english: 'year' }, theme: 'Thời gian' },
    { word: 'today', translation: { vietnamese: 'hôm nay', english: 'today' }, theme: 'Thời gian' },
    { word: 'tomorrow', translation: { vietnamese: 'ngày mai', english: 'tomorrow' }, theme: 'Thời gian' },
    { word: 'yesterday', translation: { vietnamese: 'hôm qua', english: 'yesterday' }, theme: 'Thời gian' },
    { word: 'morning', translation: { vietnamese: 'buổi sáng', english: 'morning' }, theme: 'Thời gian' },
    { word: 'evening', translation: { vietnamese: 'buổi tối', english: 'evening' }, theme: 'Thời gian' },
    { word: 'night', translation: { vietnamese: 'ban đêm', english: 'night' }, theme: 'Thời gian' },
    
    // Động từ thông dụng
    { word: 'be', translation: { vietnamese: 'thì, là, ở', english: 'be' }, theme: 'Động từ' },
    { word: 'have', translation: { vietnamese: 'có', english: 'have' }, theme: 'Động từ' },
    { word: 'do', translation: { vietnamese: 'làm', english: 'do' }, theme: 'Động từ' },
    { word: 'say', translation: { vietnamese: 'nói', english: 'say' }, theme: 'Động từ' },
    { word: 'get', translation: { vietnamese: 'nhận, có được', english: 'get' }, theme: 'Động từ' },
    { word: 'make', translation: { vietnamese: 'làm, chế tạo', english: 'make' }, theme: 'Động từ' },
    { word: 'go', translation: { vietnamese: 'đi', english: 'go' }, theme: 'Động từ' },
    { word: 'know', translation: { vietnamese: 'biết', english: 'know' }, theme: 'Động từ' },
    { word: 'take', translation: { vietnamese: 'lấy, cầm', english: 'take' }, theme: 'Động từ' },
    { word: 'see', translation: { vietnamese: 'nhìn, thấy', english: 'see' }, theme: 'Động từ' },
    { word: 'come', translation: { vietnamese: 'đến', english: 'come' }, theme: 'Động từ' },
    { word: 'think', translation: { vietnamese: 'nghĩ', english: 'think' }, theme: 'Động từ' },
    { word: 'look', translation: { vietnamese: 'nhìn', english: 'look' }, theme: 'Động từ' },
    { word: 'want', translation: { vietnamese: 'muốn', english: 'want' }, theme: 'Động từ' },
    { word: 'give', translation: { vietnamese: 'cho, đưa', english: 'give' }, theme: 'Động từ' },
    { word: 'use', translation: { vietnamese: 'sử dụng', english: 'use' }, theme: 'Động từ' },
    { word: 'find', translation: { vietnamese: 'tìm thấy', english: 'find' }, theme: 'Động từ' },
    { word: 'tell', translation: { vietnamese: 'kể, bảo', english: 'tell' }, theme: 'Động từ' },
    { word: 'ask', translation: { vietnamese: 'hỏi', english: 'ask' }, theme: 'Động từ' },
    { word: 'work', translation: { vietnamese: 'làm việc', english: 'work' }, theme: 'Động từ' },
    { word: 'seem', translation: { vietnamese: 'dường như', english: 'seem' }, theme: 'Động từ' },
    { word: 'feel', translation: { vietnamese: 'cảm thấy', english: 'feel' }, theme: 'Động từ' },
    { word: 'try', translation: { vietnamese: 'cố gắng, thử', english: 'try' }, theme: 'Động từ' },
    { word: 'leave', translation: { vietnamese: 'rời đi', english: 'leave' }, theme: 'Động từ' },
    { word: 'call', translation: { vietnamese: 'gọi điện', english: 'call' }, theme: 'Động từ' },
    
    // Tính từ
    { word: 'good', translation: { vietnamese: 'tốt', english: 'good' }, theme: 'Tính từ' },
    { word: 'bad', translation: { vietnamese: 'xấu, tồi', english: 'bad' }, theme: 'Tính từ' },
    { word: 'big', translation: { vietnamese: 'to, lớn', english: 'big' }, theme: 'Tính từ' },
    { word: 'small', translation: { vietnamese: 'nhỏ', english: 'small' }, theme: 'Tính từ' },
    { word: 'new', translation: { vietnamese: 'mới', english: 'new' }, theme: 'Tính từ' },
    { word: 'old', translation: { vietnamese: 'cũ, già', english: 'old' }, theme: 'Tính từ' },
    { word: 'beautiful', translation: { vietnamese: 'đẹp', english: 'beautiful' }, theme: 'Tính từ' },
    { word: 'ugly', translation: { vietnamese: 'xấu xí', english: 'ugly' }, theme: 'Tính từ' },
    { word: 'fast', translation: { vietnamese: 'nhanh', english: 'fast' }, theme: 'Tính từ' },
    { word: 'slow', translation: { vietnamese: 'chậm', english: 'slow' }, theme: 'Tính từ' },
    { word: 'cold', translation: { vietnamese: 'lạnh', english: 'cold' }, theme: 'Tính từ' },
    { word: 'hot', translation: { vietnamese: 'nóng', english: 'hot' }, theme: 'Tính từ' },
    { word: 'expensive', translation: { vietnamese: 'đắt', english: 'expensive' }, theme: 'Tính từ' },
    { word: 'cheap', translation: { vietnamese: 'rẻ', english: 'cheap' }, theme: 'Tính từ' },
    { word: 'right', translation: { vietnamese: 'đúng, bên phải', english: 'right' }, theme: 'Tính từ' },
    { word: 'wrong', translation: { vietnamese: 'sai', english: 'wrong' }, theme: 'Tính từ' },
    { word: 'happy', translation: { vietnamese: 'vui vẻ', english: 'happy' }, theme: 'Tính từ' },
    { word: 'sad', translation: { vietnamese: 'buồn', english: 'sad' }, theme: 'Tính từ' },
    
    // Màu sắc
    { word: 'color', translation: { vietnamese: 'màu sắc', english: 'color' }, theme: 'Màu sắc' },
    { word: 'red', translation: { vietnamese: 'màu đỏ', english: 'red' }, theme: 'Màu sắc' },
    { word: 'blue', translation: { vietnamese: 'màu xanh dương', english: 'blue' }, theme: 'Màu sắc' },
    { word: 'green', translation: { vietnamese: 'màu xanh lá', english: 'green' }, theme: 'Màu sắc' },
    { word: 'yellow', translation: { vietnamese: 'màu vàng', english: 'yellow' }, theme: 'Màu sắc' },
    { word: 'black', translation: { vietnamese: 'màu đen', english: 'black' }, theme: 'Màu sắc' },
    { word: 'white', translation: { vietnamese: 'màu trắng', english: 'white' }, theme: 'Màu sắc' },
    
    // Số đếm
    { word: 'zero', translation: { vietnamese: 'số không', english: 'zero' }, theme: 'Số đếm' },
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
    
    // Từ để hỏi
    { word: 'who', translation: { vietnamese: 'ai', english: 'who' }, theme: 'Từ để hỏi' },
    { word: 'what', translation: { vietnamese: 'cái gì', english: 'what' }, theme: 'Từ để hỏi' },
    { word: 'where', translation: { vietnamese: 'ở đâu', english: 'where' }, theme: 'Từ để hỏi' },
    { word: 'when', translation: { vietnamese: 'khi nào', english: 'when' }, theme: 'Từ để hỏi' },
    { word: 'why', translation: { vietnamese: 'tại sao', english: 'why' }, theme: 'Từ để hỏi' },
    { word: 'how', translation: { vietnamese: 'như thế nào', english: 'how' }, theme: 'Từ để hỏi' },
    
    // Chào hỏi & Từ thông dụng
    { word: 'hello', translation: { vietnamese: 'xin chào', english: 'hello' }, theme: 'Chào hỏi' },
    { word: 'goodbye', translation: { vietnamese: 'tạm biệt', english: 'goodbye' }, theme: 'Chào hỏi' },
    { word: 'good morning', translation: { vietnamese: 'chào buổi sáng', english: 'good morning' }, theme: 'Chào hỏi' },
    { word: 'thank you', translation: { vietnamese: 'cảm ơn', english: 'thank you' }, theme: 'Chào hỏi' },
    { word: 'please', translation: { vietnamese: 'làm ơn', english: 'please' }, theme: 'Chào hỏi' },
    { word: 'yes', translation: { vietnamese: 'vâng, có', english: 'yes' }, theme: 'Từ thông dụng' },
    { word: 'no', translation: { vietnamese: 'không', english: 'no' }, theme: 'Từ thông dụng' },
    { word: 'maybe', translation: { vietnamese: 'có lẽ', english: 'maybe' }, theme: 'Từ thông dụng' },
    { word: 'sorry', translation: { vietnamese: 'xin lỗi', english: 'sorry' }, theme: 'Từ thông dụng' },
    
    // Đại từ
    { word: 'I', translation: { vietnamese: 'tôi', english: 'I' }, theme: 'Đại từ' },
    { word: 'you', translation: { vietnamese: 'bạn, các bạn', english: 'you' }, theme: 'Đại từ' },
    { word: 'he', translation: { vietnamese: 'anh ấy', english: 'he' }, theme: 'Đại từ' },
    { word: 'she', translation: { vietnamese: 'cô ấy', english: 'she' }, theme: 'Đại từ' },
    { word: 'it', translation: { vietnamese: 'nó', english: 'it' }, theme: 'Đại từ' },
    { word: 'we', translation: { vietnamese: 'chúng tôi', english: 'we' }, theme: 'Đại từ' },
    { word: 'they', translation: { vietnamese: 'họ', english: 'they' }, theme: 'Đại từ' },
];

const chineseA1Words: { word: string; translation: { vietnamese: string, english: string }, theme: string }[] = [
    // Con người & Gia đình
    { word: '人 (rén)', translation: { vietnamese: 'người', english: 'person' }, theme: 'Con người' },
    { word: '男人 (nánrén)', translation: { vietnamese: 'đàn ông', english: 'man' }, theme: 'Con người' },
    { word: '女人 (nǚrén)', translation: { vietnamese: 'phụ nữ', english: 'woman' }, theme: 'Con người' },
    { word: '孩子 (háizi)', translation: { vietnamese: 'đứa trẻ', english: 'child' }, theme: 'Con người' },
    { word: '家 (jiā)', translation: { vietnamese: 'nhà, gia đình', english: 'home, family' }, theme: 'Gia đình' },
    { word: '爸爸 (bàba)', translation: { vietnamese: 'bố', english: 'dad' }, theme: 'Gia đình' },
    { word: '妈妈 (māma)', translation: { vietnamese: 'mẹ', english: 'mom' }, theme: 'Gia đình' },
    { word: '儿子 (érzi)', translation: { vietnamese: 'con trai', english: 'son' }, theme: 'Gia đình' },
    { word: '女儿 (nǚ\'ér)', translation: { vietnamese: 'con gái', english: 'daughter' }, theme: 'Gia đình' },
    { word: '朋友 (péngyou)', translation: { vietnamese: 'bạn bè', english: 'friend' }, theme: 'Con người' },

    // Công việc & Trường học
    { word: '工作 (gōngzuò)', translation: { vietnamese: 'công việc, làm việc', english: 'work, to work' }, theme: 'Công việc' },
    { word: '老师 (lǎoshī)', translation: { vietnamese: 'giáo viên', english: 'teacher' }, theme: 'Công việc' },
    { word: '医生 (yīshēng)', translation: { vietnamese: 'bác sĩ', english: 'doctor' }, theme: 'Công việc' },
    { word: '学生 (xuéshēng)', translation: { vietnamese: 'học sinh', english: 'student' }, theme: 'Công việc' },
    { word: '学习 (xuéxí)', translation: { vietnamese: 'học tập', english: 'to study, to learn' }, theme: 'Động từ' },
    { word: '学校 (xuéxiào)', translation: { vietnamese: 'trường học', english: 'school' }, theme: 'Trường học' },
    { word: '大学 (dàxué)', translation: { vietnamese: 'đại học', english: 'university' }, theme: 'Trường học' },
    { word: '书 (shū)', translation: { vietnamese: 'sách', english: 'book' }, theme: 'Trường học' },
    { word: '笔 (bǐ)', translation: { vietnamese: 'bút', english: 'pen' }, theme: 'Trường học' },
    
    // Thức ăn & Đồ uống
    { word: '吃 (chī)', translation: { vietnamese: 'ăn', english: 'to eat' }, theme: 'Động từ' },
    { word: '喝 (hē)', translation: { vietnamese: 'uống', english: 'to drink' }, theme: 'Động từ' },
    { word: '饭 (fàn)', translation: { vietnamese: 'cơm', english: 'rice, meal' }, theme: 'Thức ăn' },
    { word: '菜 (cài)', translation: { vietnamese: 'món ăn, rau', english: 'dish, vegetable' }, theme: 'Thức ăn' },
    { word: '水果 (shuǐguǒ)', translation: { vietnamese: 'hoa quả', english: 'fruit' }, theme: 'Thức ăn' },
    { word: '苹果 (píngguǒ)', translation: { vietnamese: 'quả táo', english: 'apple' }, theme: 'Thức ăn' },
    { word: '水 (shuǐ)', translation: { vietnamese: 'nước', english: 'water' }, theme: 'Đồ uống' },
    { word: '茶 (chá)', translation: { vietnamese: 'trà', english: 'tea' }, theme: 'Đồ uống' },
    { word: '咖啡 (kāfēi)', translation: { vietnamese: 'cà phê', english: 'coffee' }, theme: 'Đồ uống' },
    
    // Địa điểm
    { word: '地方 (dìfang)', translation: { vietnamese: 'nơi, địa điểm', english: 'place' }, theme: 'Địa điểm' },
    { word: '中国 (Zhōngguó)', translation: { vietnamese: 'Trung Quốc', english: 'China' }, theme: 'Địa điểm' },
    { word: '北京 (Běijīng)', translation: { vietnamese: 'Bắc Kinh', english: 'Beijing' }, theme: 'Địa điểm' },
    { word: '商店 (shāngdiàn)', translation: { vietnamese: 'cửa hàng', english: 'shop' }, theme: 'Địa điểm' },
    { word: '医院 (yīyuàn)', translation: { vietnamese: 'bệnh viện', english: 'hospital' }, theme: 'Địa điểm' },
    { word: '火车站 (huǒchēzhàn)', translation: { vietnamese: 'ga tàu hỏa', english: 'train station' }, theme: 'Địa điểm' },
    { word: '飞机场 (fēijīchǎng)', translation: { vietnamese: 'sân bay', english: 'airport' }, theme: 'Địa điểm' },
    { word: '饭店 (fàndiàn)', translation: { vietnamese: 'nhà hàng, khách sạn', english: 'restaurant, hotel' }, theme: 'Địa điểm' },
    
    // Thời gian
    { word: '时间 (shíjiān)', translation: { vietnamese: 'thời gian', english: 'time' }, theme: 'Thời gian' },
    { word: '年 (nián)', translation: { vietnamese: 'năm', english: 'year' }, theme: 'Thời gian' },
    { word: '月 (yuè)', translation: { vietnamese: 'tháng', english: 'month' }, theme: 'Thời gian' },
    { word: '日 (rì)', translation: { vietnamese: 'ngày', english: 'day' }, theme: 'Thời gian' },
    { word: '天 (tiān)', translation: { vietnamese: 'ngày, trời', english: 'day, sky' }, theme: 'Thời gian' },
    { word: '今天 (jīntiān)', translation: { vietnamese: 'hôm nay', english: 'today' }, theme: 'Thời gian' },
    { word: '明天 (míngtiān)', translation: { vietnamese: 'ngày mai', english: 'tomorrow' }, theme: 'Thời gian' },
    { word: '昨天 (zuótiān)', translation: { vietnamese: 'hôm qua', english: 'yesterday' }, theme: 'Thời gian' },
    { word: '上午 (shàngwǔ)', translation: { vietnamese: 'buổi sáng', english: 'morning' }, theme: 'Thời gian' },
    { word: '中午 (zhōngwǔ)', translation: { vietnamese: 'buổi trưa', english: 'noon' }, theme: 'Thời gian' },
    { word: '下午 (xiàwǔ)', translation: { vietnamese: 'buổi chiều', english: 'afternoon' }, theme: 'Thời gian' },
    { word: '晚上 (wǎnshang)', translation: { vietnamese: 'buổi tối', english: 'evening' }, theme: 'Thời gian' },
    { word: '点 (diǎn)', translation: { vietnamese: 'giờ', english: 'o\'clock' }, theme: 'Thời gian' },
    { word: '分钟 (fēnzhōng)', translation: { vietnamese: 'phút', english: 'minute' }, theme: 'Thời gian' },
    
    // Động từ thông dụng
    { word: '是 (shì)', translation: { vietnamese: 'là', english: 'to be' }, theme: 'Động từ' },
    { word: '有 (yǒu)', translation: { vietnamese: 'có', english: 'to have' }, theme: 'Động từ' },
    { word: '看 (kàn)', translation: { vietnamese: 'nhìn, xem, đọc', english: 'to see, to watch, to read' }, theme: 'Động từ' },
    { word: '听 (tīng)', translation: { vietnamese: 'nghe', english: 'to listen' }, theme: 'Động từ' },
    { word: '说 (shuō)', translation: { vietnamese: 'nói', english: 'to speak' }, theme: 'Động từ' },
    { word: '读 (dú)', translation: { vietnamese: 'đọc', english: 'to read' }, theme: 'Động từ' },
    { word: '写 (xiě)', translation: { vietnamese: 'viết', english: 'to write' }, theme: 'Động từ' },
    { word: '做 (zuò)', translation: { vietnamese: 'làm', english: 'to do, to make' }, theme: 'Động từ' },
    { word: '买 (mǎi)', translation: { vietnamese: 'mua', english: 'to buy' }, theme: 'Động từ' },
    { word: '卖 (mài)', translation: { vietnamese: 'bán', english: 'to sell' }, theme: 'Động từ' },
    { word: '去 (qù)', translation: { vietnamese: 'đi', english: 'to go' }, theme: 'Động từ' },
    { word: '来 (lái)', translation: { vietnamese: 'đến', english: 'to come' }, theme: 'Động từ' },
    { word: '住 (zhù)', translation: { vietnamese: 'sống, ở', english: 'to live' }, theme: 'Động từ' },
    { word: '爱 (ài)', translation: { vietnamese: 'yêu', english: 'to love' }, theme: 'Động từ' },
    { word: '喜欢 (xǐhuan)', translation: { vietnamese: 'thích', english: 'to like' }, theme: 'Động từ' },
    { word: '想 (xiǎng)', translation: { vietnamese: 'muốn, nghĩ, nhớ', english: 'to want, to think, to miss' }, theme: 'Động từ' },
    { word: '认识 (rènshi)', translation: { vietnamese: 'biết, quen', english: 'to know, to recognize' }, theme: 'Động từ' },
    { word: '会 (huì)', translation: { vietnamese: 'biết, có thể, sẽ', english: 'can, to be able to, will' }, theme: 'Động từ' },
    { word: '能 (néng)', translation: { vietnamese: 'có thể', english: 'can, to be able to' }, theme: 'Động từ' },
    { word: '叫 (jiào)', translation: { vietnamese: 'gọi, tên là', english: 'to be called' }, theme: 'Động từ' },
    
    // Tính từ
    { word: '好 (hǎo)', translation: { vietnamese: 'tốt, khỏe', english: 'good' }, theme: 'Tính từ' },
    { word: '不好 (bù hǎo)', translation: { vietnamese: 'không tốt', english: 'not good' }, theme: 'Tính từ' },
    { word: '大 (dà)', translation: { vietnamese: 'to, lớn', english: 'big' }, theme: 'Tính từ' },
    { word: '小 (xiǎo)', translation: { vietnamese: 'nhỏ, bé', english: 'small' }, theme: 'Tính từ' },
    { word: '多 (duō)', translation: { vietnamese: 'nhiều', english: 'many, much' }, theme: 'Tính từ' },
    { word: '少 (shǎo)', translation: { vietnamese: 'ít', english: 'few, little' }, theme: 'Tính từ' },
    { word: '冷 (lěng)', translation: { vietnamese: 'lạnh', english: 'cold' }, theme: 'Tính từ' },
    { word: '热 (rè)', translation: { vietnamese: 'nóng', english: 'hot' }, theme: 'Tính từ' },
    { word: '高兴 (gāoxìng)', translation: { vietnamese: 'vui vẻ', english: 'happy' }, theme: 'Tính từ' },
    { word: '漂亮 (piàoliang)', translation: { vietnamese: 'xinh đẹp', english: 'beautiful' }, theme: 'Tính từ' },
    { word: '贵 (guì)', translation: { vietnamese: 'đắt', english: 'expensive' }, theme: 'Tính từ' },
    { word: '便宜 (piányi)', translation: { vietnamese: 'rẻ', english: 'cheap' }, theme: 'Tính từ' },
    
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
    { word: '百 (bǎi)', translation: { vietnamese: 'trăm', english: 'hundred' }, theme: 'Số đếm' },
    
    // Từ để hỏi
    { word: '谁 (shéi)', translation: { vietnamese: 'ai', english: 'who' }, theme: 'Từ để hỏi' },
    { word: '什么 (shénme)', translation: { vietnamese: 'cái gì', english: 'what' }, theme: 'Từ để hỏi' },
    { word: '哪儿 (nǎr)', translation: { vietnamese: 'ở đâu', english: 'where' }, theme: 'Từ để hỏi' },
    { word: '什么时候 (shénme shíhou)', translation: { vietnamese: 'khi nào', english: 'when' }, theme: 'Từ để hỏi' },
    { word: '为什么 (wèishénme)', translation: { vietnamese: 'tại sao', english: 'why' }, theme: 'Từ để hỏi' },
    { word: '怎么 (zěnme)', translation: { vietnamese: 'như thế nào', english: 'how' }, theme: 'Từ để hỏi' },
    { word: '多少 (duōshao)', translation: { vietnamese: 'bao nhiêu', english: 'how much, how many' }, theme: 'Từ để hỏi' },
    { word: '几 (jǐ)', translation: { vietnamese: 'mấy', english: 'how many (for small numbers)' }, theme: 'Từ để hỏi' },
    
    // Chào hỏi & Từ thông dụng
    { word: '你好 (nǐ hǎo)', translation: { vietnamese: 'xin chào', english: 'hello' }, theme: 'Chào hỏi' },
    { word: '再见 (zàijiàn)', translation: { vietnamese: 'tạm biệt', english: 'goodbye' }, theme: 'Chào hỏi' },
    { word: '谢谢 (xièxie)', translation: { vietnamese: 'cảm ơn', english: 'thank you' }, theme: 'Chào hỏi' },
    { word: '不客气 (bú kèqi)', translation: { vietnamese: 'đừng khách sáo', english: 'you\'re welcome' }, theme: 'Chào hỏi' },
    { word: '对不起 (duìbuqǐ)', translation: { vietnamese: 'xin lỗi', english: 'sorry' }, theme: 'Chào hỏi' },
    { word: '没关系 (méi guānxi)', translation: { vietnamese: 'không sao', english: 'it doesn\'t matter' }, theme: 'Chào hỏi' },
    
    // Đại từ
    { word: '我 (wǒ)', translation: { vietnamese: 'tôi', english: 'I, me' }, theme: 'Đại từ' },
    { word: '你 (nǐ)', translation: { vietnamese: 'bạn', english: 'you' }, theme: 'Đại từ' },
    { word: '他 (tā)', translation: { vietnamese: 'anh ấy', english: 'he, him' }, theme: 'Đại từ' },
    { word: '她 (tā)', translation: { vietnamese: 'cô ấy', english: 'she, her' }, theme: 'Đại từ' },
    { word: '它 (tā)', translation: { vietnamese: 'nó', english: 'it' }, theme: 'Đại từ' },
    { word: '我们 (wǒmen)', translation: { vietnamese: 'chúng tôi', english: 'we, us' }, theme: 'Đại từ' },
    { word: '你们 (nǐmen)', translation: { vietnamese: 'các bạn', english: 'you (plural)' }, theme: 'Đại từ' },
    { word: '他们 (tāmen)', translation: { vietnamese: 'họ (nam/cả nam lẫn nữ)', english: 'they, them (male/mixed)' }, theme: 'Đại từ' },
    { word: '她们 (tāmen)', translation: { vietnamese: 'họ (nữ)', english: 'they, them (female)' }, theme: 'Đại từ' },
    { word: '这 (zhè)', translation: { vietnamese: 'đây, này', english: 'this' }, theme: 'Đại từ' },
    { word: '那 (nà)', translation: { vietnamese: 'kia, đó', english: 'that' }, theme: 'Đại từ' },
];

const createDefaultWords = (wordList: any[]): VocabularyWord[] => {
    return wordList.map((entry, index) => ({
        id: `default-${index}-${(entry.word || entry.german).replace(/\s/g, '')}`,
        word: entry.word || entry.german,
        translation: entry.translation,
        theme: entry.theme,
        createdAt: Date.now() - index * 1000,
        isStarred: false,
    })).sort((a, b) => b.createdAt - a.createdAt);
};

const defaultWords: Record<LearningLanguage, VocabularyWord[]> = {
    german: createDefaultWords(germanA1Words),
    english: createDefaultWords(englishA1Words),
    chinese: createDefaultWords(chineseA1Words),
};

export const VocabularyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { learningLanguage } = useSettings();
  const [allWords, setAllWords] = useState<Record<LearningLanguage, VocabularyWord[]>>(() => {
    try {
      const savedData = localStorage.getItem('vocabulary');
      if (!savedData) return defaultWords;

      const parsedData = JSON.parse(savedData);

      // Check if the saved data has the new structure. If so, merge it with defaults.
      // This preserves user-added words while updating the default set.
      if (parsedData.german || parsedData.english || parsedData.chinese) {
        const merged = {
          german: [...(parsedData.german || [])],
          english: [...(parsedData.english || [])],
          chinese: [...(parsedData.chinese || [])],
        };
        // Add new default words that the user doesn't already have
        defaultWords.german.forEach(dw => { if (!merged.german.some(uw => uw.word === dw.word)) merged.german.push(dw) });
        defaultWords.english.forEach(dw => { if (!merged.english.some(uw => uw.word === dw.word)) merged.english.push(dw) });
        defaultWords.chinese.forEach(dw => { if (!merged.chinese.some(uw => uw.word === dw.word)) merged.chinese.push(dw) });
        return merged;
      }

      if (Array.isArray(parsedData)) {
        console.log("Migrating old vocabulary format...");
        const migratedGermanWords = parsedData.map(word => {
            const { german, ...rest } = word;
            return { ...rest, word: german, isStarred: word.isStarred || false };
        });
        const newStructure = { ...defaultWords, german: migratedGermanWords };
        localStorage.setItem('vocabulary', JSON.stringify(newStructure)); 
        return newStructure;
      }
      
      return defaultWords;
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
    <VocabularyContext.Provider value={{ words, addWord, addMultipleWords, deleteWord, updateWord, updateWordImage, getWordsForStory, getAvailableThemes, toggleWordStar, lastDeletedWord, undoDelete }}>
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