

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

const FOLDER_ID = "1XUxDNnbGkahtFd9XZRHMlKjaKg3ce5DL"; // Your folder ID

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const { file: base64Data, filename: fileName, mimeType } = data;

    if (!base64Data || !fileName || !mimeType) {
      throw new Error("Missing file data, filename, or mimeType.");
    }

    // Decode Base64
    const decoded = Utilities.base64Decode(base64Data);
    const fileBlob = Utilities.newBlob(decoded, mimeType, fileName);

    // Save to Drive
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const newFile = folder.createFile(fileBlob);

    // Make it viewable by link
    newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const response = {
      status: "success",
      fileId: newFile.getId(),
      url: `https://drive.google.com/uc?export=view&id=${newFile.getId()}`,
      name: newFile.getName(),
    };

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*")
      .setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
      .setHeader("Access-Control-Allow-Headers", "Content-Type");
  } catch (err) {
    const errorResponse = {
      status: "error",
      message: err.message,
    };

    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*")
      .setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
      .setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("")
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
