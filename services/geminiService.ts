import { GoogleGenAI, Type, Modality } from "@google/genai";
import { VocabularyWord, WordInfo, TargetLanguage, LearningLanguage, ChatMessage, GeneratedWord, Quiz, AiLesson, UserStats } from '../types';
import eventBus from '../utils/eventBus';

let currentApiIndex = 0;
let userApiKeys: string[] = [];

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
                eventBus.dispatch('notification', { type: 'error', message: 'Một lỗi API không mong muốn đã xảy ra.' });
                throw error; // Rethrow non-key related errors
            }
        }
    }
    
    // After the loop, if we're here, all keys have failed.
    eventBus.dispatch('notification', { 
        type: 'error', 
        message: 'Tất cả các khóa API đều không hợp lệ hoặc không có quyền. Vui lòng kiểm tra lại trong Cài đặt.' 
    });
    throw new Error("All API keys failed.");
};


const textModel = 'gemini-2.5-flash';
const imageModel = 'gemini-2.5-flash-image';
const imagenModel = 'imagen-4.0-generate-001';

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

const quickWordAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        translation: {
            type: Type.STRING,
            description: "The translation of the word."
        },
        partOfSpeech: {
            type: Type.STRING,
            description: "The part of speech of the word (e.g., Noun, Verb, Adjective)."
        },
        theme: {
            type: Type.STRING,
            description: "A concise theme or category for the word, in Vietnamese (e.g., 'Thức ăn', 'Gia đình')."
        },
    },
    required: ["translation", "partOfSpeech", "theme"]
};


