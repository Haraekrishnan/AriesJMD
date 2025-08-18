
'use server';

import { Resend } from 'resend';
import PpeRequestEmail from '@/emails/ppe-request-email';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendPpeRequestEmail(emailData: any) {
  if (!resend) {
    console.error('Resend is not configured. Missing RESEND_API_KEY.');
    return { success: false, error: 'Email service not configured.' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Aries PPE Request <onboarding@resend.dev>',
      to: 'harikrishnan.bornagain@gmail.com',
      subject: `PPE Request from ${emailData.requesterName} for ${emailData.employeeName}`,
      react: PpeRequestEmail(emailData),
    });

    if (error) {
      console.error('Resend API Error:', error);
      return { success: false, error: error.message };
    }

    console.log('PPE request notification sent successfully via Resend:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: (error as Error).message };
  }
}
