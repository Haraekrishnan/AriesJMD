

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
    const { ppeData } = JSON.parse(e.postData.contents);
    
    // --- Request Details ---
    const requestId = ppeData.requestId || 'N/A';
    const requestedBy = ppeData.requestedBy || 'N/A';
    const requestType = ppeData.requestType || 'N/A';
    const requestedFor = ppeData.requestedFor || 'N/A';
    const plant = ppeData.plant || 'N/A';
    const firstJoiningDate = ppeData.firstJoiningDate || 'N/A';
    const rejoiningDate = ppeData.rejoiningDate || 'N/A';
    const size = ppeData.size || 'N/A';
    const quantity = ppeData.quantity || 'N/A';
    const reasonForRequest = ppeData.reasonForRequest || 'N/A';
    const lastIssuingDate = ppeData.lastIssuingDate || 'N/A';
    const returnOfLastIssuedItem = ppeData.returnOfLastIssuedItem || 'N/A';
    const eligibility = ppeData.eligibility || 'N/A';

    // --- Stock Details ---
    const stockDetailsString = ppeData.stockDetails || '{}';
    const stockDetails = JSON.parse(stockDetailsString);

    // --- Attachment & Approval Link ---
    const attachmentUrl = ppeData.attachmentUrl || '';
    const approvalLink = ppeData.approvalLink || 'https://your-app-url.com'; // Fallback URL

    const subject = `PPE Approval Request: ${requestedFor} - ${new Date().toLocaleDateString("en-IN")}`;
    
    // --- Build HTML Body ---
    let requestDetailsHtml = `
      <table border="1" style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; font-weight: bold;">Request ID</td><td style="padding: 8px;">${requestId}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Requested By</td><td style="padding: 8px;">${requestedBy}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Requested Type</td><td style="padding: 8px;">${requestType}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Requested For</td><td style="padding: 8px;">${requestedFor}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Plant</td><td style="padding: 8px;">${plant}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">First Joining Date</td><td style="padding: 8px;">${firstJoiningDate}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Rejoining Date</td><td style="padding: 8px;">${rejoiningDate}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Size</td><td style="padding: 8px;">${size}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Quantity</td><td style="padding: 8px;">${quantity}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Reason for Request</td><td style="padding: 8px;">${reasonForRequest}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Last Issuing Date</td><td style="padding: 8px;">${lastIssuingDate}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Return of Last Issued Item</td><td style="padding: 8px;">${returnOfLastIssuedItem}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Eligibility</td><td style="padding: 8px;">${eligibility}</td></tr>
      </table>`;

    let stockDetailsHtml = `
      <table border="1" style="border-collapse: collapse; width: 50%; margin-top: 20px;">
        <thead style="background-color: #f2f2f2;">
          <tr><th style="padding: 8px;">Item</th><th style="padding: 8px;">Quantity</th></tr>
        </thead>
        <tbody>
          ${Object.entries(stockDetails).map(([key, value]) => `<tr><td style="padding: 8px;">${key}</td><td style="padding: 8px;">${value}</td></tr>`).join('')}
        </tbody>
      </table>`;

    const htmlBody = `
      <p>Dear Sir,</p>
      <p>An approval request has been raised with the following details:</p>
      ${requestDetailsHtml}
      <br/>
      <p><strong>Stock Inventory Details:</strong></p>
      ${stockDetailsHtml}
      <br/>
      <p>Please review and update the approval status using the following link:</p>
      <p><a href="${approvalLink}" style="font-size: 16px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 5px; background-color: #1a73e8; border-top: 12px solid #1a73e8; border-bottom: 12px solid #1a73e8; border-right: 18px solid #1a73e8; border-left: 18px solid #1a73e8; display: inline-block;">Approval Form</a></p>
    `;

    // --- Handle Attachment ---
    let emailOptions = {
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

    // --- Send Email ---
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
