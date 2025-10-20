import { GoogleGenAI, Type, Modality, FunctionDeclaration } from "@google/genai";
import { VocabularyWord, WordInfo, TargetLanguage, LearningLanguage, ChatMessage, GeneratedWord, Quiz, AiLesson, UserStats, Turn, HistoryEntry, AiAssistantMessage, View } from '../types';
import eventBus from '../utils/eventBus';

let currentApiIndex = 0;
let userApiKeys: string[] = [];

// FIX: Define types used internally but not exported from their origin files.
type Feedback = {
    correctedText: string;
    feedback: { error: string; correction: string; explanation: string }[];
} | null;

type DuelContext = { mode: 'theme', theme: string } | { mode: 'longest', startingLetter: string } | { mode: 'chain', lastWord: string } | { mode: 'first', theme: string };


export const setApiKeys = (keys: string[]) => {
    userApiKeys = keys;
};

const executeWithKeyRotation = async <T>(apiCall: (ai: GoogleGenAI) => Promise<T>): Promise<T> => {
    const systemApiKey = process.env.API_KEY;
    
    // Create a list of keys to try, prioritizing user-provided keys.
    const keysToTry: string[] = [...userApiKeys];
    if (systemApiKey && !userApiKeys.includes(systemApiKey)) {
        keysToTry.push(systemApiKey);
    }


    if (keysToTry.length === 0) {
        eventBus.dispatch('notification', { type: 'error', message: 'Không có khóa API nào được cấu hình. Vui lòng thêm khóa trong Cài đặt.' });
        throw new Error("All API keys failed.");
    }

    const totalKeys = keysToTry.length;
    let keyIndex = currentApiIndex % totalKeys;

    for (let i = 0; i < totalKeys; i++) {
        const currentKey = keysToTry[keyIndex];
        
        try {
            const ai = new GoogleGenAI({ apiKey: currentKey });
            const result = await apiCall(ai);
            currentApiIndex = (keyIndex + 1) % totalKeys;
            return result;
        } catch (error: any) {
            console.error(`API call failed with key ending in ...${currentKey.slice(-4)}`, error);
            
            const isKeyError = /4..|quota|invalid|permission/i.test(error.message);

            if (isKeyError) {
                // Silently try the next key without spamming notifications.
                keyIndex = (keyIndex + 1) % totalKeys;
            } else {
                eventBus.dispatch('notification', { type: 'error', message: 'Lỗi API không xác định. Vui lòng thử lại.' });
                throw error; // Re-throw non-key related errors
            }
        }
    }

    eventBus.dispatch('notification', { type: 'error', message: 'Tất cả các khóa API đều không hợp lệ hoặc đã hết hạn mức.' });
    throw new Error("All API keys failed.");
};

export const generateWordsFromPrompt = async (prompt: string, existingWords: string[], learningLanguage: LearningLanguage, themes: string[]): Promise<GeneratedWord[]> => {
    return executeWithKeyRotation(async (ai) => {
        const themesInstruction = themes.length > 0
            ? `When assigning a theme, first try to use one from this existing list if it's a good fit: [${themes.join(', ')}]. Only create a new, general Vietnamese theme if none of the existing ones are suitable.`
            : `Assign a relevant, general theme in Vietnamese for each word (e.g., "Thức ăn", "Động vật", "Công việc").`;

        const systemInstruction = `You are an AI assistant for a language learning app. Your task is to generate a list of vocabulary words based on the user's prompt. The user is learning ${learningLanguage}.
  - Provide the word in ${learningLanguage}.
  - Provide the Vietnamese translation (translation_vi).
  - Provide the English translation (translation_en).
  - ${themesInstruction}
  - Do not include words from this list of already existing words: ${existingWords.join(', ')}.
  - If a word has multiple meanings, choose the most common one.
  - Your response MUST be a JSON array of objects, each with "word", "translation_vi", "translation_en", and "theme" keys.
  - Do not output anything else besides the JSON array.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
            },
        });
        const jsonString = response.text.trim();
        try {
            const cleanedJson = jsonString.replace(/^```json\n/, '').replace(/\n```$/, '');
            return JSON.parse(cleanedJson) as GeneratedWord[];
        } catch (e) {
            console.error("Failed to parse JSON from AI response:", jsonString);
            throw new Error("Invalid response format from AI.");
        }
    });
};

export const getWordsFromImage = async (base64: string, mimeType: string, existingWords: string[], learningLanguage: LearningLanguage, themes: string[]): Promise<GeneratedWord[]> => {
    return executeWithKeyRotation(async (ai) => {
        const imagePart = { inlineData: { data: base64, mimeType } };
        
        const themesInstruction = themes.length > 0
            ? `When assigning a theme, first try to use one from this existing list if it's a good fit: [${themes.join(', ')}]. Only create a new, general Vietnamese theme if none of the existing ones are suitable.`
            : `Assign a relevant, general theme in Vietnamese (e.g., "Thiên nhiên", "Đồ vật", "Con người").`;

        const textPart = { text: `Analyze the attached image and identify up to 10 distinct objects, concepts, or actions. For each item you identify:
    - Provide its name in ${learningLanguage}.
    - Provide the Vietnamese translation (translation_vi).
    - Provide the English translation (translation_en).
    - ${themesInstruction}
    - Do not include words from this list of already existing words: ${existingWords.join(', ')}.
    - Your response MUST be a JSON array of objects, with "word", "translation_vi", "translation_en", and "theme" keys.
    - If you cannot identify anything new, return an empty array []. Do not output anything else.` };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
            },
        });
        const jsonString = response.text.trim();
        try {
            const cleanedJson = jsonString.replace(/^```json\n/, '').replace(/\n```$/, '');
            return JSON.parse(cleanedJson) as GeneratedWord[];
        } catch (e) {
            console.error("Failed to parse JSON from AI image response:", jsonString);
            throw new Error("Invalid response format from AI.");
        }
    });
};

