'use server';

import 'dotenv/config';
import nodemailer from 'nodemailer';
import type { PpeRequest, ManpowerProfile, User } from '@/lib/types';

export async function sendPpeRequestEmail(
    request: PpeRequest,
    requester: User,
    manpower: ManpowerProfile
) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.error('Email credentials are not set in environment variables.');
        return { success: false, error: 'Email service is not configured.' };
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });

    const mailOptions = {
        from: `"Aries Marine" <${process.env.GMAIL_USER}>`,
        to: 'harikrishnan.bornagain@gmail.com',
        subject: `New PPE Request for ${manpower.name}`,
        html: `
            <h3>New PPE Request Submitted</h3>
            <p><strong>Requester:</strong> ${requester.name}</p>
            <p><strong>Employee:</strong> ${manpower.name}</p>
            <p><strong>PPE Type:</strong> ${request.ppeType}</p>
            <p><strong>Size:</strong> ${request.size}</p>
            <p><strong>Quantity:</strong> ${request.quantity || 1}</p>
            <p><strong>Request Type:</strong> ${request.requestType}</p>
            ${request.remarks ? `<p><strong>Remarks:</strong> ${request.remarks}</p>` : ''}
            ${request.attachmentUrl ? `<p><strong>Attachment:</strong> <a href="${request.attachmentUrl}">View Attachment</a></p>`: ''}
            <p>Please log in to the portal to review and approve this request.</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('PPE Request email sent successfully.');
        return { success: true };
    } catch (error) {
        console.error('Error sending PPE request email:', error);
        return { success: false, error: 'Failed to send email.' };
    }
}
