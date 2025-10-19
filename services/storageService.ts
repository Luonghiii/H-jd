import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth } from './firebase';

const storage = getStorage();

export const uploadAvatar = async (uid: string, file: File): Promise<string> => {
    if (!uid) throw new Error("User not authenticated for avatar upload.");
    if (!file) throw new Error("No file provided for upload.");

    // Create a storage reference
    const storageRef = ref(storage, `avatars/${uid}/${Date.now()}_${file.name}`);

    // 'file' comes from the Blob or File API
    const snapshot = await uploadBytes(storageRef, file);

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
};
