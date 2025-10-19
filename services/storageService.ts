import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const storage = getStorage();

const MAX_AVATAR_DIMENSION = 512; // 512px max width/height

const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            if (!event.target?.result) {
                return reject(new Error("Couldn't read file"));
            }
            img.src = event.target.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round(height * (maxWidth / width));
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round(width * (maxHeight / height));
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Canvas to Blob conversion failed'));
                        }
                    },
                    file.type,
                    0.9 // Image quality for JPEG/WebP
                );
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};


export const uploadAvatar = async (uid: string, file: File): Promise<string> => {
    if (!uid) throw new Error("User not authenticated for avatar upload.");
    if (!file) throw new Error("No file provided for upload.");

    try {
        // Resize image before uploading to prevent size limit errors
        const imageBlob = await resizeImage(file, MAX_AVATAR_DIMENSION, MAX_AVATAR_DIMENSION);

        // Sanitize filename and create a storage reference
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const storageRef = ref(storage, `avatars/${uid}/${Date.now()}_${safeFileName}`);

        // Upload the resized blob
        const snapshot = await uploadBytes(storageRef, imageBlob);

        // Get the download URL
        const downloadURL = await getDownloadURL(snapshot.ref);

        return downloadURL;

    } catch (error: any) {
        console.error("Avatar upload failed:", error);

        if (error instanceof Error && (error.message.includes('Canvas') || error.message.includes('Blob'))) {
            throw new Error("Không thể xử lý ảnh. Vui lòng chọn một định dạng ảnh khác (JPG, PNG).");
        }

        switch (error.code) {
            case 'storage/unauthorized':
                throw new Error("Bạn không có quyền tải lên. Vui lòng kiểm tra lại cài đặt.");
            case 'storage/canceled':
                throw new Error("Quá trình tải lên đã bị hủy.");
            case 'storage/unknown':
                throw new Error("Đã xảy ra lỗi mạng hoặc lỗi không xác định. Vui lòng thử lại.");
            default:
                throw new Error("Tải ảnh lên thất bại do lỗi không xác định.");
        }
    }
};