export const getWordsFromFile = async (base64: string, mimeType: string, existingWords: string[], learningLanguage: LearningLanguage, themes: string[]): Promise<GeneratedWord[]> => {
    return executeWithKeyRotation(async (ai) => {
        const filePart = { inlineData: { data: base64, mimeType } };
        
        const themesInstruction = themes.length > 0
            ? `When assigning a theme, first try to use one from this existing list if it's a good fit: [${themes.join(', ')}]. Only create a new, general Vietnamese theme if none of the existing ones are suitable.`
            : `Assign a relevant, general theme in Vietnamese (e.g., "Kinh doanh", "Công nghệ", "Tự nhiên").`;
            
        const textPart = { text: `Analyze the attached document and extract up to 15 key vocabulary words in ${learningLanguage}. For each word:
    - Provide the word itself.
    - Provide its Vietnamese translation (translation_vi).
    - Provide its English translation (translation_en).
    - ${themesInstruction}
    - Do not include words from this list of already existing words: ${existingWords.join(', ')}.
    - Your response MUST be a JSON array of objects, with "word", "translation_vi", "translation_en", and "theme" keys.
    - If you cannot extract any new words, return an empty array []. Do not output anything else.` };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [filePart, textPart] },
            config: {
                responseMimeType: "application/json",
            },
        });
        const jsonString = response.text.trim();
        try {
            const cleanedJson = jsonString.replace(/^```json\n/, '').replace(/\n```$/, '');
            return JSON.parse(cleanedJson) as GeneratedWord[];
        } catch (e) {
            console.error("Failed to parse JSON from AI file response:", jsonString);
            throw new Error("Invalid response format from AI.");
        }
    });
};

