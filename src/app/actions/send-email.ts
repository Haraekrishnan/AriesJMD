'use server';

import * as nodemailer from 'nodemailer';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: MailOptions) {
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

  try {
    await transporter.sendMail({
      from: `"Aries PPE Request" <${GMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
    });
    console.log('✅ Email sent successfully to:', to);
    return { success: true };
  } catch (error) {
    console.error('❌ Email failed:', error);
    return { success: false, error: (error as Error).message };
  }
}
