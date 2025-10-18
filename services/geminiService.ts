import { GoogleGenAI, Type, Modality } from "@google/genai";
import { VocabularyWord, TargetLanguage, ChatMessage, LearningLanguage, WordInfo, GeneratedWord } from "../types";

// FIX: API key must be obtained exclusively from process.env.API_KEY per coding guidelines.
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const languageMap: Record<LearningLanguage, string> = {
    german: 'German',
    english: 'English',
    chinese: 'Chinese',
};


export const translateWord = async (word: string, targetLanguage: 'English' | 'Vietnamese', learningLanguage: LearningLanguage): Promise<string> => {
  try {
    const ai = getAiClient();
    const sourceLanguage = languageMap[learningLanguage];
    const prompt = `Translate the following ${sourceLanguage} word to ${targetLanguage}. Respond with ONLY the translated word/phrase itself, without any extra text or quotation marks.\n\n${sourceLanguage} word: "${word}"`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error translating word:", error);
    throw error;
  }
};


export const checkSentence = async (sentence: string, word: string, targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
  try {
    const ai = getAiClient();
    const sourceLanguage = languageMap[learningLanguage];
    const prompt = `
      You are an expert ${sourceLanguage} language teacher assisting a ${targetLanguage}-speaking student.
      The student is learning the ${sourceLanguage} word: "${word}".
      They wrote the following sentence: "${sentence}".

      Your tasks are:
      1. Analyze if the sentence is grammatically correct in ${sourceLanguage}.
      2. Check if the word "${word}" is used naturally and correctly in the context of the sentence.
      3. Provide clear, concise feedback.

      If the sentence is perfect, congratulate the student.
      If there are errors, provide a corrected version of the sentence and a very brief, simple explanation of the mistake in ${targetLanguage}.

      Respond in a friendly and encouraging tone.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error checking sentence:", error);
    throw error;
  }
};

export const generateStory = async (words: string[], targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
  if (words.length === 0) {
    return "Please select some words to generate a story.";
  }
  try {
    const ai = getAiClient();
    const sourceLanguage = languageMap[learningLanguage];
    const prompt = `
      You are a creative storyteller. Write a very short and simple story in ${sourceLanguage}, suitable for an A1/A2 level language learner.
      The story must include the following ${sourceLanguage} words: ${words.join(', ')}.
      
      After the ${sourceLanguage} story, provide a full ${targetLanguage} translation under a "---Translation---" separator.
      Make the story interesting and easy to understand.
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating story:", error);
    throw error;
  }
};

export const rewriteSentence = async (sentence: string, word: string, targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
  try {
    const ai = getAiClient();
    const sourceLanguage = languageMap[learningLanguage];
    const prompt = `
      You are an expert ${sourceLanguage} language teacher assisting a ${targetLanguage}-speaking student.
      The student is learning the ${sourceLanguage} word: "${word}".
      They wrote the sentence: "${sentence}".

      Your task is to rewrite their sentence in a more natural, interesting, or stylistically better way.
      - The rewritten sentence must still use the word "${word}" correctly.
      - Provide one alternative sentence.
      - After the rewritten sentence, add a brief, simple explanation in ${targetLanguage} about what makes this version different or better (e.g., "This version sounds more natural in conversation," or "This uses a more common word order.").

      Respond in a friendly and encouraging tone. Structure your response clearly.
      For example:
      Alternative: [Your rewritten sentence here]
      
      Explanation: [Your brief explanation here]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error rewriting sentence:", error);
    throw error;
  }
};

export const generateSentence = async (word: VocabularyWord, targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
  try {
    const ai = getAiClient();
    const sourceLanguage = languageMap[learningLanguage];
    const prompt = `
      You are a helpful ${sourceLanguage} language teacher creating an example for a ${targetLanguage}-speaking student.
      The student is learning the ${sourceLanguage} word: "${word.word}" (which means "${word.translation[targetLanguage]}" in ${targetLanguage}).
      
      Your task is to create one clear, simple, and natural example sentence in ${sourceLanguage} using the word "${word.word}".
      The sentence should be appropriate for an A1/A2 level learner.
      
      After the ${sourceLanguage} sentence, provide its ${targetLanguage} translation under a "---Translation---" separator.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating sentence:", error);
    throw error;
  }
};