// FIX: Implement and export all missing functions to resolve import errors.
export const translateWord = async (word: string, targetLanguage: 'English' | 'Vietnamese', learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const systemInstruction = `You are a translation assistant. Translate the given ${learningLanguage} word into ${targetLanguage}. Provide only the single, most common translation. Do not add any extra text, explanation, or punctuation.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: word,
            config: {
                systemInstruction,
                temperature: 0,
            },
        });
        return response.text.trim();
    });
};

export const getWordInfo = async (word: string, uiLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<WordInfo> => {
    return executeWithKeyRotation(async (ai) => {
        const targetLangName = uiLanguage === 'vietnamese' ? 'Vietnamese' : 'English';
        const genderInstruction = learningLanguage === 'german' ? '- If the word is a noun, provide its gender (der, die, or das).' : '';

        const systemInstruction = `You are a language dictionary assistant. For the ${learningLanguage} word "${word}", provide the following information:
- Provide the most common part of speech in English (e.g., Noun, Verb, Adjective).
${genderInstruction}
- Provide a simple, clear definition in ${targetLangName}.
- Your response MUST be a JSON object with keys "partOfSpeech", "gender" (if applicable), and "definition".
- Do not output anything else besides the JSON object.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Get info for the word: ${word}`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
            },
        });
        
        try {
            const jsonString = response.text.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
            return JSON.parse(jsonString) as WordInfo;
        } catch (e) {
            console.error("Failed to parse word info JSON:", response.text);
            throw new Error("Invalid response format from AI for word info.");
        }
    });
};

export const generateSentence = async (word: VocabularyWord, targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const targetLangName = targetLanguage === 'vietnamese' ? 'Vietnamese' : 'English';
        const systemInstruction = `You are an AI assistant for a language learning app. Create one simple, clear example sentence in ${learningLanguage} using the word "${word.word}". The sentence should be easy for a beginner to understand. After the sentence, add '---Translation---' as a separator, and then provide the translation of the sentence in ${targetLangName}.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a sentence for the word: ${word.word}`,
            config: {
                systemInstruction,
                temperature: 0.5,
            },
        });
        return response.text;
    });
};

export const checkSentence = async (sentence: string, word: string, uiLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const targetLangName = uiLanguage === 'vietnamese' ? 'Vietnamese' : 'English';
        const systemInstruction = `You are a language teacher. The user has written a sentence in ${learningLanguage} to practice the word "${word}".
- Check the sentence for grammatical errors, spelling mistakes, and correct usage of the word "${word}".
- Provide feedback in ${targetLangName}.
- If the sentence is perfect, say "The sentence is perfect!".
- If there are errors, explain them clearly and provide the corrected sentence.
- Keep the feedback concise and encouraging.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Check this sentence: "${sentence}"`,
            config: { systemInstruction },
        });
        return response.text;
    });
};

export const rewriteSentence = async (sentence: string, word: string, uiLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const targetLangName = uiLanguage === 'vietnamese' ? 'Vietnamese' : 'English';
        const systemInstruction = `You are a language assistant. The user wants to rewrite a sentence in ${learningLanguage} that contains the word "${word}".
- Rewrite the sentence to make it sound more natural or to offer an alternative phrasing.
- Provide the rewritten sentence in ${learningLanguage}.
- Briefly explain the change in ${targetLangName}.
- Your output should be the rewritten sentence, followed by a newline and the explanation.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Rewrite this sentence: "${sentence}"`,
            config: { systemInstruction },
        });
        return response.text;
    });
};

export const getChatResponseForWord = async (word: VocabularyWord, userQuestion: string, history: ChatMessage[], uiLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const targetLangName = uiLanguage === 'vietnamese' ? 'Vietnamese' : 'English';
        
        const historyForPrompt = history.map(msg => `${msg.role === 'user' ? 'User' : 'Tutor'}: ${msg.text}`).join('\n');

        const systemInstruction = `You are a helpful language tutor. You are discussing the ${learningLanguage} word "${word.word}", which means "${word.translation[uiLanguage]}" in ${targetLangName}.
- Answer the user's questions about this word.
- Keep your answers concise and easy for a language learner to understand.
- Respond in ${targetLangName}.
- This is the conversation so far:
${historyForPrompt}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userQuestion,
            config: { systemInstruction },
        });
        return response.text;
    });
};

export const generateSpeech = async (word: string, learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: word }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, 
                    },
                },
            },
        });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("AI did not return audio data.");
        }
        return base64Audio;
    });
};

export const generateStory = async (words: string[], targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const targetLangName = targetLanguage === 'vietnamese' ? 'Vietnamese' : 'English';
        const systemInstruction = `You are an AI assistant for a language learning app. Create a very short, simple story (around 50-70 words) in ${learningLanguage} that includes the following words: [${words.join(', ')}]. After the story, add '---Translation---' as a separator, and then provide the translation of the story in ${targetLangName}.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a story with these words: ${words.join(', ')}`,
            config: {
                systemInstruction,
                temperature: 0.7,
            },
        });
        return response.text;
    });
};

