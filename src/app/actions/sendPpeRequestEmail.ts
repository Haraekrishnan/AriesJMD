
'use server';

import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

export async function sendPpeRequestEmail(ppeData: Record<string, any>) {
  const { GMAIL_USER, GMAIL_APP_PASS, RESEND_API_KEY } = process.env;

  if (!GMAIL_USER || !GMAIL_APP_PASS || !RESEND_API_KEY) {
    console.error('Missing email credentials in .env file.');
    return { success: false, error: 'Server configuration error.' };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  const approvalLink = `${appUrl}/my-requests`;

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
    stockInfo,
    eligibility,
    newRequestJustification,
  } = ppeData;

  const eligibilityHtml = eligibility ? `
    <p style="margin-top: 20px; padding: 10px; border-left: 4px solid ${eligibility.eligible ? '#28a745' : '#dc3545'}; background-color: #f8f9fa;">
      <strong style="color: ${eligibility.eligible ? '#28a745' : '#dc3545'};">Eligibility Status: ${eligibility.eligible ? 'Eligible' : 'Not Eligible'}</strong><br>
      ${eligibility.reason}
    </p>
  ` : '';
  
  const justificationHtml = newRequestJustification ? `
    <p style="margin-top: 20px; padding: 10px; border-left: 4px solid #ffc107; background-color: #fff3cd;">
      <strong style="color: #856404;">Justification for 'New' Request:</strong><br>
      ${newRequestJustification}
    </p>
  ` : '';

  const subject = `PPE Request from ${requesterName} for ${employeeName} — ${ppeType}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
      <h2 style="color: #0056b3;">New PPE Request for Approval</h2>
      
      <p><strong>Employee:</strong> ${employeeName}</p>
      <p><strong>Type:</strong> ${ppeType} &middot; <strong>Size:</strong> ${size} &middot; <strong>Qty:</strong> ${quantity}</p>
      <p><strong>Request Type:</strong> ${requestType}</p>
      
       ${justificationHtml}

      <p style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
        <strong>Joining Date:</strong> ${joiningDate || 'N/A'}<br>
        <strong>Re-Joining Date:</strong> ${rejoiningDate || 'N/A'}<br>
        <strong>Last Issue Date:</strong> ${lastIssueDate || 'N/A'}<br>
        <strong>Current Stock:</strong> <span style="font-weight: bold; color: #d9534f;">${stockInfo || 'N/A'}</span>
      </p>

      ${eligibilityHtml}

      <p><strong>Remarks:</strong> ${remarks || 'None'}</p>
      
      ${attachmentUrl ? `<p><strong>Attachment:</strong> <a href="${attachmentUrl}" style="color: #0056b3; text-decoration: none;">View Attached Image</a></p>` : ''}
      
      <p><strong>Requested By:</strong> ${requesterName}</p>

      <p style="margin-top: 25px;">
        <a href="${approvalLink}" style="font-size: 16px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 5px; background-color: #007bff; border-top: 12px solid #007bff; border-bottom: 12px solid #007bff; border-right: 18px solid #007bff; border-left: 18px solid #007bff; display: inline-block;">
            Review Request
        </a>
      </p>
    </div>
  `;
  
  // Prioritize Resend for better deliverability
  const resend = new Resend(RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: `Aries PPE Request <aries-ppe@resend.dev>`,
      to: 'vijay.sai@ariesmar.com',
      subject: subject,
      html: htmlBody,
    });
    console.log('PPE request notification sent successfully via Resend.');
    return { success: true };
  } catch (resendError) {
    console.error('Failed to send email via Resend:', resendError);
    
    // Fallback to Nodemailer (Gmail) if Resend fails
    console.log('Attempting to send email via Gmail as a fallback...');
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: GMAIL_USER,
          pass: GMAIL_APP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"Aries PPE Request" <${GMAIL_USER}>`,
        to: 'vijay.sai@ariesmar.com',
        subject: subject,
        html: htmlBody,
      });
      console.log('PPE request notification sent successfully via Gmail fallback.');
      return { success: true };
    } catch (gmailError) {
      console.error('Failed to send email via Gmail as well:', gmailError);
      return { success: false, error: (gmailError as Error).message };
    }
  }
}
