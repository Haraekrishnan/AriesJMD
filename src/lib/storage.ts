
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./rtdb";

export async function uploadFile(file: File, path: string): Promise<string> {
    const storageRef = ref(storage, path);
    
    // Upload the file and get the snapshot
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the download URL from the snapshot
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
}