export const getQuickWordAnalysis = async (word: string, toLanguage: 'English' | 'Vietnamese', fromLanguage: LearningLanguage): Promise<{ translation: string; partOfSpeech: string; theme: string; } | null> => {
    return executeWithKeyRotation(async (ai) => {
        const systemInstruction = `You are a helpful language assistant. Analyze the given ${fromLanguage} word and provide its translation into ${toLanguage}, its part of speech, and a suitable theme in Vietnamese.
Strictly follow the provided JSON schema. Output a single JSON object.`;

        const response = await ai.models.generateContent({
            model: textModel,
            contents: `Analyze the word: "${word}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: quickWordAnalysisSchema
            }
        });

        const result = parseJsonResponse<{ translation: string; partOfSpeech: string; theme: string; }>(response.text);
        return result;
    });
};

export const translateWord = async (word: string, toLanguage: 'English' | 'Vietnamese', fromLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `Translate the following ${fromLanguage} word to ${toLanguage}: "${word}". Provide only the translation.`,
            config: {
                temperature: 0.2,
            }
        });
        return response.text.trim();
    });
};

const generatedWordSchema = {
    type: Type.OBJECT,
    properties: {
        word: { 
            type: Type.STRING,
            description: "The vocabulary word in the target learning language. For German nouns, include the article (e.g., 'der Tisch'). This field must contain ONLY the word itself in its simplest dictionary form, without any extra metadata like plural forms or translations."
        },
        translation_vi: { 
            type: Type.STRING,
            description: "The Vietnamese translation of the word."
        },
        translation_en: { 
            type: Type.STRING,
            description: "The English translation of the word."
        },
        theme: { 
            type: Type.STRING,
            description: "A concise theme or category for the word, in Vietnamese (e.g., 'Thức ăn', 'Gia đình')."
        },
    },
    required: ["word", "translation_vi", "translation_en", "theme"]
};

export const generateWordsFromPrompt = async (prompt: string, existingWords: string[], language: LearningLanguage): Promise<GeneratedWord[]> => {
    return executeWithKeyRotation(async (ai) => {
        const systemInstruction = `You are an AI assistant for a language learning app. Your task is to generate a list of vocabulary words based on the user's request.
The target learning language is ${language}.
For each word, provide a clean, simple dictionary form in the 'word' field. For German nouns, include the article (e.g., 'der Apfel'). The 'word' field MUST NOT contain translations, plural forms, conjugations, or any other metadata.
Provide translations in both Vietnamese ('translation_vi') and English ('translation_en').
Assign a relevant, concise theme in Vietnamese for each word in the 'theme' field.
Do NOT include any of these existing words: ${existingWords.join(', ')}.
Strictly follow the provided JSON schema. Output a JSON array of objects.`;

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
    });
};

export const getWordsFromImage = async (base64: string, mimeType: string, existingWords: string[], language: LearningLanguage): Promise<GeneratedWord[]> => {
    return executeWithKeyRotation(async (ai) => {
        const systemInstruction = `You are an AI assistant for a language learning app. Identify objects in the image and generate a list of vocabulary words for them.
The target learning language is ${language}.
For each word, provide a clean, simple dictionary form in the 'word' field. For German nouns, include the article (e.g., 'der Apfel'). The 'word' field MUST NOT contain translations, plural forms, conjugations, or any other metadata.
Provide translations in both Vietnamese ('translation_vi') and English ('translation_en').
Assign a relevant, concise theme in Vietnamese for each word in the 'theme' field.
Do NOT include any of these existing words: ${existingWords.join(', ')}.
Strictly follow the provided JSON schema. Output a JSON array of objects.`;

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
    });
};

export const getWordsFromFile = async (base64: string, mimeType: string, existingWords: string[], language: LearningLanguage): Promise<GeneratedWord[]> => {
    return executeWithKeyRotation(async (ai) => {
        const systemInstruction = `You are an AI assistant for a language learning app. Analyze the provided document and extract key vocabulary words.
The target learning language is ${language}.
For each word, provide a clean, simple dictionary form in the 'word' field. For German nouns, include the article (e.g., 'der Apfel'). The 'word' field MUST NOT contain translations, plural forms, conjugations, or any other metadata.
Provide translations in both Vietnamese ('translation_vi') and English ('translation_en'), and assign a relevant, concise theme in Vietnamese in the 'theme' field.
Do NOT include any of these existing words: ${existingWords.join(', ')}.
Focus on nouns, verbs, and adjectives that are useful for a language learner. Extract around 10-15 words.
Strictly follow the provided JSON schema. Output a JSON array of objects.`;

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
    });
};

export const identifyObjectInImage = async (base64: string, mimeType: string, coords: {x: number, y: number}, language: LearningLanguage): Promise<GeneratedWord | null> => {
    return executeWithKeyRotation(async (ai) => {
        const systemInstruction = `You are an AI assistant for a language learning app. A user has clicked on an image at normalized coordinates (x: ${coords.x}, y: ${coords.y}). Your task is to identify the object at or very near these coordinates.
The target learning language is ${language}.
Provide its name in a clean, simple dictionary form in the 'word' field. For German nouns, include the article (e.g., 'der Tisch'). The 'word' field MUST NOT contain translations, plural forms, or any other metadata.
Provide translations in both Vietnamese ('translation_vi') and English ('translation_en').
Assign a relevant, concise theme in Vietnamese in the 'theme' field.
If no specific object is at the coordinates, identify the general area (e.g., 'sky', 'wall').
If you cannot identify anything, return a JSON object with null values.
Strictly follow the provided JSON schema. Output a single JSON object.`;

        const imagePart = { inlineData: { data: base64, mimeType } };
        const textPart = { text: `Identify the object at x:${coords.x}, y:${coords.y}.`};

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [imagePart, textPart] },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: generatedWordSchema
            }
        });

        const result = parseJsonResponse<GeneratedWord>(response.text);
        return result?.word ? result : null;
    });
};

export const generateStory = async (words: string[], targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const targetLangName = targetLanguage === 'vietnamese' ? 'Vietnamese' : 'English';
        const learningLangName = learningLanguage.charAt(0).toUpperCase() + learningLanguage.slice(1);
        
        const prompt = `Write a short, coherent story in ${learningLangName} aimed at an intermediate language learner (A2/B1 level). The story must logically incorporate the following words: ${words.join(', ')}.
The plot should be interesting and make sense. Avoid overly simplistic or childish themes.
The story should be a few paragraphs long.
After the story, provide a complete translation in ${targetLangName}.
Separate the original story and its translation with "---Translation---".`;

        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt
        });
        return response.text;
    });
};

export const generateSentence = async (word: VocabularyWord, targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const targetLangName = targetLanguage === 'vietnamese' ? 'Vietnamese' : 'English';
        const learningLangName = learningLanguage.charAt(0).toUpperCase() + learningLanguage.slice(1);
        
        const prompt = `Create a clear and natural-sounding example sentence in ${learningLangName} using the word "${word.word}".
The sentence should be appropriate for an intermediate language learner and effectively demonstrate the word's typical usage and context.
After the sentence, provide a translation in ${targetLangName}.
Separate the original sentence and its translation with "---Translation---".`;
        
        const response = await ai.models.generateContent({ model: textModel, contents: prompt });
        return response.text;
    });
};

export const generateQuizForWord = async (word: VocabularyWord, targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<Quiz | null> => {
    return executeWithKeyRotation(async (ai) => {
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
    });
};

export const generateImageForWord = async (word: string): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const response = await ai.models.generateImages({
            model: imagenModel,
            prompt: `A clear, simple, high-quality image of: ${word}. Centered object, clean background.`,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '1:1',
            },
        });

        if (response.generatedImages?.[0]?.image?.imageBytes) {
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        }
        throw new Error("No image generated");
    });
};

export const generateImageFromPrompt = async (prompt: string): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const response = await ai.models.generateImages({
            model: imagenModel,
            prompt: prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '1:1',
            },
        });

        if (response.generatedImages?.[0]?.image?.imageBytes) {
          const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
          return `data:image/jpeg;base64,${base64ImageBytes}`;
        }
        throw new Error("No image generated from prompt");
    });
};


export const editImage = async (base64Data: string, mimeType: string, prompt: string): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
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
    });
};

export const getWordInfo = async (word: string, targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<WordInfo> => {
    return executeWithKeyRotation(async (ai) => {
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
    });
};

export const getSynonymsAndAntonyms = async (word: string, targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<{ synonyms: string[], antonyms: string[] } | null> => {
    return executeWithKeyRotation(async (ai) => {
        const prompt = `For the ${learningLanguage} word "${word}", provide up to 4 relevant synonyms and up to 4 relevant antonyms. The synonyms and antonyms themselves should be in ${learningLanguage}. Return a JSON object. If no synonyms or antonyms are found, return an empty array for that key.`;
        
        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
                        antonyms: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["synonyms", "antonyms"]
                }
            }
        });

        return parseJsonResponse<{ synonyms: string[], antonyms: string[] }>(response.text);
    });
};

export const getEtymology = async (word: string, targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string | null> => {
    return executeWithKeyRotation(async (ai) => {
        const prompt = `Provide a concise etymology for the ${learningLanguage} word "${word}". Explain its origin and evolution simply, suitable for a language learner. The explanation should be in ${targetLanguage === 'vietnamese' ? 'Vietnamese' : 'English'}. Provide only the explanation text.`;
        
        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt
        });

        return response.text.trim();
    });
};


export const generateSpeech = async (word: string, learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const voiceMap: Record<LearningLanguage, string> = {
            'german': 'Puck',
            'english': 'Zephyr',
            'chinese': 'Kore'
        };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: word }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceMap[learningLanguage] || 'Zephyr' },
                    },
                },
            },
        });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            return base64Audio;
        }

        throw new Error("No audio generated");
    });
};

export const checkSentence = async (sentence: string, word: string, targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const prompt = `The user is learning ${learningLanguage} and wrote a sentence${word ? ` using the word "${word}"` : ''}.
User's sentence: "${sentence}"
1. Check if the sentence is grammatically correct and makes sense.
2. Provide short, clear feedback in ${targetLanguage === 'vietnamese' ? 'Vietnamese' : 'English'}.
3. If there are errors, explain them simply and suggest a correction.
4. Keep the feedback encouraging and suitable for a beginner.`;
        const response = await ai.models.generateContent({ model: textModel, contents: prompt });
        return response.text;
    });
};

export const rewriteSentence = async (sentence: string, word: string, targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const prompt = `The user is learning ${learningLanguage} and wrote a sentence.
User's sentence: "${sentence}"
Rewrite this sentence to make it sound more natural and correct${word ? `, while still using the word "${word}"` : ''}.
Provide only the rewritten sentence.`;
        const response = await ai.models.generateContent({ model: textModel, contents: prompt });
        return response.text;
    });
};

export const getChatResponseForWord = async (word: VocabularyWord, question: string, history: ChatMessage[], targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
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
    });
};

export const getChatResponseForTutor = async (history: {user: string, model: string}[], newMessage: string, learningLanguage: LearningLanguage, targetLanguage: TargetLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const historySummary = history.map(t => `User: ${t.user}\nAI: ${t.model}`).join('\n\n');
        
        const systemInstruction = `You are a friendly language tutor. The user is learning ${learningLanguage}. Converse with them in ${learningLanguage} to help them practice. Keep your responses concise. The user's native language is ${targetLanguage}.
This is the conversation so far for context:
${historySummary}`;

        const chatHistoryForApi = history.flatMap(turn => [
            { role: 'user', parts: [{ text: turn.user }] },
            { role: 'model', parts: [{ text: turn.model }] }
        ]);

        const chat = ai.chats.create({
            model: textModel,
            config: { systemInstruction },
            history: chatHistoryForApi
        });

        const result = await chat.sendMessage({ message: newMessage });
        return result.text;
    });
};


export const generateHintsForWord = async (word: VocabularyWord, targetLanguage: TargetLanguage, learningLanguage: LearningLanguage) => {
    return executeWithKeyRotation(async (ai) => {
        const prompt = `For the ${learningLanguage} word "${word.word}", generate four progressive hints for a word-guessing game. The user knows the number of letters.
    1.  **Hint 1 (Riddle):** A short, clever riddle or a descriptive clue about the word. This is the first thing the user sees.
    2.  **Hint 2 (Category):** The general category or theme of the word (e.g., Food, Animal).
    3.  **Hint 3 (Sentence):** An example sentence using the word, but replace the word with underscores (\\_). The sentence should clearly suggest the word.
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
                        hint1: { type: Type.STRING, description: "Riddle or descriptive clue" },
                        hint2: { type: Type.STRING, description: "Category/Theme" },
                        hint3: { type: Type.STRING, description: "Example sentence with blank" },
                        hint4: { type: Type.STRING, description: "First letter" },
                    },
                    required: ["hint1", "hint2", "hint3", "hint4"]
                }
            }
        });
        return parseJsonResponse<{ hint1: string; hint2: string; hint3: string; hint4: string; }>(response.text);
    });
};

