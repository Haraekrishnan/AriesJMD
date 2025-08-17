
import nodemailer from 'nodemailer';
import 'dotenv/config';

const { GMAIL_USER, GMAIL_APP_PASS } = process.env;

if (!GMAIL_USER || !GMAIL_APP_PASS) {
  console.error("Missing Gmail credentials in environment variables. Email functionality will be disabled.");
}

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASS,
  },
});
