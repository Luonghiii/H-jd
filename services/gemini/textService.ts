import { Type } from "@google/genai";
import { 
    GeneratedWord, 
    WordInfo, 
    VocabularyWord, 
    TargetLanguage, 
    LearningLanguage, 
    ChatMessage, 
    AiLesson, 
    UserStats, 
    HistoryEntry, 
    AiSuggestion,
    ConversationAnalysis,
    AiAssistantMessage,
    ArticleResult
} from '../../types';
import { executeWithKeyRotation } from './client';

export const translateWord = async (word: string, targetLanguage: 'English' | 'Vietnamese', learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Translate the ${learningLanguage} word "${word}" to ${targetLanguage}. Return only the translation.`,
        });
        return response.text;
    });
};

export const generateWordsFromPrompt = async (prompt: string, existingWords: string[], learningLanguage: LearningLanguage, themes: string[]): Promise<GeneratedWord[]> => {
    return executeWithKeyRotation(async (ai) => {
        const themesInstruction = themes.length > 0 ? `Try to use one of these existing themes: [${themes.join(', ')}].` : `Assign a general Vietnamese theme.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a list of ${learningLanguage} words for "${prompt}". For each: provide "translation_vi", "translation_en", and "theme". ${themesInstruction} Do not include: ${existingWords.join(', ')}. Respond as a JSON array of objects. If none, return [].`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text.trim().replace(/^```json\n/, '').replace(/\n```$/, ''));
    });
};

export const getWordsFromFile = async (base64: string, mimeType: string, existingWords: string[], learningLanguage: string, themes: string[]): Promise<GeneratedWord[]> => {
    return executeWithKeyRotation(async (ai) => {
        const themesInstruction = themes.length > 0 ? `Try to use an existing theme: [${themes.join(', ')}].` : `Assign a general Vietnamese theme.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [
                { inlineData: { data: base64, mimeType } },
                { text: `Extract up to 20 key ${learningLanguage} vocabulary words. For each: provide "translation_vi", "translation_en", and "theme". ${themesInstruction} Don't include: ${existingWords.join(', ')}. Respond as a JSON array. If none, return [].` }
            ]},
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text.trim().replace(/^```json\n/, '').replace(/\n```$/, ''));
    });
};

export const generateStory = async (words: string[], uiLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Write a short story (50-70 words) in ${learningLanguage} including: ${words.join(', ')}. Then, add "---Translation---" and provide the ${uiLanguage} translation.`,
        });
        return response.text;
    });
};

export const generateSentence = async (word: VocabularyWord, uiLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create a simple sentence in ${learningLanguage} using "${word.word}". Then add "---Translation---" and the ${uiLanguage} translation.`,
        });
        return response.text;
    });
};

export const generateQuizForWord = async (word: VocabularyWord, targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<{ question: string, options: string[], correctAnswer: string }> => {
    return executeWithKeyRotation(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create a multiple-choice quiz for the ${learningLanguage} word "${word.word}". The correct answer is "${word.translation[targetLanguage]}". Generate 3 incorrect options. Respond as a JSON object with keys "question", "options" (shuffled array), and "correctAnswer".`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text.trim().replace(/^```json\n/, '').replace(/\n```$/, ''));
    });
};

export const getQuickWordAnalysis = async (word: string, targetLanguageStr: string, learningLanguage: LearningLanguage): Promise<{ translation: string; partOfSpeech: string; theme: string } | null> => {
     return executeWithKeyRotation(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the ${learningLanguage} word "${word}". Respond in JSON with its "translation" in ${targetLanguageStr}, its "partOfSpeech", and a Vietnamese "theme".`,
            config: { responseMimeType: "application/json" },
        });
        return JSON.parse(response.text.trim().replace(/^```json\n/, '').replace(/\n```$/, ''));
    });
};

