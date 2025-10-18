import { GoogleGenAI, Type, Modality } from "@google/genai";
import { VocabularyWord, WordInfo, TargetLanguage, LearningLanguage, ChatMessage, GeneratedWord, Quiz } from '../types';

const getAiClient = (): GoogleGenAI => {
    const apiKey = localStorage.getItem('geminiApiKey');
    if (!apiKey) {
        throw new Error("API Key not found. Please set it in the settings.");
    }
    return new GoogleGenAI({ apiKey });
};

const textModel = 'gemini-2.5-flash';
const imageModel = 'gemini-2.5-flash-image';

const parseJsonResponse = <T>(text: string): T | null => {
    try {
        const match = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (match && match[1]) {
            return JSON.parse(match[1]) as T;
        }
        return JSON.parse(text) as T;
    } catch (error) {
        console.error("Failed to parse JSON response:", text, error);
        return null;
    }
};

export const translateWord = async (word: string, toLanguage: 'English' | 'Vietnamese', fromLanguage: LearningLanguage): Promise<string> => {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `Translate the following ${fromLanguage} word to ${toLanguage}: "${word}". Provide only the translation.`,
            config: {
                temperature: 0.2,
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error('Error translating word:', error);
        return 'Translation failed';
    }
};

const generatedWordSchema = {
    type: Type.OBJECT,
    properties: {
        word: { type: Type.STRING },
        translation_vi: { type: Type.STRING },
        translation_en: { type: Type.STRING },
        theme: { type: Type.STRING },
    }
};

export const generateWordsFromPrompt = async (prompt: string, existingWords: string[], language: LearningLanguage): Promise<GeneratedWord[]> => {
    const ai = getAiClient();
    const systemInstruction = `You are an AI assistant for a language learning app. Your task is to generate a list of vocabulary words based on the user's request.
The target learning language is ${language}.
Provide translations in both Vietnamese and English.
Assign a relevant, single-word theme in Vietnamese for each word.
Do NOT include any of these existing words: ${existingWords.join(', ')}.
Output a JSON array of objects.`;

    const response = await ai.models.generateContent({
        model: textModel,
        contents: `User request: "${prompt}"`,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: generatedWordSchema
            }
        }
    });

    const result = parseJsonResponse<GeneratedWord[]>(response.text);
    return result || [];
};

export const getWordsFromImage = async (base64: string, mimeType: string, existingWords: string[], language: LearningLanguage): Promise<GeneratedWord[]> => {
    const ai = getAiClient();
    const systemInstruction = `You are an AI assistant for a language learning app. Identify objects in the image and generate a list of vocabulary words for them.
The target learning language is ${language}.
Provide translations in both Vietnamese and English.
Assign a relevant, single-word theme in Vietnamese for each word.
Do NOT include any of these existing words: ${existingWords.join(', ')}.
Output a JSON array of objects.`;

    const imagePart = { inlineData: { data: base64, mimeType } };
    const textPart = { text: "Identify objects in this image and list them as vocabulary words." };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [imagePart, textPart] },
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: generatedWordSchema
            }
        }
    });

    const result = parseJsonResponse<GeneratedWord[]>(response.text);
    return result || [];
};

export const getWordsFromFile = async (base64: string, mimeType: string, existingWords: string[], language: LearningLanguage): Promise<GeneratedWord[]> => {
    const ai = getAiClient();
    const systemInstruction = `You are an AI assistant for a language learning app. Analyze the provided document and extract key vocabulary words.
The target learning language is ${language}.
For each word, provide translations in both Vietnamese and English, and assign a relevant, single-word theme in Vietnamese.
Do NOT include any of these existing words: ${existingWords.join(', ')}.
Focus on nouns, verbs, and adjectives that are useful for a language learner. Extract around 10-15 words.
Output a JSON array of objects.`;

    const filePart = { inlineData: { data: base64, mimeType } };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [filePart] },
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: generatedWordSchema
            }
        }
    });

    const result = parseJsonResponse<GeneratedWord[]>(response.text);
    return result || [];
};