export const generateQuizForWord = async (word: VocabularyWord, targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<Quiz> => {
    return executeWithKeyRotation(async (ai) => {
        const targetLangName = targetLanguage === 'vietnamese' ? 'Vietnamese' : 'English';
        const systemInstruction = `You are an AI assistant for a language learning app. Your task is to create a multiple-choice quiz question.
- The question should be: "What is the ${targetLangName} translation of the ${learningLanguage} word '${word.word}'?"
- The correct answer is "${word.translation[targetLanguage]}".
- Generate three plausible but incorrect answer options in ${targetLangName}. The incorrect options should be related to the same theme or category as the correct answer if possible, but clearly wrong.
- Your response MUST be a JSON object with keys "question", "options" (an array of 4 strings, including the correct answer, shuffled), and "correctAnswer".
- Do not output anything else besides the JSON object.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create a quiz for the word "${word.word}".`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
            },
        });
        
        try {
            const jsonString = response.text.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
            const quizData = JSON.parse(jsonString);
            if (Array.isArray(quizData.options) && quizData.options.every(o => typeof o === 'string')) {
                return quizData as Quiz;
            }
            throw new Error("Invalid format for quiz options.");
        } catch (e) {
            console.error("Failed to parse quiz JSON from AI:", response.text);
            throw new Error("Invalid response format from AI for quiz.");
        }
    });
};

export const generateImageFromPrompt = async (prompt: string): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `A simple, clear, minimalist icon or clipart of: ${prompt}. White background, vibrant colors.`,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: '1:1',
            },
        });
        
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/png;base64,${base64ImageBytes}`;
    });
};

export const generateImageForWord = async (word: string): Promise<string> => {
    return generateImageFromPrompt(word);
};

export const editImage = async (base64Data: string, mimeType: string, prompt: string): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: base64Data, mimeType } },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const newMimeType = part.inlineData.mimeType;
                return `data:${newMimeType};base64,${base64ImageBytes}`;
            }
        }
        
        throw new Error("AI did not return an edited image.");
    });
};

export const getQuickWordAnalysis = async (word: string, targetLang: 'Vietnamese' | 'English', learningLang: LearningLanguage): Promise<{ translation: string; partOfSpeech: string; theme: string; }> => {
    return executeWithKeyRotation(async (ai) => {
        const systemInstruction = `You are a language analysis tool. For the given ${learningLang} word, provide a quick analysis.
- Provide the translation in ${targetLang}.
- Identify the most common part of speech (e.g., Noun, Verb, Adjective).
- Suggest a general theme for the word in ${targetLang} (e.g., Food, Animals, Work).
- Your response MUST be a JSON object with keys "translation", "partOfSpeech", and "theme".
- Do not output anything else besides the JSON object.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: word,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
            },
        });
        
        try {
            const jsonString = response.text.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
            return JSON.parse(jsonString);
        } catch (e) {
            console.error("Failed to parse quick analysis JSON:", response.text);
            throw new Error("Invalid response format from AI for quick analysis.");
        }
    });
};