export const getWordInfo = async (word: string, uiLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<WordInfo> => {
    return executeWithKeyRotation(async (ai) => {
        const genderField = learningLanguage === 'german' ? `If it's a noun, provide its "gender" ("der", "die", or "das").` : '';
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Provide info for the ${learningLanguage} word "${word}". Respond as a JSON object with a "definition" in ${uiLanguage}, "partOfSpeech". ${genderField}`,
            config: { responseMimeType: "application/json" },
        });
        return JSON.parse(response.text.trim().replace(/^```json\n/, '').replace(/\n```$/, ''));
    });
};

export const checkSentence = async (sentence: string, wordInSentence: string, uiLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `User wrote in ${learningLanguage}: "${sentence}" to practice "${wordInSentence}". Check for errors and give short, constructive feedback in ${uiLanguage}. If correct, say so.`,
        });
        return response.text;
    });
};

export const rewriteSentence = async (sentence: string, wordInSentence: string, uiLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Rewrite the user's ${learningLanguage} sentence to be more natural/correct, keeping "${wordInSentence}": "${sentence}". Explain changes briefly in ${uiLanguage}.`,
        });
        return response.text;
    });
};

export const getChatResponseForWord = async (word: VocabularyWord, userQuestion: string, chatHistory: ChatMessage[], uiLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const historyText = chatHistory.map(m => `${m.role}: ${m.text}`).join('\n');
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `You are a language tutor. The user is asking about the ${learningLanguage} word "${word.word}". History:\n${historyText}\nUser asks: "${userQuestion}"\nAnswer concisely in ${uiLanguage}.`,
        });
        return response.text;
    });
};

export const findAndSummarizeArticle = async (topic: string, learningLanguage: LearningLanguage, mode: 'summary' | 'full'): Promise<ArticleResult | null> => {
    return executeWithKeyRotation(async (ai) => {
        let prompt = '';

        if (mode === 'summary') {
            prompt = `Find and summarize a short, simple article or news piece in ${learningLanguage} about the topic "${topic}". The summary must be suitable for a beginner language learner. Extract only the main summary text.`;
        } else { // mode === 'full'
            prompt = `Find an article or news piece in ${learningLanguage} about the topic "${topic}" that is suitable for a beginner language learner. Return the full, complete, and unabridged content of that article. Do not add any commentary or introduction. Just return the full article text.`;
        }
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const sources: { uri: string; title: string }[] = [];
        if (groundingChunks) {
            for (const chunk of groundingChunks) {
                if (chunk.web) {
                    sources.push({
                        uri: chunk.web.uri || '',
                        title: chunk.web.title || 'Nguồn không có tiêu đề',
                    });
                }
            }
        }
        
        if (!response.text) {
            return null;
        }

        return {
            text: response.text,
            sources: sources,
        };
    });
};


export const generateDailySuggestions = async (words: VocabularyWord[], stats: UserStats, activityLog: HistoryEntry[], learningLanguage: LearningLanguage): Promise<AiSuggestion[]> => {
     return executeWithKeyRotation(async (ai) => {
        const prompt = `Based on the user's vocabulary (count: ${words.length}), stats (current streak: ${stats.currentStreak}), and recent activities, generate 2-3 personalized suggestions to help them learn ${learningLanguage}. Respond as a JSON array of objects, each with "title", "description", and an "action" object with "type" ('NAVIGATE', 'FOCUS', 'NONE'), and optionally "view" or "details". Example action: { "type": "NAVIGATE", "view": "games" }. Keep descriptions short.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', contents: prompt, config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text.trim().replace(/^```json\n/, '').replace(/\n```$/, ''));
    });
};

export const generateHintsForWord = async (word: VocabularyWord, uiLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<{ hint1: string, hint2: string, hint3: string, hint4: string }> => {
    return executeWithKeyRotation(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate 4 hints in ${uiLanguage} for the ${learningLanguage} word "${word.word}". Respond as a JSON object with keys "hint1" (riddle), "hint2" (category/theme: "${word.theme}"), "hint3" (sentence with blank), and "hint4" (first letter).`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text.trim().replace(/^```json\n/, '').replace(/\n```$/, ''));
    });
};

export const generateScrambledSentence = async (word: VocabularyWord, learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create one simple, correct sentence in ${learningLanguage} using the word "${word.word}". Return only the sentence.`,
        });
        return response.text.trim();
    });
};

export const checkGrammar = async (text: string, learningLanguage: LearningLanguage, uiLanguage: TargetLanguage): Promise<{ correctedText: string; feedback: { error: string; correction: string; explanation: string }[] } | null> => {
     return executeWithKeyRotation(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Analyze this ${learningLanguage} text: "${text}". Respond as JSON with "correctedText" and an array "feedback" (with "error", "correction", "explanation" in ${uiLanguage}). If no errors, "feedback" is empty.`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text.trim().replace(/^```json\n/, '').replace(/\n```$/, ''));
    });
};

