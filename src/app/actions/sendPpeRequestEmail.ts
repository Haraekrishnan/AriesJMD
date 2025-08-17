
'use server';

import type { ManpowerProfile, PpeRequest, User } from '@/lib/types';
import { transporter } from '@/lib/nodemailer';

export async function sendPpeRequestEmail(
  ppeData: PpeRequest,
  requester: User,
  employee: ManpowerProfile
) {
  const { GMAIL_USER } = process.env;
  if (!GMAIL_USER) {
    console.error('Missing Gmail user in .env file.');
    return { success: false, error: 'Server configuration error.' };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const approvalLink = `${appUrl}/my-requests`;

  const {
    ppeType,
    size,
    quantity,
    requestType,
    remarks,
    attachmentUrl,
    eligibility,
    newRequestJustification,
  } = ppeData;
  
  const lastIssue = (employee.ppeHistory || [])
      .filter(h => h.ppeType === ppeType)
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())[0];
  const lastIssueDate = lastIssue ? new Date(lastIssue.issueDate).toLocaleDateString() : 'N/A';
  const joiningDate = employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : 'N/A';

  const eligibilityHtml = eligibility
    ? `
    <p style="margin-top: 20px; padding: 10px; border-left: 4px solid ${
      eligibility.eligible ? '#28a745' : '#dc3545'
    }; background-color: #f8f9fa;">
      <strong style="color: ${
        eligibility.eligible ? '#28a745' : '#dc3545'
      };">Eligibility Status: ${
      eligibility.eligible ? 'Eligible' : 'Not Eligible'
    }</strong><br>
      ${eligibility.reason}
    </p>
  `
    : '';

  const justificationHtml = newRequestJustification
    ? `
    <p style="margin-top: 20px; padding: 10px; border-left: 4px solid #ffc107; background-color: #fff3cd;">
      <strong style="color: #856404;">Justification for Request:</strong><br>
      ${newRequestJustification}
    </p>
  `
    : '';

  const subject = `PPE Request from ${requester.name} for ${employee.name} — ${ppeType}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
      <h2 style="color: #0056b3;">New PPE Request for Approval</h2>
      
      <p><strong>Employee:</strong> ${employee.name}</p>
      <p><strong>Type:</strong> ${ppeType} &middot; <strong>Size:</strong> ${size} &middot; <strong>Qty:</strong> ${quantity || 1}</p>
      <p><strong>Request Type:</strong> ${requestType}</p>
      
       ${justificationHtml}

      <p style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
        <strong>Joining Date:</strong> ${joiningDate}<br>
        <strong>Last Issue Date for this item:</strong> ${lastIssueDate}<br>
      </p>

      ${eligibilityHtml}

      <p><strong>Requester Remarks:</strong> ${remarks || 'None'}</p>
      
      ${
        attachmentUrl
          ? `<p><strong>Attachment:</strong> <a href="${attachmentUrl}" style="color: #0056b3; text-decoration: none;">View Attached Image</a></p>`
          : ''
      }
      
      <p><strong>Requested By:</strong> ${requester.name}</p>

      <p style="margin-top: 25px;">
        <a href="${approvalLink}" style="font-size: 16px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 5px; background-color: #007bff; border-top: 12px solid #007bff; border-bottom: 12px solid #007bff; border-right: 18px solid #007bff; border-left: 18px solid #007bff; display: inline-block;">
            Review Request
        </a>
      </p>
    </div>
  `;

  const mailOptions = {
    from: `"Aries PPE Request" <${GMAIL_USER}>`,
    to: 'ariesmarineandeng@gmail.com',
    subject: subject,
    html: htmlBody,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('PPE request notification sent successfully.');
    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: (error as Error).message };
  }
}