export const generateDailyMission = async (words: VocabularyWord[], stats: UserStats, learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const wordsToReviewCount = words.filter(w => w.nextReview <= Date.now()).length;
        const prompt = `Create a short, inspiring daily mission for a ${learningLanguage} learner.
- The user has ${words.length} total words.
- They have ${wordsToReviewCount} words due for review.
- Their current streak is ${stats.currentStreak} days.
- Their longest streak is ${stats.longestStreak} days.
- Base the mission on these stats. For example, if they have many words to review, encourage them to do a review session. If their streak is high, congratulate them. If they have few words, suggest adding more.
- The mission must be a short, single sentence in Vietnamese.
- Do not add any prefixes like "Nhiệm vụ:". Just return the sentence.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.8,
            },
        });
        return response.text.trim().replace(/^"|"$/g, '');
    });
};

export const generateHintsForWord = async (word: VocabularyWord, uiLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<{ hint1: string; hint2: string; hint3: string; hint4: string; }> => {
    return executeWithKeyRotation(async (ai) => {
        const targetLangName = uiLanguage === 'vietnamese' ? 'Vietnamese' : 'English';
        const systemInstruction = `You are an AI assistant for a word guessing game. The user is trying to guess the ${learningLanguage} word "${word.word}".
Generate 4 hints in ${targetLangName} with increasing levels of helpfulness.
- hint1: A riddle or a very vague clue about the word.
- hint2: The general category or theme of the word (e.g., "${word.theme || 'General'}").
- hint3: A simple example sentence in ${learningLanguage} with the word blanked out (e.g., "Ich esse einen ___.").
- hint4: The first letter of the word ("${word.word[0]}").
Your response MUST be a JSON object with keys "hint1", "hint2", "hint3", and "hint4".
Do not output anything else.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate hints for ${word.word}`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
            },
        });
        
        try {
            const jsonString = response.text.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
            return JSON.parse(jsonString);
        } catch (e) {
            console.error("Failed to parse hints JSON:", response.text);
            throw new Error("Invalid response format from AI for hints.");
        }
    });
};

export const generateScrambledSentence = async (word: VocabularyWord, learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const systemInstruction = `You are an AI assistant. Create one simple, grammatically correct sentence in ${learningLanguage} that uses the word "${word.word}". The sentence should be between 5 and 10 words long.
- Return only the sentence. Do not add punctuation like periods at the end.
- Do not add any extra text or explanations.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a simple sentence with the word: ${word.word}`,
            config: {
                systemInstruction,
                temperature: 0.6,
            },
        });
        return response.text.trim().replace(/\.$/, '');
    });
};

export const checkGrammar = async (text: string, learningLanguage: LearningLanguage, uiLanguage: TargetLanguage): Promise<Feedback> => {
    return executeWithKeyRotation(async (ai) => {
        const targetLangName = uiLanguage === 'vietnamese' ? 'Vietnamese' : 'English';
        const systemInstruction = `You are a language teacher. The user has written a text in ${learningLanguage}.
- Correct any grammatical errors, spelling mistakes, and awkward phrasing.
- For each correction, explain the error and why the correction is better. The explanation should be in ${targetLangName}.
- Your response MUST be a JSON object with two keys:
  1. "correctedText": A string containing the full, corrected version of the text.
  2. "feedback": An array of objects, where each object has "error" (the original incorrect phrase), "correction" (the corrected phrase), and "explanation" (the reason for the change).
- If the text is perfect, return the original text in "correctedText" and an empty array for "feedback".`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: text,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
            },
        });
        
        try {
            const jsonString = response.text.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
            return JSON.parse(jsonString) as Feedback;
        } catch (e) {
            console.error("Failed to parse grammar feedback JSON:", response.text);
            throw new Error("Invalid response format from AI for grammar check.");
        }
    });
};

export const generateWritingPrompt = async (uiLanguage: TargetLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const targetLangName = uiLanguage === 'vietnamese' ? 'Vietnamese' : 'English';
        const systemInstruction = `You are an AI assistant. Generate a simple, open-ended writing prompt for a language learner.
- The prompt should be something personal and easy to write about, like "What is your favorite food?" or "Describe your weekend."
- The prompt must be in ${targetLangName}.
- Return only the prompt as a single sentence. Do not add prefixes like "Prompt:".`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'Generate a writing prompt',
            config: {
                systemInstruction,
                temperature: 0.9,
            },
        });
        return response.text.trim();
    });
};

export const getChatResponseForTutor = async (history: Turn[], userMessage: string, learningLanguage: LearningLanguage, uiLanguage: TargetLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const targetLangName = uiLanguage === 'vietnamese' ? 'Vietnamese' : 'English';
        const historyForPrompt = history.map(turn => `User: ${turn.user}\nTutor: ${turn.model}`).join('\n');
        
        const systemInstruction = `You are a friendly language tutor. The user is learning ${learningLanguage}. Converse with them in ${learningLanguage} to help them practice.
- Keep your responses concise and natural for a spoken conversation.
- The user's native language is ${targetLangName}.
- Below is the conversation history for context.
${historyForPrompt}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userMessage,
            config: {
                systemInstruction,
                temperature: 0.7,
            },
        });
        return response.text;
    });
};

export const identifyObjectInImage = async (base64: string, mimeType: string, coords: { x: number, y: number }, learningLanguage: LearningLanguage): Promise<GeneratedWord | null> => {
    return executeWithKeyRotation(async (ai) => {
        const imagePart = { inlineData: { data: base64, mimeType } };
        const textPart = { text: `Identify the single object located at the normalized coordinates (x: ${coords.x.toFixed(3)}, y: ${coords.y.toFixed(3)}) in the image.
- Provide its name in ${learningLanguage}.
- Provide the Vietnamese translation (translation_vi).
- Provide the English translation (translation_en).
- Suggest a general theme in Vietnamese (e.g., "Đồ vật", "Động vật").
- Your response MUST be a JSON object with "word", "translation_vi", "translation_en", and "theme" keys.
- If you cannot identify a distinct object at that location, return a JSON object with "word" as an empty string.` };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
            },
        });
        
        try {
            const jsonString = response.text.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
            const result = JSON.parse(jsonString) as GeneratedWord;
            if (result.word) {
                return result;
            }
            return null;
        } catch (e) {
            console.error("Failed to parse object identification JSON:", response.text);
            return null;
        }
    });
};

