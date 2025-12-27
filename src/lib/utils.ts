import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeGoogleDriveLink(url: string): { fileId: string | null; downloadUrl: string | null; } {
  if (!url || typeof url !== 'string') {
    return { fileId: null, downloadUrl: null };
  }
  
  let fileId = null;
  
  // Regex to find file ID from various Google Drive URL formats
  const regex = /drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/;
  const match = url.match(regex);
  
  if (match && match[1]) {
    fileId = match[1];
  } else {
    return { fileId: null, downloadUrl: null };
  }
  
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  
  return { fileId, downloadUrl };
}
