import { Resend } from 'resend';

// Lazy initialization to avoid build-time errors
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
    if (!process.env.RESEND_API_KEY) {
        return null;
    }
    if (!resendClient) {
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return resendClient;
}

// Email sender configuration
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'advocacy@openpolitics.in';
const FROM_NAME = 'Open Politics Advocacy';

export interface SendAdvocacyEmailParams {
    to: string;
    recipientName?: string;
    subject: string;
    body: string;
    partyName: string;
    senderName: string;
}

export interface SendEmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Send a letter via Resend
 */
export async function sendAdvocacyEmail({
    to,
    recipientName,
    subject,
    body,
    partyName,
    senderName
}: SendAdvocacyEmailParams): Promise<SendEmailResult> {
    try {
        // Get lazily-initialized client
        const resend = getResendClient();
        if (!resend) {
            console.warn('RESEND_API_KEY not configured - email not sent');
            return {
                success: false,
                error: 'Email service not configured'
            };
        }

        // Format the email body with party context
        const htmlBody = formatEmailHtml({
            recipientName,
            body,
            partyName,
            senderName
        });

        const textBody = formatEmailText({
            recipientName,
            body,
            partyName,
            senderName
        });

        const { data, error } = await resend.emails.send({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to: [to],
            subject: subject,
            html: htmlBody,
            text: textBody,
            replyTo: FROM_EMAIL
        });

        if (error) {
            console.error('Resend error:', error);
            return {
                success: false,
                error: error.message
            };
        }

        return {
            success: true,
            messageId: data?.id
        };
    } catch (err) {
        console.error('Email send error:', err);
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
        };
    }
}

interface FormatEmailParams {
    recipientName?: string;
    body: string;
    partyName: string;
    senderName: string;
}

function formatEmailHtml({ recipientName, body, partyName, senderName }: FormatEmailParams): string {
    const greeting = recipientName ? `Dear ${recipientName},` : 'Dear Sir/Madam,';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Georgia, serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #1a365d; padding-bottom: 15px; margin-bottom: 25px; }
    .header h1 { color: #1a365d; font-size: 18px; margin: 0; }
    .content { margin-bottom: 30px; }
    .greeting { margin-bottom: 20px; }
    .body-text { white-space: pre-wrap; }
    .signature { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    .party-name { font-weight: bold; color: #1a365d; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📜 Formal Advocacy Communication</h1>
  </div>
  
  <div class="content">
    <p class="greeting">${greeting}</p>
    <div class="body-text">${escapeHtml(body)}</div>
  </div>
  
  <div class="signature">
    <p>Respectfully submitted,</p>
    <p><strong>${escapeHtml(senderName)}</strong><br>
    On behalf of <span class="party-name">${escapeHtml(partyName)}</span></p>
  </div>
  
  <div class="footer">
    <p>This is a formal letter sent through the Open Politics platform.<br>
    Open Politics enables grassroots political coordination for Indian citizens.</p>
  </div>
</body>
</html>
  `.trim();
}

function formatEmailText({ recipientName, body, partyName, senderName }: FormatEmailParams): string {
    const greeting = recipientName ? `Dear ${recipientName},` : 'Dear Sir/Madam,';

    return `
FORMAL ADVOCACY COMMUNICATION
============================

${greeting}

${body}

---

Respectfully submitted,
${senderName}
On behalf of: ${partyName}

---
This is a formal letter sent through the Open Politics platform.
Open Politics enables grassroots political coordination for Indian citizens.
  `.trim();
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '<br>');
}
