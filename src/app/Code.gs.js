// This file is a duplicate and can be deleted. Keeping it for reference.
const FOLDER_ID = "1XUxDNnbGkahtFd9XZRHMlKjaKg3ce5DL"; // Your folder ID

function doPost(e) {
  try {
    const { file: base64Data, filename: fileName, mimeType } = e.parameter;

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
