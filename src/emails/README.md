
# Email Templates

This directory contains email templates built with React Email.

## Setup for Sending Emails with Resend

To enable email sending for development and production, you need to sign up for a free Resend account and get an API key.

1.  **Sign Up**: Go to [https://resend.com/signup](https://resend.com/signup) and create an account.
2.  **Verify Domain**: You must verify a domain you own to send emails. Follow their [domain verification guide](https://resend.com/docs/dashboard/domains/add-domain).
3.  **Create API Key**: Go to the [API Keys section](https://resend.com/dashboard/api-keys) in your Resend dashboard and create a new API key.
4.  **Set Environment Variable**: Copy the created API key.
    - **For Local Development**: Paste the key into the `.env` file in the project root:
      ```
      RESEND_API_KEY=re_YourApiKeyHere
      ```
    - **For Production**: Set this environment variable in your hosting provider's settings.
      
Emails are sent from `onboarding@resend.dev` by default during development but will be sent from your verified domain in production.