export const generateWritingPrompt = (uiLanguage: TargetLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a simple writing prompt in ${uiLanguage} for a language learner. Return only the prompt string.`,
        });
        return response.text;
    });
};

export const getChatResponseForTutor = async (history: { user: string, model: string }[], userMessage: string, learningLanguage: LearningLanguage, uiLanguage: TargetLanguage): Promise<string> => {
     return executeWithKeyRotation(async (ai) => {
        const historyText = history.map(t => `User: ${t.user}\nAI: ${t.model}`).join('\n\n');
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `You are a friendly ${learningLanguage} tutor. The user's native language is ${uiLanguage}. History:\n${historyText}\nUser's message: "${userMessage}"\nYour concise response (in ${learningLanguage}):`
        });
        return response.text;
    });
};

export const generateAiLesson = async (theme: string, learningLanguage: LearningLanguage, uiLanguage: TargetLanguage): Promise<AiLesson | null> => {
    return executeWithKeyRotation(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Create a mini-lesson in ${learningLanguage} about "${theme}". Respond as a JSON object with keys: "vocabulary" (array of {word, translation in ${uiLanguage}}), "dialogue" (array of {speaker, line}), "story" (short string), and "grammarTip" ({title, explanation in ${uiLanguage}}).`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text.trim().replace(/^```json\n/, '').replace(/\n```$/, ''));
    });
};

export const validateDuelWord = async (word: string, usedWords: string[], learningLanguage: LearningLanguage, context: any): Promise<{ isValid: boolean, reason?: string }> => {
     return executeWithKeyRotation(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Game: Vocabulary Duel in ${learningLanguage}. Context: ${JSON.stringify(context)}. Used words: [${usedWords.join(', ')}]. Player submitted: "${word}". Is this word valid according to the rules and context? Is it a real word? Is it a duplicate? Respond in JSON: {"isValid": boolean, "reason": "Explain why in Vietnamese if not valid"}.`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text.trim().replace(/^```json\n/, '').replace(/\n```$/, ''));
    });
};

export const getAiDuelWord = async (usedWords: string[], learningLanguage: LearningLanguage, difficulty: string, context: any): Promise<{ word: string }> => {
    return executeWithKeyRotation(async (ai) => {
        const prompt = `Game: Vocabulary Duel in ${learningLanguage}. It's my (AI's) turn. My difficulty is ${difficulty}. Context: ${JSON.stringify(context)}. Words already used: [${usedWords.join(', ')}]. Give me one valid, new word. If you cannot find a word, respond with an empty string. Return just the word string.`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });
        return { word: response.text.trim() };
    });
};

export const getAiSuggestedWords = async (prompt: string, availableWords: VocabularyWord[], learningLanguage: LearningLanguage): Promise<VocabularyWord[]> => {
    return executeWithKeyRotation(async (ai) => {
        const wordList = availableWords.map(w => `"${w.word}" (SRS Level: ${w.srsLevel}, Theme: ${w.theme || 'none'})`).join('; ');
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `From this list of ${learningLanguage} words: [${wordList}], select the words that best match the user's request: "${prompt}". Your response MUST be a JSON array of just the matching word strings, e.g., ["word1", "word2"].`,
             config: { responseMimeType: "application/json" }
        });
        const suggestedWordStrings = JSON.parse(response.text.trim().replace(/^```json\n/, '').replace(/\n```$/, '')) as string[];
        return availableWords.filter(w => suggestedWordStrings.includes(w.word));
    });
};

export const getAiAssistantResponse = async (message: string, history: AiAssistantMessage[], context: any): Promise<{ responseText: string, functionCalls?: any[] }> => {
     const navigateToGame = {
        name: 'navigateToGame',
        parameters: { type: Type.OBJECT, properties: { gameName: { type: Type.STRING, description: 'The name of the game to navigate to.' } } },
    };
    return executeWithKeyRotation(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `... (implementation with function calling) ...`,
            config: { tools: [{ functionDeclarations: [navigateToGame] }] }
        });
        // This is a simplified placeholder. A real implementation would parse response.functionCalls
        return { responseText: 'Đây là câu trả lời mẫu từ Trợ lý AI.' };
    });
};