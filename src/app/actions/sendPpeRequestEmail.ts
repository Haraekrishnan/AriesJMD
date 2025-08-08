
'use server';

import * as nodemailer from 'nodemailer';

export async function sendPpeRequestEmail(ppeData: Record<string, any>) {
  const { GMAIL_USER, GMAIL_APP_PASS } = process.env;

  if (!GMAIL_USER || !GMAIL_APP_PASS) {
    console.error('Missing Gmail credentials in .env file.');
    return { success: false, error: 'Server configuration error.' };
  }
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  const approvalLink = `${appUrl}/my-requests`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASS,
    },
  });

  const {
    requesterName,
    employeeName,
    ppeType,
    size,
    quantity,
    requestType,
    remarks,
    attachmentUrl,
    joiningDate,
    rejoiningDate,
    lastIssueDate,
  } = ppeData;

  const subject = `PPE Request from ${requesterName} for ${employeeName} — ${ppeType}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
      <h2 style="color: #0056b3;">New PPE Request for Approval</h2>
      
      <p><strong>Employee:</strong> ${employeeName}</p>
      <p><strong>Type:</strong> ${ppeType} &middot; <strong>Size:</strong> ${size} &middot; <strong>Qty:</strong> ${quantity}</p>
      <p><strong>Request Type:</strong> ${requestType}</p>
      <p><strong>Remarks:</strong> ${remarks || 'None'}</p>
      <p><strong>Joining Date:</strong> ${joiningDate || 'N/A'}</p>
      <p><strong>Re-Joining Date:</strong> ${rejoiningDate || 'N/A'}</p>
      <p><strong>Last Issue Date:</strong> ${lastIssueDate || 'N/A'}</p>
      
      ${attachmentUrl ? `<p><strong>Attachment:</strong> <a href="${attachmentUrl}" style="color: #0056b3; text-decoration: none;">View Attached Image</a></p>` : ''}
      
      <p><strong>Requested By:</strong> ${requesterName}</p>

      <p style="margin-top: 25px;">
        <a href="${approvalLink}" style="font-size: 16px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 5px; background-color: #007bff; border-top: 12px solid #007bff; border-bottom: 12px solid #007bff; border-right: 18px solid #007bff; border-left: 18px solid #007bff; display: inline-block;">
            Review Request
        </a>
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Aries PPE Request" <${GMAIL_USER}>`,
      to: 'ariesmarineandeng@gmail.com',
      subject: subject,
      html: htmlBody,
    });
    console.log('PPE request notification sent successfully.');
    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: (error as Error).message };
  }
}