export const generateStory = async (words: string[], targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
    const ai = getAiClient();
    const targetLangName = targetLanguage === 'vietnamese' ? 'Vietnamese' : 'English';
    const learningLangName = learningLanguage.charAt(0).toUpperCase() + learningLanguage.slice(1);
    
    const prompt = `Write a short, simple story for a language learner in ${learningLangName}. The story must include the following words: ${words.join(', ')}.
The story should be engaging and easy to understand.
After the story, provide a translation in ${targetLangName}.
Separate the original story and its translation with "---Translation---".`;

    const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt
    });
    return response.text;
};

export const generateSentence = async (word: VocabularyWord, targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
    const ai = getAiClient();
    const targetLangName = targetLanguage === 'vietnamese' ? 'Vietnamese' : 'English';
    const learningLangName = learningLanguage.charAt(0).toUpperCase() + learningLanguage.slice(1);
    
    const prompt = `Create a simple example sentence for a language learner in ${learningLangName} using the word "${word.word}".
The sentence should be easy to understand and clearly demonstrate the word's meaning.
After the sentence, provide a translation in ${targetLangName}.
Separate the original sentence and its translation with "---Translation---".`;
    
    const response = await ai.models.generateContent({ model: textModel, contents: prompt });
    return response.text;
};

export const generateQuizForWord = async (word: VocabularyWord, targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<Quiz | null> => {
    const ai = getAiClient();
    const translation = word.translation[targetLanguage];
    const prompt = `Create a multiple-choice quiz question to test the meaning of the ${learningLanguage} word "${word.word}".
The question should be in ${learningLanguage}.
The correct answer is "${translation}".
Provide three other plausible but incorrect options in ${targetLanguage}.
The options should be of similar type (e.g., all nouns, all verbs).
Return the response as a JSON object.`;
    
    const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.STRING }
                },
                required: ["question", "options", "correctAnswer"]
            }
        }
    });

    const quizData = parseJsonResponse<Quiz>(response.text);
    if (quizData) {
        const options = new Set([...quizData.options, quizData.correctAnswer]);
        quizData.options = Array.from(options).sort(() => Math.random() - 0.5);
    }
    return quizData;
};

export const generateImageForWord = async (word: string): Promise<string> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: imageModel,
        contents: { parts: [{ text: `A clear, simple, high-quality image of: ${word}. Centered object, clean background.` }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("No image generated");
};

export const editImage = async (base64Data: string, mimeType: string, prompt: string): Promise<string> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: imageModel,
        contents: {
            parts: [
                { inlineData: { data: base64Data, mimeType: mimeType } },
                { text: prompt }
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("No image generated from edit");
};

export const getWordInfo = async (word: string, targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<WordInfo> => {
    const ai = getAiClient();
    const prompt = `Provide linguistic information for the ${learningLanguage} word "${word}".
Return a JSON object. The definition should be in ${targetLanguage === 'vietnamese' ? 'Vietnamese' : 'English'}.
For German nouns, include the gender ('der', 'die', or 'das').`;
    
    const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    partOfSpeech: { type: Type.STRING },
                    gender: { type: Type.STRING, description: "e.g., der, die, das for German nouns" },
                    definition: { type: Type.STRING }
                },
                required: ["partOfSpeech", "definition"]
            }
        }
    });

    return parseJsonResponse<WordInfo>(response.text) || { partOfSpeech: 'N/A', definition: 'Could not fetch info.'};
};

export const checkSentence = async (sentence: string, word: string, targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
    const ai = getAiClient();
    const prompt = `The user is learning ${learningLanguage} and wrote a sentence${word ? ` using the word "${word}"` : ''}.
User's sentence: "${sentence}"
1. Check if the sentence is grammatically correct and makes sense.
2. Provide short, clear feedback in ${targetLanguage === 'vietnamese' ? 'Vietnamese' : 'English'}.
3. If there are errors, explain them simply and suggest a correction.
4. Keep the feedback encouraging and suitable for a beginner.`;
    const response = await ai.models.generateContent({ model: textModel, contents: prompt });
    return response.text;
};

export const rewriteSentence = async (sentence: string, word: string, targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
    const ai = getAiClient();
    const prompt = `The user is learning ${learningLanguage} and wrote a sentence.
User's sentence: "${sentence}"
Rewrite this sentence to make it sound more natural and correct${word ? `, while still using the word "${word}"` : ''}.
Provide only the rewritten sentence.`;
    const response = await ai.models.generateContent({ model: textModel, contents: prompt });
    return response.text;
};

