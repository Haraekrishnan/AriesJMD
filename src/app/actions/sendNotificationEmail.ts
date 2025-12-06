
'use server';

import * as nodemailer from 'nodemailer';
import type { NotificationSettings, NotificationEventKey, User, Role } from '@/lib/types';

interface SendEmailParams {
  to: string[];
  subject: string;
  htmlBody: string;
  fromAddress?: string;
  notificationSettings: NotificationSettings;
  event: NotificationEventKey;
  involvedUser?: User | null; // The user directly involved (e.g., requester, assignee)
  creatorUser?: User | null; // The creator of the item (e.g., task creator)
}

export async function sendNotificationEmail({ to, subject, htmlBody, fromAddress, notificationSettings, event, involvedUser, creatorUser }: SendEmailParams) {
  const { GMAIL_USER, GMAIL_APP_PASS } = process.env;

  if (!GMAIL_USER || !GMAIL_APP_PASS) {
    console.error('Missing email credentials for notification service in .env file.');
    return { success: false, error: 'Server configuration error for notifications.' };
  }
  
  const eventSettings = notificationSettings.events?.[event];

  // Combine original recipients with additional ones from settings
  const globalAdditionalEmails = notificationSettings.additionalRecipients
    ? notificationSettings.additionalRecipients.split(',').map(e => e.trim()).filter(e => e)
    : [];

  const eventSpecificAdditionalEmails = eventSettings?.additionalRecipients
    ? eventSettings.additionalRecipients.split(',').map(e => e.trim()).filter(e => e)
    : [];
  
  const allRecipients = new Set([...to, ...globalAdditionalEmails, ...eventSpecificAdditionalEmails]);
  
  // Add involved user if the setting is checked for this event
  if (eventSettings?.notifyInvolvedUser && involvedUser?.email) {
    allRecipients.add(involvedUser.email);
  }

  // Add creator user if the setting is checked for this event
  if (eventSettings?.notifyCreator && creatorUser?.email) {
    allRecipients.add(creatorUser.email);
  }

  const finalRecipients = Array.from(allRecipients);

  if (finalRecipients.length === 0) {
    console.log(`No recipients for event: ${event}. Email not sent.`);
    return { success: true, message: 'No recipients configured for this event.' };
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
      from: fromAddress || `"Aries Marine" <${GMAIL_USER}>`,
      to: finalRecipients.join(', '),
      subject: subject,
      html: htmlBody,
    });
    console.log(`Email sent for event: ${event} to: ${finalRecipients.join(', ')}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to send email for event: ${event}`, error);
    return { success: false, error: (error as Error).message };
  }
}
