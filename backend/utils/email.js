import { Resend } from 'resend';

/**
 * Sends an email using the Resend service.
 * If RESEND_API_KEY is not set or is a placeholder, it falls back to logging the email to the console.
 * 
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML body
 * @returns {Promise<Object>} Resend response or fallback info
 */
export const sendEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  
  // Local testing override: send all outgoing emails to this address if set
  const emailRecipient = process.env.EMAIL_OVERRIDE || to;

  console.log(`[Email Service] Attempting to send email. Original recipient: ${to}, Routing to: ${emailRecipient}`);

  if (!apiKey || apiKey === 'your_resend_api_key_here' || apiKey.trim() === '') {
    console.log('\n============================================================');
    console.log(`[Email Service] RESEND_API_KEY is not configured.`);
    console.log(`[Email Service] LOCAL DEVELOPMENT FALLBACK - PRINTING EMAIL DETAILS:`);
    console.log(`To: ${emailRecipient}`);
    console.log(`From: ${fromAddress}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML Body:\n${html}`);
    console.log('============================================================\n');
    return { success: true, mode: 'console_fallback' };
  }

  try {
    const resend = new Resend(apiKey);
    const response = await resend.emails.send({
      from: fromAddress,
      to: emailRecipient,
      subject,
      html,
    });

    if (response.error) {
      console.error('[Email Service] Resend error details:', response.error);
      throw new Error(response.error.message || 'Resend failed to send email');
    }

    console.log(`[Email Service] Email sent successfully via Resend to ${emailRecipient}. ID: ${response.data?.id}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`[Email Service] Error sending email via Resend:`, error);
    // In case of actual sending error, print to console as a failover so developer can still get the link.
    console.log('\n============================================================');
    console.log(`[Email Service] FAILOVER (After Resend error) - PRINTING EMAIL DETAILS:`);
    console.log(`To: ${to}`);
    console.log(`From: ${fromAddress}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML Body:\n${html}`);
    console.log('============================================================\n');
    throw error;
  }
};