export const generateAiLesson = async (theme: string, learningLanguage: LearningLanguage, uiLanguage: TargetLanguage): Promise<AiLesson | null> => {
    return executeWithKeyRotation(async (ai) => {
        const targetLangName = uiLanguage === 'vietnamese' ? 'Vietnamese' : 'English';
        const systemInstruction = `You are an AI language lesson creator. Generate a complete mini-lesson about the theme "${theme}" for a beginner learning ${learningLanguage}. The user's native language is ${targetLangName}.
Your response MUST be a single JSON object with the following structure:
{
  "vocabulary": [ { "word": "...", "translation": "..." } ],
  "dialogue": [ { "speaker": "A", "line": "..." }, { "speaker": "B", "line": "..." } ],
  "story": "A very short story using some of the vocabulary.",
  "grammarTip": { "title": "...", "explanation": "..." }
}
- 'vocabulary': 5-7 key words in ${learningLanguage} with their translation in ${targetLangName}.
- 'dialogue': A short, simple 4-6 line conversation between two speakers (A and B) in ${learningLanguage}.
- 'story': A 3-4 sentence story in ${learningLanguage}.
- 'grammarTip': One relevant, simple grammar tip related to the theme or vocabulary, with the explanation in ${targetLangName}.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Generate a lesson about: ${theme}`,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
            },
        });
        
        try {
            const jsonString = response.text.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
            return JSON.parse(jsonString) as AiLesson;
        } catch (e) {
            console.error("Failed to parse lesson JSON:", response.text);
            return null;
        }
    });
};

export const validateDuelWord = async (word: string, usedWords: string[], learningLanguage: LearningLanguage, context: DuelContext): Promise<{ isValid: boolean, reason: string | null }> => {
     return executeWithKeyRotation(async (ai) => {
        let rule = '';
        switch(context.mode) {
            case 'theme': rule = `The word must be related to the theme: ${context.theme}.`; break;
            case 'longest': rule = `The word must start with the letter '${context.startingLetter}'.`; break;
            case 'chain': rule = `The word must start with the last letter of '${context.lastWord}', which is '${context.lastWord.slice(-1)}'.`; break;
        }

        const systemInstruction = `You are a referee for a ${learningLanguage} word game. The user has provided a word.
- The word is: "${word}"
- The list of already used words is: [${usedWords.join(', ')}]
- The rule for this turn is: ${rule}
- Check if the word is a real, common word in ${learningLanguage}.
- Check if the word has already been used (case-insensitive).
- Check if the word follows the rule.
- Your response MUST be a JSON object with "isValid" (boolean) and "reason" (string, explaining why it's invalid in Vietnamese, or null if valid).`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Validate the word: ${word}`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
            },
        });
        
        try {
            const jsonString = response.text.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
            return JSON.parse(jsonString);
        } catch (e) {
            console.error("Failed to parse duel validation JSON:", response.text);
            return { isValid: false, reason: "Lỗi khi kiểm tra từ." };
        }
    });
};

export const getAiDuelWord = async (usedWords: string[], learningLanguage: LearningLanguage, difficulty: 'easy' | 'medium' | 'hard' | 'hell', context: DuelContext): Promise<{ word: string }> => {
    return executeWithKeyRotation(async (ai) => {
        let rule = '';
        switch(context.mode) {
            case 'theme': rule = `The word must be related to the theme: ${context.theme}.`; break;
            case 'longest': rule = `The word must start with the letter '${context.startingLetter}'.`; break;
            case 'chain': rule = `The word must start with the last letter of '${context.lastWord}', which is '${context.lastWord.slice(-1)}'.`; break;
            case 'first': rule = 'Just provide any common starting word.'; break;
        }
        
        const systemInstruction = `You are an AI player in a ${learningLanguage} word game. Your difficulty level is ${difficulty}.
- Your task is to provide one valid word.
- The list of already used words is: [${usedWords.join(', ')}]
- The rule for this turn is: ${rule}
- Based on your difficulty, choose an appropriate word. 'Easy' should be a common, short word. 'Hard' should be a more complex or longer word. 'Hell' can be very obscure or long.
- Your response MUST be a JSON object with a single key "word".
- If you cannot think of a word, return an empty string for "word".`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: 'Give me a word.',
            config: {
                systemInstruction,
                responseMimeType: "application/json",
            },
        });
        
        try {
            const jsonString = response.text.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
            return JSON.parse(jsonString);
        } catch (e) {
            console.error("Failed to parse AI duel word JSON:", response.text);
            return { word: '' };
        }
    });
};

export const getAiSuggestedWords = async (prompt: string, availableWords: VocabularyWord[], learningLanguage: LearningLanguage): Promise<VocabularyWord[]> => {
    return executeWithKeyRotation(async (ai) => {
        const wordList = availableWords.map(w => ({ id: w.id, word: w.word, srsLevel: w.srsLevel, nextReview: w.nextReview, createdAt: w.createdAt }));
        const systemInstruction = `You are an AI assistant helping a user select words from their vocabulary list for a practice session.
- The user's request is: "${prompt}".
- The available words are provided as a JSON array. Each object contains the word, its id, and spaced repetition data (srsLevel, nextReview). Lower srsLevel means harder. nextReview is a timestamp; if it's in the past, the word needs review.
- Interpret the user's request and select the most relevant words from the list. For example, 'hardest words' should pick words with low srsLevel. 'Words to review' should pick words where nextReview is past the current timestamp (${Date.now()}).
- Your response MUST be a JSON array of word strings (just the "word" field) that you have selected.
- Do not output anything else.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `User request: "${prompt}". Available words: ${JSON.stringify(wordList)}`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
            },
        });
        
        try {
            const jsonString = response.text.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
            const selectedWordStrings = JSON.parse(jsonString) as string[];
            const selectedWordSet = new Set(selectedWordStrings.map(s => s.toLowerCase()));
            return availableWords.filter(w => selectedWordSet.has(w.word.toLowerCase()));
        } catch (e) {
            console.error("Failed to parse AI suggested words JSON:", response.text);
            return [];
        }
    });
};

