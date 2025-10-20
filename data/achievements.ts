import { HistoryEntry } from "../types";
import { BookCopy, Flame, Star, BookOpen, CheckSquare, BrainCircuit, Users, PenSquare, Layers, Award, Puzzle, Shuffle, Link as LinkIcon, Dices, Wand2, Library, Image as ImageIcon } from 'lucide-react';
// FIX: Add missing React import for React.ElementType
import React from 'react';

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: React.ElementType;
    levels: [number, number, number, number, number];
    source: 'stats.totalWords' | 'stats.currentStreak' | 'stats.longestStreak' | `stats.achievementCounters.${HistoryEntry['type']}`;
}

export const achievementsList: Achievement[] = [
    {
        id: 'wordCollector',
        name: 'Người Sưu Tầm',
        description: 'Thêm từ mới vào bộ sưu tập của bạn.',
        icon: BookCopy,
        levels: [25, 100, 250, 500, 1000],
        source: 'stats.totalWords'
    },
    {
        id: 'dailyStreak',
        name: 'Ngọn Lửa Bất Diệt',
        description: 'Duy trì chuỗi học tập hàng ngày của bạn.',
        icon: Flame,
        levels: [3, 7, 14, 30, 60],
        source: 'stats.currentStreak'
    },
    {
        id: 'perfectStreak',
        name: 'Huyền Thoại Bền Bỉ',
        description: 'Thiết lập kỷ lục chuỗi học tập dài nhất.',
        icon: Star,
        levels: [5, 10, 20, 40, 75],
        source: 'stats.longestStreak'
    },
    {
        id: 'storyteller',
        name: 'Tiểu Thuyết Gia',
        description: 'Sử dụng công cụ AI tạo truyện để sáng tạo.',
        icon: BookOpen,
        levels: [1, 5, 10, 25, 50],
        source: 'stats.achievementCounters.STORY_GENERATED'
    },
    {
        id: 'quizMaster',
        name: 'Bậc Thầy Đố Vui',
        description: 'Hoàn thành các bài kiểm tra trắc nghiệm.',
        icon: CheckSquare,
        levels: [3, 10, 25, 50, 100],
        source: 'stats.achievementCounters.QUIZ_COMPLETED'
    },
    {
        id: 'scholar',
        name: 'Học Giả',
        description: 'Hoàn thành các phiên ôn tập thông minh (SRS).',
        icon: BrainCircuit,
        levels: [1, 5, 15, 30, 50],
        source: 'stats.achievementCounters.REVIEW_SESSION_COMPLETED'
    },
    {
        id: 'tutorEnthusiast',
        name: 'Bạn Của AI',
        description: 'Thực hành hội thoại với Gia sư AI.',
        icon: Users,
        levels: [1, 3, 7, 15, 30],
        source: 'stats.achievementCounters.AI_TUTOR_SESSION_COMPLETED'
    },
    {
        id: 'practiceMakesPerfect',
        name: 'Chăm Chỉ Luyện Tập',
        description: 'Hoàn thành các phiên Luyện tập Viết.',
        icon: PenSquare,
        levels: [3, 10, 25, 50, 100],
        source: 'stats.achievementCounters.PRACTICE_SESSION_COMPLETED'
    },
    {
        id: 'flashcardFanatic',
        name: 'Tín Đồ Flashcard',
        description: 'Bắt đầu các phiên học với Thẻ ghi nhớ.',
        icon: Layers,
        levels: [5, 15, 30, 60, 120],
        source: 'stats.achievementCounters.FLASHCARDS_SESSION_STARTED'
    },
    {
        id: 'memoryMaster',
        name: 'Bậc Thầy Trí Nhớ',
        description: 'Chiến thắng trò chơi Lật thẻ Cặp đôi.',
        icon: Award,
        levels: [3, 10, 25, 50, 100],
        source: 'stats.achievementCounters.MEMORY_MATCH_WON'
    },
    {
        id: 'wordGuesser',
        name: 'Vua Đoán Chữ',
        description: 'Chiến thắng trò chơi Đoán chữ.',
        icon: Puzzle,
        levels: [3, 10, 25, 50, 100],
        source: 'stats.achievementCounters.WORD_GUESS_WON'
    },
    {
        id: 'sentenceScrambler',
        name: 'Nhà Sắp Xếp',
        description: 'Hoàn thành các thử thách Sắp xếp câu.',
        icon: Shuffle,
        levels: [5, 15, 30, 60, 120],
        source: 'stats.achievementCounters.SENTENCE_SCRAMBLE_WON'
    },
    {
        id: 'wordLinker',
        name: 'Người Kết Nối',
        description: 'Hoàn thành các màn chơi Nối từ.',
        icon: LinkIcon,
        levels: [3, 10, 25, 50, 100],
        source: 'stats.achievementCounters.WORD_LINK_COMPLETED'
    },
    {
        id: 'luckySpinner',
        name: 'Tay Quay May Mắn',
        description: 'Trả lời đúng các câu hỏi trong Vòng quay Từ vựng.',
        icon: Dices,
        levels: [5, 20, 50, 100, 200],
        source: 'stats.achievementCounters.LUCKY_WHEEL_CORRECT_ANSWER'
    },
    {
        id: 'sentenceArchitect',
        name: 'Kiến Trúc Sư Câu Chữ',
        description: 'Tạo câu ví dụ với sự trợ giúp của AI.',
        icon: Wand2,
        levels: [10, 25, 50, 100, 200],
        source: 'stats.achievementCounters.SENTENCE_GENERATED'
    },
    {
        id: 'grammarGuru',
        name: 'Chuyên Gia Ngữ Pháp',
        description: 'Sử dụng công cụ kiểm tra ngữ pháp của AI.',
        icon: CheckSquare, // Reusing icon
        levels: [3, 10, 25, 50, 100],
        source: 'stats.achievementCounters.GRAMMAR_CHECK_COMPLETED'
    },
    {
        id: 'lessonLearner',
        name: 'Người Ham Học Hỏi',
        description: 'Tạo các bài học chuyên sâu với AI.',
        icon: Library,
        levels: [1, 3, 7, 15, 30],
        source: 'stats.achievementCounters.AI_LESSON_GENERATED'
    },
    {
        id: 'imageExplorer',
        name: 'Nhà Thám Hiểm Ảnh',
        description: 'Xác định các đối tượng trong ảnh bằng AI.',
        icon: ImageIcon,
        levels: [5, 15, 30, 60, 120],
        source: 'stats.achievementCounters.IMAGE_OBJECT_IDENTIFIED'
    },
    {
        id: 'speechSynthesizer',
        name: 'Thính Giả Vàng',
        description: 'Nghe AI phát âm từ vựng.',
        icon: BrainCircuit, // Re-using, signifies learning
        levels: [10, 50, 100, 250, 500],
        source: 'stats.achievementCounters.SPEECH_GENERATED'
    },
    {
        id: 'loginLoyalty',
        name: 'Người Dùng Thân Thiết',
        description: 'Đăng nhập vào ứng dụng thường xuyên.',
        icon: Users, // Re-using
        levels: [3, 7, 14, 30, 50],
        source: 'stats.achievementCounters.LOGIN'
    }
];