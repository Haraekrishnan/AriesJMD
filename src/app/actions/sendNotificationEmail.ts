'use server';

import * as nodemailer from 'nodemailer';

export async function sendNotificationEmail({ to, subject, htmlBody }: { to: string, subject: string, htmlBody: string }) {
  const { GMAIL_USER, GMAIL_APP_PASS } = process.env;

  if (!GMAIL_USER || !GMAIL_APP_PASS) {
    console.error('Missing email credentials for notification service in .env file.');
    return { success: false, error: 'Server configuration error for notifications.' };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASS,
      },
      logger: false, // Set to true for debugging if needed
    });

    await transporter.sendMail({
      from: `"Aries Marine Portal" <${GMAIL_USER}>`,
      to: to, // The recipient's email address
      subject: subject,
      html: htmlBody,
    });
    
    console.log(`Notification email sent successfully to ${to}.`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to send notification email to ${to}:`, error);
    return { success: false, error: (error as Error).message };
  }
}

const createEmailBody = (title: string, details: { [key: string]: string | number }, actionUrl?: string, actionText?: string) => {
    let detailsHtml = '';
    for (const [key, value] of Object.entries(details)) {
        detailsHtml += `<p><strong>${key}:</strong> ${value}</p>`;
    }

    const actionButtonHtml = actionUrl && actionText ? `
      <p style="margin-top: 25px;">
        <a href="${actionUrl}" style="font-size: 16px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 5px; background-color: #007bff; border-top: 12px solid #007bff; border-bottom: 12px solid #007bff; border-right: 18px solid #007bff; border-left: 18px solid #007bff; display: inline-block;">
            ${actionText}
        </a>
      </p>
    ` : '';
    
    return `
        <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
            <h2 style="color: #0056b3;">${title}</h2>
            ${detailsHtml}
            ${actionButtonHtml}
        </div>
    `;
};


// To be used by other server actions, must be async.
export async function createAndSendNotification(
  to: string,
  subject: string,
  title: string,
  details: { [key: string]: string | number },
  actionUrl?: string,
  actionText?: string
) {
  const htmlBody = createEmailBody(title, details, actionUrl, actionText);
  return sendNotificationEmail({ to, subject, htmlBody });
}