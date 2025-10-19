import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const storage = getStorage();

const MAX_AVATAR_DIMENSION = 512; // 512px max width/height
const MAX_BACKGROUND_DIMENSION = 1920; // For full HD screens, a good compromise

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

export const resizeBackgroundImageAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("Không thể đọc file"));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                if (width > MAX_BACKGROUND_DIMENSION || height > MAX_BACKGROUND_DIMENSION) {
                    if (width > height) {
                        height = Math.round(height * (MAX_BACKGROUND_DIMENSION / width));
                        width = MAX_BACKGROUND_DIMENSION;
                    } else {
                        width = Math.round(width * (MAX_BACKGROUND_DIMENSION / height));
                        height = MAX_BACKGROUND_DIMENSION;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Không thể lấy context canvas'));
                }
                
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                
                if (dataUrl.length > 800 * 1024) { // Firestore doc limit is 1MiB. 800KB is a safe cap for base64 string.
                     return reject(new Error('Ảnh sau khi nén vẫn quá lớn. Vui lòng chọn ảnh khác.'));
                }

                resolve(dataUrl);
            };
            img.onerror = () => reject(new Error("Không thể tải ảnh. File có thể bị hỏng."));
        };
        reader.onerror = () => reject(new Error("Không thể đọc file."));
    });
};