import { Modality } from "@google/genai";
import { GeneratedWord } from '../../types';
import { executeWithKeyRotation } from './client';

export const getWordsFromImage = async (base64: string, mimeType: string, existingWords: string[], learningLanguage: string, themes: string[]): Promise<GeneratedWord[]> => {
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
        const jsonString = response.text.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
        try {
            return JSON.parse(jsonString) as GeneratedWord[];
        } catch (e) {
            console.error("Failed to parse JSON from AI image response:", jsonString);
            throw new Error("Invalid response format from AI.");
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

export const generateImageForWord = (word: string) => generateImageFromPrompt(word);

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

export const identifyObjectInImage = async (base64: string, mimeType: string, coords: { x: number, y: number }, learningLanguage: string): Promise<GeneratedWord | null> => {
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
