
'use server';

import nodemailer from 'nodemailer';
import type { ManpowerProfile, PpeRequest, User } from '@/lib/types';
import 'dotenv/config';

export async function sendPpeRequestEmail(
  ppeData: PpeRequest,
  requester: User,
  employee: ManpowerProfile
) {

  const lastIssue = (employee.ppeHistory || [])
      .filter(h => h.ppeType === ppeData.ppeType)
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())[0];
  const lastIssueDate = lastIssue ? new Date(lastIssue.issueDate).toLocaleDateString() : 'N/A';
  const joiningDate = employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : 'N/A';
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: 'harikrishnan.bornagain@gmail.com',
    subject: `PPE Request from ${requester.name} for ${employee.name} — ${ppeData.ppeType}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>New PPE Request for Approval</h2>
        <p>A new Personal Protective Equipment (PPE) request has been submitted and requires your approval.</p>
        
        <h3>Request Details</h3>
        <ul>
          <li><strong>Employee:</strong> ${employee.name}</li>
          <li><strong>PPE Type:</strong> ${ppeData.ppeType}</li>
          <li><strong>Size:</strong> ${ppeData.size}</li>
          ${ppeData.quantity ? `<li><strong>Quantity:</strong> ${ppeData.quantity}</li>` : ''}
          <li><strong>Request Type:</strong> ${ppeData.requestType}</li>
          <li><strong>Requested By:</strong> ${requester.name}</li>
        </ul>

        ${ppeData.newRequestJustification ? `
        <h3>Justification</h3>
        <p style="background-color: #fffbe6; border: 1px solid #fde047; padding: 10px; border-radius: 5px;">
          ${ppeData.newRequestJustification}
        </p>
        ` : ''}

        ${ppeData.eligibility ? `
        <div style="background-color: ${ppeData.eligibility.eligible ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${ppeData.eligibility.eligible ? '#4ade80' : '#f87171'}; padding: 10px; border-radius: 5px;">
          <h4 style="margin: 0 0 5px 0; color: ${ppeData.eligibility.eligible ? '#166534' : '#991b1b'};">Eligibility: ${ppeData.eligibility.eligible ? 'Eligible' : 'Not Eligible'}</h4>
          <p style="margin: 0; color: ${ppeData.eligibility.eligible ? '#15803d' : '#b91c1c'};">${ppeData.eligibility.reason}</p>
        </div>
        ` : ''}

        <h3>Additional Info</h3>
        <ul>
            <li><strong>Joining Date:</strong> ${joiningDate}</li>
            <li><strong>Last Issue Date (${ppeData.ppeType}):</strong> ${lastIssueDate}</li>
        </ul>

        <p><strong>Remarks:</strong> ${ppeData.remarks || 'None'}</p>

        ${ppeData.attachmentUrl ? `
          <p><strong>Attachment:</strong> <a href="${ppeData.attachmentUrl}">View Attached Image</a></p>
        ` : ''}
        
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/my-requests" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 5px;">Review Request</a>
      </div>
    `,
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
