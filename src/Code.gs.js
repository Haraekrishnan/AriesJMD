// 1. Create a new script project at script.google.com
// 2. Copy and paste this entire code into the Code.gs file.
// 3. Replace "YOUR_GOOGLE_DRIVE_FOLDER_ID" with the actual ID of the folder you want to upload files to.
//    (You can get this from the folder's URL in Google Drive).
// 4. Go to Deploy > New deployment.
// 5. Click the gear icon, select "Web app".
// 6. For "Who has access", select "Anyone". This is important for receiving uploads.
// 7. Click "Deploy".
// 8. IMPORTANT: Authorize the permissions when prompted.
// 9. Copy the Web app URL provided and paste it into the placeholder in your application code.

const FOLDER_ID = "1XUxDNnbGkahtFd9XZRHMlKjaKg3ce5DL"; // Your actual folder ID

// This function handles CORS preflight requests
function doOptions(e) {
  return ContentService.createTextOutput()
    .addHeader("Access-Control-Allow-Origin", "*")
    .addHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    .addHeader("Access-Control-Allow-Headers", "Content-Type");
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const fileDataUri = postData.dataUri;
    const fileName = postData.filename;

    if (!fileDataUri || !fileName) {
      throw new Error("File data URI or filename parameter is missing.");
    }
    
    // Create a blob directly from the data URI
    const fileBlob = Utilities.newBlob(fileDataUri, null, fileName);
    
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const newFile = folder.createFile(fileBlob);
    
    // Set the file to be publicly accessible
    newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Get the URL for direct access/viewing
    const fileUrl = `https://drive.google.com/uc?export=view&id=${newFile.getId()}`;
    
    const response = {
      status: "success",
      fileId: newFile.getId(),
      url: fileUrl,
      name: newFile.getName()
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON)
      .addHeader("Access-Control-Allow-Origin", "*");
      
  } catch (error) {
    const errorResponse = {
      status: "error",
      message: error.message,
      stack: error.stack
    };
    
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON)
      .addHeader("Access-Control-Allow-Origin", "*");
  }
}
