'use server';

import type { ManpowerProfile, PpeRequest, User } from '@/lib/types';
import { format, parseISO } from 'date-fns';

const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

async function uploadFile(base64Data: string, filename: string, mimeType: string) {
  if (!SCRIPT_URL) {
    console.error('Google Script URL is not configured.');
    return { success: false, data: null };
  }

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        file: base64Data,
        filename: filename,
        mimeType: mimeType
      }),
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload file: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    if (result.status === 'success') {
      return { success: true, data: result };
    } else {
      throw new Error(result.message || 'Unknown error during file upload.');
    }
  } catch (error) {
    console.error('Error uploading file to Google Script:', error);
    return { success: false, data: null };
  }
}

export async function sendPpeRequestEmail(
  ppeData: PpeRequest,
  requester: User,
  employee: ManpowerProfile,
  stockInfo: string
) {
  if (!SCRIPT_URL) {
    console.error('Google Script URL is not configured.');
    return { success: false, error: 'Server configuration error for sending email.' };
  }

  let uploadedFileUrl = ppeData.attachmentUrl;
  let uploadedFileName = 'Attachment';

  // Handle file upload if there's a new attachment
  if (ppeData.attachmentUrl && ppeData.attachmentUrl.startsWith('data:')) {
    const [header, base64] = ppeData.attachmentUrl.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const fileExtension = mimeType.split('/')[1] || 'bin';
    const fileName = `ppe-attachment-${Date.now()}.${fileExtension}`;
    
    const uploadResult = await uploadFile(base64, fileName, mimeType);
    if (uploadResult.success && uploadResult.data) {
        uploadedFileUrl = uploadResult.data.url;
        uploadedFileName = uploadResult.data.name;
    } else {
        console.error("Attachment upload failed, proceeding to send email without it.");
        uploadedFileUrl = undefined; // Clear the URL if upload failed
    }
  }

  // Prepare email content
  const lastIssue = (employee.ppeHistory || [])
      .filter(h => h.ppeType === ppeData.ppeType)
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())[0];

  const lastIssueDate = lastIssue ? format(parseISO(lastIssue.issueDate), 'dd-MM-yyyy') : 'N/A';
  const joiningDate = employee.joiningDate ? format(parseISO(employee.joiningDate), 'dd-MM-yyyy') : 'N/A';
  const rejoiningDate = profileHasRejoined(employee) ? format(parseISO(getLatestRejoinDate(employee) as string), 'dd-MM-yyyy') : 'N/A';

  const emailPayload = {
      action: 'sendEmail',
      recipient: 'harikrishnan.bornagain@gmail.com',
      subject: `PPE Request from ${requester.name} for ${employee.name} — ${ppeData.ppeType}`,
      body: `
        <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
          <h2 style="color: #0056b3;">New PPE Request for Approval</h2>
          <p><strong>Employee:</strong> ${employee.name}</p>
          <p><strong>Type:</strong> ${ppeData.ppeType} &middot; <strong>Size:</strong> ${ppeData.size} &middot; <strong>Qty:</strong> ${ppeData.quantity || 1}</p>
          <p><strong>Request Type:</strong> ${ppeData.requestType}</p>
          ${ppeData.newRequestJustification ? `<p><strong>Justification:</strong> ${ppeData.newRequestJustification}</p>` : ''}
          <p><strong>Stock Info:</strong> ${stockInfo}</p>
          <p><strong>Joining Date:</strong> ${joiningDate}</p>
          <p><strong>Last Re-Joining Date:</strong> ${rejoiningDate}</p>
          <p><strong>Last Issue Date:</strong> ${lastIssueDate}</p>
          ${ppeData.eligibility ? `<p><strong>Eligibility:</strong> ${ppeData.eligibility.eligible ? 'Yes' : 'No'} - ${ppeData.eligibility.reason}</p>` : ''}
          <p><strong>Remarks:</strong> ${ppeData.remarks || 'None'}</p>
          ${uploadedFileUrl ? `<p><strong>Attachment:</strong> <a href="${uploadedFileUrl}">${uploadedFileName}</a></p>` : ''}
          <p><strong>Requested By:</strong> ${requester.name}</p>
        </div>
      `,
  };

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      redirect: 'follow',
      body: new URLSearchParams(emailPayload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send email via Google Script: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    if (result.status === 'success') {
      console.log('Email sent successfully via Google Script.');
      return { success: true };
    } else {
      throw new Error(result.message || 'Unknown error sending email via Google Script.');
    }
  } catch (error) {
    console.error(error);
    return { success: false, error: (error as Error).message };
  }
}

function profileHasRejoined(profile: ManpowerProfile): boolean {
  if (!profile.leaveHistory || profile.leaveHistory.length === 0) {
      return false;
  }
  return profile.leaveHistory.some(record => record.rejoinedDate);
}

function getLatestRejoinDate(profile: ManpowerProfile): string | null {
    if (!profile.leaveHistory || profile.leaveHistory.length === 0) {
        return null;
    }
    const rejoinDates = profile.leaveHistory
        .map(record => record.rejoinedDate)
        .filter((date): date is string => !!date)
        .map(dateStr => parseISO(dateStr));
    if (rejoinDates.length === 0) {
        return null;
    }
    rejoinDates.sort((a, b) => b.getTime() - a.getTime());
    return rejoinDates[0].toISOString();
}
