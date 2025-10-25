import { GoogleGenAI } from "@google/genai";
import eventBus from '../../utils/eventBus';

let currentApiIndex = 0;
let userApiKeys: string[] = [];

export const setApiKeys = (keys: string[]) => {
    userApiKeys = keys;
};

export const executeWithKeyRotation = async <T>(apiCall: (ai: GoogleGenAI) => Promise<T>): Promise<T> => {
    const systemApiKey = process.env.API_KEY;
    
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
                keyIndex = (keyIndex + 1) % totalKeys;
            } else {
                throw error;
            }
        }
    }

    eventBus.dispatch('notification', { type: 'error', message: 'Tất cả các khóa API đều không hợp lệ hoặc đã hết hạn mức.' });
    throw new Error("All API keys failed.");
};