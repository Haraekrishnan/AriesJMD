/**
 * Converts a File object to a Base64 string (Data URI) using FileReader.
 * 
 * @param file - The File object to convert.
 * @returns A promise that resolves with the Base64 string.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as string);
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsDataURL(file);
  });
}
