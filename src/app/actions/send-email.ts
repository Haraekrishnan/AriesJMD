'use server';
import nodemailer from 'nodemailer';

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const { GMAIL_USER, GMAIL_APP_PASS } = process.env;

  if (!GMAIL_USER || !GMAIL_APP_PASS) {
    console.error('Missing Gmail credentials in .env file.');
    throw new Error('Server configuration error for sending email.');
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
    console.log('Email sent successfully to:', to);
    return { success: true };
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    return { success: false, error: (error as Error).message };
  }
}
