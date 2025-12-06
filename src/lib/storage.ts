
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./rtdb";

export async function uploadFile(file: File, path: string): Promise<string> {
    const storageRef = ref(storage, path);
    const metadata = {
        contentType: file.type,
    };
    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
}
