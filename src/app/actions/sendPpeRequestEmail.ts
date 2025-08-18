
'use server';

import { Resend } from 'resend';
import PpeRequestEmail from '@/emails/ppe-request-email';
import type { ManpowerProfile, PpeRequest, User } from '@/lib/types';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPpeRequestEmail(
  ppeData: PpeRequest,
  requester: User,
  employee: ManpowerProfile
) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Aries PPE Request <onboarding@resend.dev>',
      to: ['harikrishnan.bornagain@gmail.com'],
      subject: `PPE Request from ${requester.name} for ${employee.name} — ${ppeData.ppeType}`,
      react: PpeRequestEmail({ ppeData, requester, employee }),
    });

    if (error) {
      console.error('Failed to send email:', error);
      return { success: false, error: error.message };
    }

    console.log('PPE request notification sent successfully:', data);
    return { success: true };
  } catch (error) {
    console.error('An unexpected error occurred:', error);
    return { success: false, error: (error as Error).message };
  }
}
