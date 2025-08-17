'use server';

import * as nodemailer from 'nodemailer';

interface FeedbackData {
    subject: string;
    message: string;
    userName: string;
    userEmail: string;
}

export async function sendFeedbackEmail(feedbackData: FeedbackData) {
  const { GMAIL_USER, GMAIL_APP_PASS } = process.env;

  if (!GMAIL_USER || !GMAIL_APP_PASS) {
    console.error('Missing Gmail credentials in .env file.');
    return { success: false, error: 'Server configuration error.' };
  }
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASS,
    },
  });

  const { subject, message, userName, userEmail } = feedbackData;

  const emailSubject = `Aries Portal Feedback: ${subject}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
      <h2 style="color: #0056b3;">New Feedback/Complaint Received</h2>
      
      <p><strong>From:</strong> ${userName} (${userEmail})</p>
      <p><strong>Subject:</strong> ${subject}</p>
      
      <h3 style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">Message:</h3>
      <p style="padding: 10px; background-color: #f8f9fa; border-left: 4px solid #ccc; white-space: pre-wrap;">${message}</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Aries Portal Feedback" <${GMAIL_USER}>`,
      to: 'vijay.sai@ariesmar.com', // Admin email
      subject: emailSubject,
      html: htmlBody,
    });
    console.log('Feedback email sent successfully.');
    return { success: true };
  } catch (error) {
    console.error('Failed to send feedback email:', error);
    return { success: false, error: (error as Error).message };
  }
}
