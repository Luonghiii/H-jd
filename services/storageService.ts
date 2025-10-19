import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const storage = getStorage();

const MAX_AVATAR_DIMENSION = 512; // 512px max width/height

export const resizeAndCropImageAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("Couldn't read file"));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                
                // Center-crop logic
                const sourceWidth = img.width;
                const sourceHeight = img.height;
                const sourceSize = Math.min(sourceWidth, sourceHeight);
                const sourceX = (sourceWidth - sourceSize) / 2;
                const sourceY = (sourceHeight - sourceSize) / 2;
                
                const destSize = Math.min(MAX_AVATAR_DIMENSION, sourceSize);
                canvas.width = destSize;
                canvas.height = destSize;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
                
                ctx.drawImage(
                    img,
                    sourceX,
                    sourceY,
                    sourceSize,
                    sourceSize,
                    0,
                    0,
                    destSize,
                    destSize
                );

                const dataUrl = canvas.toDataURL(file.type, 0.9);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};
