
// 1. Create a new script project at script.google.com
// 2. Copy and paste this entire code into the Code.gs file.
// 3. Replace "YOUR_GOOGLE_DRIVE_FOLDER_ID" with the actual ID of the folder you want to upload files to.
// 4. Replace "YOUR_MANAGER_EMAIL" with the email address that should receive PPE requests.
// 5. Go to Deploy > New deployment.
// 6. Click the gear icon, select "Web app".
// 7. For "Execute as", select "Me".
// 8. For "Who has access", select "Anyone". This is required.
// 9. Click "Deploy".
// 10. IMPORTANT: Authorize the permissions when prompted.
// 11. Copy the Web app URL provided and paste it into the .env file as GOOGLE_SCRIPT_URL.

const FOLDER_ID = "1XUxDNnbGkahtFd9XZRHMlKjaKg3ce5DL"; // Your folder ID for attachments
const MANAGER_EMAIL = "harikrishnan.bornagain@gmail.com"; // The manager who approves PPE requests

function doPost(e) {
  try {
    const { action } = e.parameter;

    if (action === 'sendEmail') {
      return handleSendEmail(e);
    } else {
      return handleFileUpload(e);
    }

  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: err.message,
    });
  }
}

function handleFileUpload(e) {
  const { file: base64Data, filename: fileName, mimeType } = e.parameter;

  if (!base64Data || !fileName || !mimeType) {
    throw new Error("Missing file data, filename, or mimeType for file upload.");
  }
  
  const decoded = Utilities.base64Decode(base64Data, Utilities.Charset.UTF_8);
  const fileBlob = Utilities.newBlob(decoded, mimeType, fileName);
  
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const newFile = folder.createFile(fileBlob);
  
  newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return createJsonResponse({
    status: "success",
    fileId: newFile.getId(),
    url: `https://drive.google.com/uc?export=view&id=${newFile.getId()}`,
    name: newFile.getName(),
  });
}

function handleSendEmail(e) {
    const { recipient, subject, body } = e.parameter;
    
    if (!recipient || !subject || !body) {
        throw new Error("Missing recipient, subject, or body for sending email.");
    }
    
    MailApp.sendEmail({
        to: recipient,
        subject: subject,
        htmlBody: body,
        name: "Aries PPE Request"
    });
    
    return createJsonResponse({
        status: "success",
        message: "Email sent successfully to " + recipient,
    });
}


function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}
