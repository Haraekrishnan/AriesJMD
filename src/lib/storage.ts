import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./rtdb";

export async function uploadFile(file: File, path: string): Promise<string> {
    console.log(`[Storage] Entering uploadFile. File: ${file.name}, Size: ${file.size}, Target path: ${path}`);
    
    try {
        const storageRef = ref(storage, path);
        
        // Upload the file and get the snapshot
        console.log(`[Storage] Starting uploadBytes for ${path}...`);
        const snapshot = await uploadBytes(storageRef, file);
        console.log(`[Storage] uploadBytes complete. Snapshot metadata:`, snapshot.metadata);
        
        // Get the download URL from the snapshot
        console.log(`[Storage] Requesting download URL for ${path}...`);
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log(`[Storage] Download URL received: ${downloadURL}`);
        
        return downloadURL;
    } catch (error) {
        console.error(`[Storage] Error uploading file to ${path}:`, error);
        throw error;
    }
}
