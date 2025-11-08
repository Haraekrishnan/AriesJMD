import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./rtdb";

export async function uploadFile(file: File, path: string): Promise<string> {
    const storageRef = ref(storage, path);
    
    // Create metadata with the original file name
    const metadata = {
        customMetadata: {
            'original_name': file.name
        }
    };

    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
}
