import { GoogleGenAI, Type } from "@google/genai";
import { VocabularyWord, TargetLanguage } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const translateWord = async (word: string, targetLanguage: 'English' | 'Vietnamese'): Promise<string> => {
  try {
    const prompt = `Translate the following German word to ${targetLanguage}. Respond with ONLY the translated word/phrase itself, without any extra text or quotation marks.\n\nGerman word: "${word}"`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error translating word:", error);
    return "Translation failed";
  }
};


export const checkGermanSentence = async (sentence: string, word: string, targetLanguage: TargetLanguage): Promise<string> => {
  try {
    const prompt = `
      You are an expert German language teacher assisting a ${targetLanguage}-speaking student.
      The student is learning the German word: "${word}".
      They wrote the following sentence: "${sentence}".

      Your tasks are:
      1. Analyze if the sentence is grammatically correct in German.
      2. Check if the word "${word}" is used naturally and correctly in the context of the sentence.
      3. Provide clear, concise feedback.

      If the sentence is perfect, congratulate the student.
      If there are errors, provide a corrected version of the sentence and a very brief, simple explanation of the mistake in ${targetLanguage}.

      Respond in a friendly and encouraging tone.
    `;
i
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error checking sentence:", error);
    return "Sorry, I couldn't check your sentence right now. Please try again later.";
  }
};

export const generateGermanStory = async (words: string[], targetLanguage: TargetLanguage): Promise<string> => {
  if (words.length === 0) {
    return "Please select some words to generate a story.";
  } ko
  try {
    const prompt = `
      You are a creative storyteller. Write a very short and simple story in German, suitable for an A1/A2 level language learner.
      The story must include the following German words: ${words.join(', ')}.
      
      After the German story, provide a full ${targetLanguage} translation under a "---Translation---" separator.
      Make the story interesting and easy to understand.
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating story:", error);
    return "Sorry, I couldn't generate a story right now. Please try again later.";
  }
};

export const rewriteGermanSentence = async (sentence: string, word: string, targetLanguage: TargetLanguage): Promise<string> => {
  try {
    const prompt = `
      You are an expert German language teacher assisting a ${targetLanguage}-speaking student.
      The student is learning the German word: "${word}".
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
    return "Sorry, I couldn't rewrite the sentence right now. Please try again later.";
  }
};

export const generateGermanSentence = async (word: VocabularyWord, targetLanguage: TargetLanguage): Promise<string> => {
  try {
    const prompt = `
      You are a helpful German language teacher creating an example for a ${targetLanguage}-speaking student.
      The student is learning the German word: "${word.german}" (which means "${word.translation[targetLanguage]}" in ${targetLanguage}).
      
      Your task is to create one clear, simple, and natural example sentence in German using the word "${word.german}".
      The sentence should be appropriate for an A1/A2 level learner.
      
      After the German sentence, provide its ${targetLanguage} translation under a "---Translation---" separator.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating sentence:", error);
    return "Sorry, I couldn't generate a sentence right now. Please try again later.";
  }
};


export const generateQuizForWord = async (word: VocabularyWord, targetLanguage: TargetLanguage): Promise<{ question: string; options: string[]; correctAnswer: string } | null> => {
  const correctTranslation = word.translation[targetLanguage];
  try {
    const prompt = `Create a multiple-choice quiz question for a ${targetLanguage}-speaking student learning German. The German word is "${word.german}". The correct ${targetLanguage} translation is "${correctTranslation}". Generate three plausible but incorrect ${targetLanguage} translations to be used as distractors. Return a JSON object with the question, the four shuffled options, and the correct answer. The question should be in ${targetLanguage}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING, description: `A question asking for the translation of ${word.german}` },
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
    
    const quizData = JSON.parse(response.text);
    
    // Ensure the correct answer is one of the options, Gemini can sometimes forget.
    if (!quizData.options.includes(quizData.correctAnswer)) {
        const randomIndex = Math.floor(Math.random() * 4);
        quizData.options[randomIndex] = quizData.correctAnswer;
    }
    
    return quizData;
  } catch (error) {
    console.error("Error generating quiz:", error);
    return null;
  }
};