export const generateScrambledSentence = async (word: VocabularyWord, learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const prompt = `Create one simple, clear example sentence in ${learningLanguage} using the word "${word.word}".
    The sentence should be suitable for a language learner.
    Provide only the sentence itself, with no extra text or translation.`;
        const response = await ai.models.generateContent({ model: textModel, contents: prompt });
        return response.text.trim();
    });
};

export const generateWritingPrompt = async (language: TargetLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const prompt = `Generate a short, simple, and interesting writing prompt for a language learner.
    It can be a question, a "what if" scenario, or a request to describe something.
    The prompt should be in ${language === 'vietnamese' ? 'Vietnamese' : 'English'}.
    Provide only the prompt text.`;
        const response = await ai.models.generateContent({ model: textModel, contents: prompt });
        return response.text.trim();
    });
};

export const checkGrammar = async (text: string, learningLanguage: LearningLanguage, targetLanguage: TargetLanguage) => {
    return executeWithKeyRotation(async (ai) => {
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
    });
};

export const generateAiLesson = async (theme: string, learningLanguage: LearningLanguage, targetLanguage: TargetLanguage): Promise<AiLesson | null> => {
    return executeWithKeyRotation(async (ai) => {
        const systemInstruction = `You are a language teacher AI. Create a mini-lesson for a user learning ${learningLanguage}. The user's native language is ${targetLanguage}.
The lesson must be about the theme: "${theme}".
Structure the output as a single JSON object.
The lesson should contain four parts:
1.  "vocabulary": An array of 10-12 useful vocabulary words related to the theme. Each object should have "word" (in ${learningLanguage}) and "translation" (in ${targetLanguage}).
2.  "dialogue": A short, practical dialogue between two speakers (e.g., A and B) using some of the vocabulary. It should be an array of objects, each with "speaker" and "line" (in ${learningLanguage}).
3.  "story": A very short, simple story (3-5 sentences) that incorporates some of the vocabulary. The story should be in ${learningLanguage}.
4.  "grammarTip": A simple, relevant grammar tip related to the vocabulary or dialogue. The object should have "title" and "explanation" (in ${targetLanguage}).
All content should be suitable for an A2/B1 level learner.`;

        const response = await ai.models.generateContent({
            model: textModel,
            contents: `Generate a lesson about "${theme}".`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        vocabulary: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: { word: { type: Type.STRING }, translation: { type: Type.STRING } },
                                required: ["word", "translation"]
                            }
                        },
                        dialogue: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: { speaker: { type: Type.STRING }, line: { type: Type.STRING } },
                                required: ["speaker", "line"]
                            }
                        },
                        story: { type: Type.STRING },
                        grammarTip: {
                            type: Type.OBJECT,
                            properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING } },
                            required: ["title", "explanation"]
                        }
                    },
                    required: ["vocabulary", "dialogue", "story", "grammarTip"]
                }
            }
        });
        return parseJsonResponse<AiLesson>(response.text);
    });
};

