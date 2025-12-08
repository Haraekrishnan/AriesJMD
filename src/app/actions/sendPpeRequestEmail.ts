'use server';

import { Resend } from 'resend';

export async function sendPpeRequestEmail(ppeData: Record<string, any>) {
  const { RESEND_API_KEY, RESEND_FROM_EMAIL, NEXT_PUBLIC_APP_URL } = process.env;

  if (!RESEND_API_KEY) {
    console.error("Resend API key missing. PPE email cannot be sent.");
    return { success: false, error: "Resend API key missing." };
  }

  if (!RESEND_FROM_EMAIL) {
    console.error("RESEND_FROM_EMAIL missing. Add a verified domain sender.");
    return { success: false, error: "Missing RESEND_FROM_EMAIL." };
  }

  const resend = new Resend(RESEND_API_KEY);

  const appUrl = NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  const approvalLink = `${appUrl}/my-requests`;

  const {
    recipients,
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

  if (!recipients || recipients.length === 0) {
    console.log("No recipients for PPE request email. Email not sent.");
    return { success: true, message: 'No recipients configured.' };
  }

  const eligibilityHtml = eligibility ? `
    <p style="margin-top: 20px; padding: 10px; border-left: 4px solid ${eligibility.eligible ? '#28a745' : '#dc3545'}; background-color: #f8f9fa;">
      <strong style="color: ${eligibility.eligible ? '#28a745' : '#dc3545'};">Eligibility Status: ${eligibility.eligible ? 'Eligible' : 'Not Eligible'}</strong><br>
      ${eligibility.reason}
    </p>` : '';

  const justificationHtml = newRequestJustification ? `
    <p style="margin-top: 20px; padding: 10px; border-left: 4px solid #ffc107; background-color: #fff3cd;">
      <strong style="color: #856404;">Justification for 'New' Request:</strong><br>
      ${newRequestJustification}
    </p>` : '';

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
        <strong>Current Stock:</strong> <strong style="color: #d9534f;">${stockInfo || 'N/A'}</strong>
      </p>

      ${eligibilityHtml}

      <p><strong>Remarks:</strong> ${remarks || 'None'}</p>

      ${
        attachmentUrl 
        ? `<p><strong>Attachment:</strong> <a href="${attachmentUrl}" style="color:#0056b3;">View Attachment</a></p>` 
        : ''
      }

      <p><strong>Requested By:</strong> ${requesterName}</p>

      <p style="margin-top: 25px;">
        <a href="${approvalLink}" style="font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 5px; background-color: #007bff; padding: 12px 18px; display: inline-block;">
          Review Request
        </a>
      </p>
    </div>
  `;

  try {
    const sendResult = await resend.emails.send({
      from: `Aries PPE Request <${RESEND_FROM_EMAIL}>`,
      to: recipients,
      subject,
      html: htmlBody,
    });

    console.log("PPE request email sent successfully via RESEND:", sendResult);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to send PPE email via RESEND:", error);
    return { success: false, error: error?.message || "Unknown error" };
  }
}

    