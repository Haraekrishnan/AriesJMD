

// 1. Create a new script project at script.google.com
// 2. Copy and paste this entire code into the Code.gs file.
// 3. Go to Deploy > New deployment.
// 4. Click the gear icon, select "Web app".
// 5. For "Execute as", select "Me".
// 6. For "Who has access", select "Anyone". This is required.
// 7. Click "Deploy".
// 8. IMPORTANT: Authorize the permissions when prompted.
// 9. Copy the Web app URL provided and paste it into the placeholder in your application code.

function doPost(e) {
  try {
    const params = e.parameter || {};
    const requesterName = params.requesterName || 'Unknown';
    const ppeType = params.ppeType || '';
    const size = params.size || '';
    const quantity = params.quantity || '';
    const requestType = params.requestType || '';
    const remarks = params.remarks || '';
    const attachmentUrl = params.attachmentUrl || '';
    const approvalLink = params.approvalLink || 'https://your-app-url.com'; // Fallback URL

    const subject = `PPE Request from ${requesterName} — ${ppeType}`;
    let htmlBody = `
      <p><strong>PPE Request</strong></p>
      <p><strong>Requester:</strong> ${requesterName}</p>
      <p><strong>Type:</strong> ${ppeType} · <strong>Size:</strong> ${size} · <strong>Qty:</strong> ${quantity}</p>
      <p><strong>Request Type:</strong> ${requestType}</p>
      <p><strong>Remarks:</strong> ${remarks}</p>
    `;

    if (approvalLink) {
        htmlBody += `<p>
            <a href="${approvalLink}" style="font-size: 16px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 5px; background-color: #1a73e8; border-top: 12px solid #1a73e8; border-bottom: 12px solid #1a73e8; border-right: 18px solid #1a73e8; border-left: 18px solid #1a73e8; display: inline-block;">
                Approve Request
            </a>
        </p>`;
    }

    const emailOptions = {
      to: 'ariesmarineandeng@gmail.com',
      subject: subject,
      htmlBody: htmlBody,
      name: 'Aries PPE Request'
    };
    
    if (attachmentUrl) {
      try {
        const imageBlob = UrlFetchApp.fetch(attachmentUrl).getBlob();
        emailOptions.attachments = [imageBlob];
      } catch (err) {
        // Could not fetch attachment, send email without it
        console.error("Could not fetch attachment: " + err.message);
      }
    }

    MailApp.sendEmail(emailOptions);

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
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