export const generateDailyMission = async (words: VocabularyWord[], stats: UserStats, learningLanguage: LearningLanguage): Promise<string> => {
    return executeWithKeyRotation(async (ai) => {
        const wordsForReview = words.filter(w => w.nextReview <= Date.now()).slice(0, 10).map(w => w.word);
        
        const prompt = `You are a friendly language learning coach. Based on the user's data, create a short, encouraging, and specific daily mission in Vietnamese.
        - User's learning language: ${learningLanguage}
        - Total words learned: ${stats.totalWords}
        - Current learning streak: ${stats.currentStreak} days
        - Words due for review today: ${wordsForReview.length > 0 ? wordsForReview.join(', ') : 'none'}
        
        Generate a single, actionable mission for today. Be creative. Suggest a specific activity available in the app (e.g., "Ôn tập nhanh", "Thẻ ghi nhớ", "Luyện viết", a game like "Đoán chữ").
        Keep the mission text concise (1-2 sentences). Address the user directly.
        
        Example outputs:
        "Chuỗi ${stats.currentStreak} ngày thật tuyệt vời! Nhiệm vụ hôm nay: dùng 'Thẻ ghi nhớ' để ôn lại 5 từ và thử sức với game 'Đoán chữ' nhé!"
        "Hôm nay hãy thử thách bản thân! Dùng công cụ "Tạo truyện AI" với ít nhất 3 từ mới xem sao."
        "Bạn có ${wordsForReview.length} từ cần ôn tập. Hãy vào mục 'Ôn tập Thông minh' để củng cố lại chúng ngay nào!"
        
        Provide only the mission text.`;

        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt,
            config: { temperature: 0.8 }
        });
        return response.text.trim();
    });
};

