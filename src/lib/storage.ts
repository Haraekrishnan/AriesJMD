import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./rtdb";

export async function uploadFile(file: File, path: string): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "my_unsigned_upload"); 

    try {
        const res = await fetch("https://api.cloudinary.com/v1_1/dmgyflpz8/upload", {
            method: "POST",
            body: formData,
        });

        const data = await res.json();
        if (data.secure_url) {
            return data.secure_url;
        } else {
            throw new Error('Cloudinary upload failed: No secure_url returned.');
        }
    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        throw error;
    }
}