const navigateToGameFunction: FunctionDeclaration = {
    name: 'navigateToGame',
    parameters: {
        type: Type.OBJECT,
        description: 'Navigates the user to a specific game or learning mode screen.',
        properties: {
            gameName: {
                type: Type.STRING,
                description: `The name of the game screen to navigate to. Must be one of: [${Object.values(View).join(', ')}]`,
            },
        },
        required: ['gameName'],
    },
};

export const getAiAssistantResponse = async (
    userMessage: string,
    history: AiAssistantMessage[],
    context: {
        detailedActivityLog: HistoryEntry[],
        vocabularyList: Partial<VocabularyWord>[],
        userStats: UserStats,
    }
): Promise<{ responseText: string, functionCalls: any[] | null }> => {
    return executeWithKeyRotation(async (ai) => {
        const systemInstruction = `You are Lingo, a friendly, encouraging, and insightful AI language learning assistant. Your personality is helpful and a bit playful.
- Your main goal is to help the user learn more effectively.
- You have access to the user's stats, vocabulary list, and a detailed log of their recent actions. Use this data to provide personalized feedback and suggestions.
- Keep your responses concise and in Vietnamese.
- When asked to create an "exercise chain" or "chuỗi bài tập", use the 'navigateToGame' function to suggest a sequence of 2-3 different games. Announce the chain you've created in your text response before the function calls.
- Analyze the user's request and provided context to give helpful answers. For example, if asked "How did I do this week?", summarize their activity from the log. If asked "what words am I bad at?", look for words with low srsLevel in their vocabulary or incorrect answers in the activity log.

CONTEXT:
- User Stats: ${JSON.stringify(context.userStats)}
- Detailed Recent Activity Log: ${JSON.stringify(context.detailedActivityLog)}
- Vocabulary Summary (sample): ${JSON.stringify(context.vocabularyList.slice(0, 30))}
`;
        const chatHistory = history.map(h => ({ role: h.role, parts: [{ text: h.text }] }));

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [...chatHistory, { role: 'user', parts: [{ text: userMessage }] }],
            config: {
                systemInstruction,
                tools: [{ functionDeclarations: [navigateToGameFunction] }],
            },
        });
        
        return {
            responseText: response.text,
            functionCalls: response.functionCalls || null
        };
    });
};