export const validateDuelWord = async (
    word: string,
    usedWords: string[],
    language: LearningLanguage,
    context: { mode: 'theme' | 'longest' | 'chain', theme?: string, startingLetter?: string, lastWord?: string }
): Promise<{ isValid: boolean; reason: string }> => {
    return executeWithKeyRotation(async (ai) => {
        let rules = `1. It must be a real, correctly spelled word in ${language}.
2. It must NOT have been used before. Used words: ${usedWords.join(', ')}.`;

        switch (context.mode) {
            case 'theme':
                rules += `\n3. It must be relevant to the theme "${context.theme}". If the theme is "any", any valid word is acceptable.`;
                break;
            case 'longest':
                rules += `\n3. It MUST start with the letter "${context.startingLetter}".`;
                break;
            case 'chain':
                let startRule = '';
                const lastLetter = context.lastWord ? context.lastWord.slice(-1).toLowerCase() : '';

                switch(language) {
                    case 'german':
                        if (lastLetter === 'ß') {
                            startRule = `The previous word ended in 'ß', so the new word MUST start with the letter 's'.`;
                        } else {
                            startRule = `It MUST start with the letter "${lastLetter}", which is the last letter of the previous word "${context.lastWord}".`;
                        }
                        break;
                    case 'chinese':
                        const lastChar = context.lastWord ? context.lastWord.slice(-1) : '';
                        startRule = `The first character of the new word MUST be "${lastChar}", which is the last character of the previous word "${context.lastWord}". It must be a multi-character word.`;
                        break;
                    default: // english
                        startRule = `It MUST start with the letter "${lastLetter}", which is the last letter of the previous word "${context.lastWord}".`;
                }
                rules += `\n3. ${startRule}`;
                break;
        }

        const systemInstruction = `You are a strict referee for a word game in ${language}.
The user has provided a word. You must determine if it's valid based on these rules:
${rules}
Analyze the user's word and respond ONLY with a JSON object.`;
        
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `The user's word is: "${word}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isValid: { type: Type.BOOLEAN },
                        reason: { type: Type.STRING, description: "A brief explanation in Vietnamese if the word is invalid. E.g., 'Từ đã được sử dụng', 'Không đúng chữ cái bắt đầu', 'Không phải là một từ hợp lệ'." }
                    },
                    required: ["isValid", "reason"]
                }
            }
        });

        const result = parseJsonResponse<{ isValid: boolean; reason: string }>(response.text);
        return result || { isValid: false, reason: "Lỗi phân tích phản hồi từ AI." };
    });
};

export const getAiDuelWord = async (
    usedWords: string[],
    language: LearningLanguage,
    difficulty: 'easy' | 'medium' | 'hard' | 'hell',
    context: { mode: 'theme' | 'longest' | 'chain' | 'first', theme?: string, startingLetter?: string, lastWord?: string }
): Promise<{ word: string }> => {
    return executeWithKeyRotation(async (ai) => {
        let task = '';
        switch (context.mode) {
            case 'theme':
            case 'first': // The first word can be theme-based
                task = `Provide one new, valid word related to the theme "${context.theme}". If the theme is "any", you can choose a word from any theme.`;
                break;
            case 'longest':
                task = `Provide one new, valid word that starts with the letter "${context.startingLetter}". Your goal is to find a LONG word to score a point.`;
                break;
            case 'chain':
                let chainRule = '';
                 const lastLetter = context.lastWord ? context.lastWord.slice(-1).toLowerCase() : '';
                 switch(language) {
                    case 'german':
                        if (lastLetter === 'ß') {
                            chainRule = `Provide one new, valid word that starts with the letter 's' (because the previous word "${context.lastWord}" ended in 'ß').`;
                        } else {
                            chainRule = `Provide one new, valid word that starts with the letter "${lastLetter}" (from the end of "${context.lastWord}").`;
                        }
                        break;
                    case 'chinese':
                        const lastChar = context.lastWord ? context.lastWord.slice(-1) : '';
                        chainRule = `Provide one new, valid multi-character word where the first character is "${lastChar}" (from the end of "${context.lastWord}").`;
                        break;
                    default: // english
                         chainRule = `Provide one new, valid word that starts with the letter "${lastLetter}" (from the end of "${context.lastWord}").`;
                }
                task = chainRule;
                break;
        }

        let difficultyInstruction = '';
        switch (difficulty) {
            case 'easy': difficultyInstruction = 'Choose a very common and obvious word.'; break;
            case 'medium': difficultyInstruction = 'Choose a moderately common word.'; break;
            case 'hard': difficultyInstruction = `Choose a less common, more specific, or creative word. For 'longest word' mode, try to find a genuinely long word.`; break;
            case 'hell': difficultyInstruction = `Choose a very specific, rare, or clever word that is still valid. Try to win. For 'longest word' mode, find the longest possible valid word you can think of.`; break;
        }

        const systemInstruction = `You are an AI player in a word game in ${language}.
${task}
The word MUST NOT be in this list of already used words: ${usedWords.join(', ')}.
Your difficulty level is ${difficulty}. ${difficultyInstruction}
Respond ONLY with a JSON object containing the word.`;
        
        const response = await ai.models.generateContent({
            model: textModel,
            contents: "Your turn. Provide your word.",
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        word: { type: Type.STRING, description: `A single word in ${language} that follows the rules.` }
                    },
                    required: ["word"]
                }
            }
        });

        const result = parseJsonResponse<{ word: string }>(response.text);
        if (!result || !result.word) {
            return { word: '' }; // Fallback
        }
        return result;
    });
};