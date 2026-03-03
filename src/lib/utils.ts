import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeGoogleDriveLink(url: string): { downloadUrl: string | null; originalUrl: string } {
    if (!url) {
      return { downloadUrl: null, originalUrl: url };
    }
  
    // Regular expression to find the file ID in various Google Drive URL formats
    const fileIdRegex = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]{28,})/;
    const match = url.match(fileIdRegex);
  
    if (match && match[1]) {
      const fileId = match[1];
      // Construct the direct download link format
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      return { downloadUrl, originalUrl: url };
    }
  
    // If it doesn't match, it might be a direct link already or an invalid link
    return { downloadUrl: url, originalUrl: url };
}