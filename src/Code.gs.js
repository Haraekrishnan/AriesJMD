// 1. Create a new script project at script.google.com
// 2. Copy and paste this entire code into the Code.gs file.
// 3. Replace "YOUR_GOOGLE_DRIVE_FOLDER_ID" with the actual ID of the folder you want to upload files to.
// 4. Go to Deploy > New deployment.
// 5. Click the gear icon, select "Web app".
// 6. For "Execute as", select "Me".
// 7. For "Who has access", select "Anyone". This is required.
// 8. Click "Deploy".
// 9. IMPORTANT: Authorize the permissions when prompted.
// 10. Copy the Web app URL provided and paste it into the placeholder in your application code.

const FOLDER_ID = "1XUxDNnbGkahtFd9XZRHMlKjaKg3ce5DL"; // Replace with your actual folder ID

function doPost(e) {
  try {
    const base64Data = e.parameter.file;
    const fileName = e.parameter.filename;
    const mimeType = e.parameter.mimeType;

    if (!base64Data || !fileName || !mimeType) {
      throw new Error("File data, filename, or mimeType parameter is missing.");
    }
    
    // Decode the Base64 string into a blob
    const decoded = Utilities.base64Decode(base64Data);
    const fileBlob = Utilities.newBlob(decoded, mimeType, fileName);
    
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const newFile = folder.createFile(fileBlob);
    
    newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Create a direct view/download link
    const fileUrl = `https://drive.google.com/uc?export=view&id=${newFile.getId()}`;
    
    const response = {
      status: "success",
      fileId: newFile.getId(),
      url: fileUrl,
      name: newFile.getName()
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
      
  } catch (error) {
    const errorResponse = {
      status: "error",
      message: error.message,
      stack: error.stack
    };
    
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
  }
}

function doOptions(e) {
  return ContentService.createTextOutput()
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function doGet(e) {
  return ContentService.createTextOutput("GET not supported")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader("Access-Control-Allow-Origin", "*");
}