export const generateQuizForWord = async (word: VocabularyWord, targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<{ question: string; options: string[]; correctAnswer: string } | null> => {
  const correctTranslation = word.translation[targetLanguage];
  try {
    const ai = getAiClient();
    const sourceLanguage = languageMap[learningLanguage];
    const prompt = `Create a multiple-choice quiz question for a ${targetLanguage}-speaking student learning ${sourceLanguage}. The ${sourceLanguage} word is "${word.word}". The correct ${targetLanguage} translation is "${correctTranslation}". Generate three plausible but incorrect ${targetLanguage} translations to be used as distractors. Return a JSON object with the question, the four shuffled options, and the correct answer. The question should be in ${targetLanguage}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING, description: `A question asking for the translation of ${word.word}` },
            options: {
              type: Type.ARRAY,
              description: "An array of 4 strings, one correct answer and three distractors, shuffled.",
              items: { type: Type.STRING }
            },
            correctAnswer: { type: Type.STRING, description: `The correct translation: ${correctTranslation}` }
          },
          required: ["question", "options", "correctAnswer"]
        }
      }
    });
    
    const quizData = JSON.parse(response.text.trim());
    
    if (!quizData.options.includes(quizData.correctAnswer)) {
        const randomIndex = Math.floor(Math.random() * 4);
        quizData.options[randomIndex] = quizData.correctAnswer;
    }
    
    return quizData;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
  }
};

export const generateImageForWord = async (word: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `A simple, clear, cute vector illustration of "${word}", on a clean white background, minimalist style.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
      }
    }
    
    throw new Error("No image data received from API.");

  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

export const getWordInfo = async (word: string, targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<WordInfo> => {
  try {
    const ai = getAiClient();
    const sourceLanguage = languageMap[learningLanguage];
    const genderPrompt = learningLanguage === 'german' 
        ? "its gender (der, die, das) if it's a noun (return null if not applicable),"
        : "";
    
    const genderProperty = learningLanguage === 'german' 
        ? { gender: { type: Type.STRING, description: "The gender of the noun (der, die, das), or null." } }
        : {};
        
    const prompt = `Analyze the ${sourceLanguage} word "${word}". Provide its grammatical type (e.g., Noun, Verb, Adjective, Adverb, Preposition), ${genderPrompt} and a concise one-sentence definition in ${targetLanguage}.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    partOfSpeech: { type: Type.STRING, description: "The grammatical type of the word, e.g., Noun." },
                    ...genderProperty,
                    definition: { type: Type.STRING, description: `A concise definition in ${targetLanguage}.` }
                },
                required: ["partOfSpeech", "definition"]
            }
        }
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error(`Error getting info for word "${word}":`, error);
    throw error;
  }
};

export const getChatResponseForWord = async (word: VocabularyWord, question: string, chatHistory: ChatMessage[], targetLanguage: TargetLanguage, learningLanguage: LearningLanguage): Promise<string> => {
    try {
        const ai = getAiClient();
        const sourceLanguage = languageMap[learningLanguage];
        const historyText = chatHistory.map(msg => `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.text}`).join('\n');

        const prompt = `
            You are a helpful and concise ${sourceLanguage} language tutor. A ${targetLanguage}-speaking student is asking about the ${sourceLanguage} word "${word.word}" (which means "${word.translation[targetLanguage]}"). 
            
            Given the previous conversation and their new question, provide a clear and simple answer in ${targetLanguage}. Keep the response focused and brief.

            Previous Conversation:
            ${historyText}

            Student's new question: "${question}"
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Error getting chat response:", error);
        throw error;
    }
};

export const generateWordsFromPrompt = async (
  userPrompt: string,
  existingWords: string[],
  learningLanguage: LearningLanguage
): Promise<GeneratedWord[]> => {
  try {
    const ai = getAiClient();
    const sourceLanguage = languageMap[learningLanguage];
    const prompt = `
      You are a language teacher creating a vocabulary list for a student learning ${sourceLanguage}.
      The student's request is: "${userPrompt}".
      The student already knows these words, so DO NOT include them in your response: ${existingWords.join(', ')}.
      
      Generate a list of new, relevant words based on the student's request. For each word, provide:
      1. The word in ${sourceLanguage}.
      2. Its Vietnamese translation ("translation_vi").
      3. Its English translation ("translation_en").
      4. A suitable theme/category in Vietnamese ("theme").

      Ensure the theme is a simple, common category name.
      If the request is unreasonable or you cannot generate words, return an empty array.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: `The word in ${sourceLanguage}` },
              translation_vi: { type: Type.STRING, description: "The Vietnamese translation" },
              translation_en: { type: Type.STRING, description: "The English translation" },
              theme: { type: Type.STRING, description: "The category/theme in Vietnamese" }
            },
            required: ["word", "translation_vi", "translation_en", "theme"]
          }
        }
      }
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Error generating words from prompt:", error);
    throw error;
  }
};


export const getWordsFromImage = async (
  base64ImageData: string,
  mimeType: string,
  existingWords: string[],
  learningLanguage: LearningLanguage
): Promise<GeneratedWord[]> => {
  try {
    const ai = getAiClient();
    const sourceLanguage = languageMap[learningLanguage];
    
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64ImageData,
      },
    };
    
    const textPart = {
      text: `
        You are a language teacher helping a student learn ${sourceLanguage} from an image.
        Identify 5 to 10 key objects or concepts in this image.
        The student already knows these words, so DO NOT include them in your response: ${existingWords.join(', ')}.
        
        For each new object/concept you identify, provide:
        1. The word in ${sourceLanguage}.
        2. Its Vietnamese translation ("translation_vi").
        3. Its English translation ("translation_en").
        4. A suitable theme/category in Vietnamese ("theme").
        
        Return an array of these words in the specified JSON format. If you cannot identify anything new, return an empty array.
      `
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: `The word in ${sourceLanguage}` },
              translation_vi: { type: Type.STRING, description: "The Vietnamese translation" },
              translation_en: { type: Type.STRING, description: "The English translation" },
              theme: { type: Type.STRING, description: "The category/theme in Vietnamese" }
            },
            required: ["word", "translation_vi", "translation_en", "theme"]
          }
        }
      }
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Error getting words from image:", error);
    throw error;
  }
};

export const getWordsFromFile = async (
  base64FileData: string,
  mimeType: string,
  existingWords: string[],
  learningLanguage: LearningLanguage
): Promise<GeneratedWord[]> => {
  try {
    const ai = getAiClient();
    const sourceLanguage = languageMap[learningLanguage];
    
    const filePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64FileData,
      },
    };
    
    const textPart = {
      text: `
        You are a language teacher helping a student learn ${sourceLanguage} by extracting vocabulary from a document.
        Identify 10 to 20 key vocabulary words or short phrases from the provided file.
        The student already knows these words, so DO NOT include them in your response: ${existingWords.join(', ')}.
        
        For each new word/phrase you identify, provide:
        1. The word/phrase in ${sourceLanguage}.
        2. Its Vietnamese translation ("translation_vi").
        3. Its English translation ("translation_en").
        4. A suitable theme/category in Vietnamese ("theme") based on the document's content.
        
        Return an array of these words in the specified JSON format. If you cannot identify anything new or the file is not suitable, return an empty array.
      `
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [filePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: `The word in ${sourceLanguage}` },
              translation_vi: { type: Type.STRING, description: "The Vietnamese translation" },
              translation_en: { type: Type.STRING, description: "The English translation" },
              theme: { type: Type.STRING, description: "The category/theme in Vietnamese" }
            },
            required: ["word", "translation_vi", "translation_en", "theme"]
          }
        }
      }
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Error getting words from file:", error);
    throw error;
  }
};