export const getChatResponseForWord = async (word: VocabularyWord, question: string, history: ChatMessage[], targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
    const ai = getAiClient();
    const systemInstruction = `You are a friendly language tutor AI. The user is learning ${learningLanguage} and has a question about the word "${word.word}", which means "${word.translation[targetLanguage]}".
Answer the user's questions clearly and simply. Keep responses concise. The conversation should be in ${targetLanguage === 'vietnamese' ? 'Vietnamese' : 'English'}.`;

    const contents = history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));

    const chat = ai.chats.create({
        model: textModel,
        config: { systemInstruction },
        history: contents.slice(0, -1)
    });

    const lastMessage = contents[contents.length-1];
    const result = await chat.sendMessage({ message: lastMessage.parts[0].text });
    return result.text;
};

export const generateHintsForWord = async (word: VocabularyWord, targetLanguage: TargetLanguage, learningLanguage: LearningLanguage) => {
    const ai = getAiClient();
    const prompt = `For the ${learningLanguage} word "${word.word}", generate four progressive hints for a word-guessing game. The user knows the number of letters.
    1.  **Hint 1 (Theme):** The general category or theme of the word.
    2.  **Hint 2 (Description):** A short, simple description of the word.
    3.  **Hint 3 (Sentence):** An example sentence using the word, but replace the word with underscores (\_).
    4.  **Hint 4 (First Letter):** The first letter of the word.
    All hints must be in ${targetLanguage === 'vietnamese' ? 'Vietnamese' : 'English'}.
    Return a single JSON object.`;
    const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    hint1: { type: Type.STRING, description: "Theme" },
                    hint2: { type: Type.STRING, description: "Short description" },
                    hint3: { type: Type.STRING, description: "Example sentence with blank" },
                    hint4: { type: Type.STRING, description: "First letter" },
                },
                required: ["hint1", "hint2", "hint3", "hint4"]
            }
        }
    });
    return parseJsonResponse<{ hint1: string; hint2: string; hint3: string; hint4: string; }>(response.text);
};

export const generateScrambledSentence = async (word: VocabularyWord, learningLanguage: LearningLanguage): Promise<string> => {
    const ai = getAiClient();
    const prompt = `Create one simple, clear example sentence in ${learningLanguage} using the word "${word.word}".
    The sentence should be suitable for a language learner.
    Provide only the sentence itself, with no extra text or translation.`;
    const response = await ai.models.generateContent({ model: textModel, contents: prompt });
    return response.text.trim();
};

export const generateWritingPrompt = async (language: TargetLanguage): Promise<string> => {
    const ai = getAiClient();
    const prompt = `Generate a short, simple, and interesting writing prompt for a language learner.
    It can be a question, a "what if" scenario, or a request to describe something.
    The prompt should be in ${language === 'vietnamese' ? 'Vietnamese' : 'English'}.
    Provide only the prompt text.`;
    const response = await ai.models.generateContent({ model: textModel, contents: prompt });
    return response.text.trim();
};

export const checkGrammar = async (text: string, learningLanguage: LearningLanguage, targetLanguage: TargetLanguage) => {
    const ai = getAiClient();
    const prompt = `You are a language teacher. The user, who is learning ${learningLanguage}, has written the following text.
    Your task is to provide feedback in ${targetLanguage === 'vietnamese' ? 'Vietnamese' : 'English'}.
    The output must be a JSON object.
    1.  In the "correctedText" field, provide the corrected version of the user's text.
    2.  In the "feedback" array, list each correction as an object with three fields: "error", "correction", and "explanation".
        - "error": The specific incorrect word or phrase.
        - "correction": The suggested correction.
        - "explanation": A simple, clear explanation of why it was wrong.
    
    User's text: "${text}"`;
    
    const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    correctedText: { type: Type.STRING },
                    feedback: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                error: { type: Type.STRING },
                                correction: { type: Type.STRING },
                                explanation: { type: Type.STRING },
                            },
                             required: ["error", "correction", "explanation"]
                        }
                    }
                },
                required: ["correctedText", "feedback"]
            }
        }
    });
    return parseJsonResponse<{ correctedText: string; feedback: { error: string; correction: string; explanation: string }[] }>(response.text);
};