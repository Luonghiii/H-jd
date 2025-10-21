import { Modality } from "@google/genai";
import { executeWithKeyRotation } from './client';

export const generateSpeech = async (word: string, learningLanguage: string): Promise<string> => {
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
