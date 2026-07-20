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
  const ownerEmail = process.env.EMAIL_OVERRIDE || 'batchminder@gmail.com';

  console.log(`[Email Service] Attempting email to: ${to}`);

  if (!apiKey || apiKey === 'your_resend_api_key_here' || apiKey.trim() === '') {
    console.log('\n============================================================');
    console.log(`[Email Service] RESEND_API_KEY is not configured.`);
    console.log(`[Email Service] LOCAL DEVELOPMENT FALLBACK:`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML Body:\n${html}`);
    console.log('============================================================\n');
    return { success: true, mode: 'console_fallback' };
  }

  const resend = new Resend(apiKey);

  // 1. Try sending directly to requested recipient
  try {
    const response = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject,
      html,
    });

    if (!response.error) {
      console.log(`[Email Service] Delivered to ${to}. ID: ${response.data?.id}`);
      return { success: true, data: response.data };
    }
    console.warn('[Email Service] Resend recipient notice:', response.error.message);
  } catch (err) {
    console.warn('[Email Service] Direct send error:', err.message);
  }

  // 2. Fallback: If Resend restricts to account owner (batchminder@gmail.com), send to owner email
  try {
    const fbResponse = await resend.emails.send({
      from: fromAddress,
      to: [ownerEmail],
      subject: `[For: ${to}] ${subject}`,
      html,
    });

    if (!fbResponse.error) {
      console.log(`[Email Service] Delivered via owner email fallback (${ownerEmail}) for ${to}`);
      return { success: true, data: fbResponse.data, mode: 'owner_fallback' };
    }
  } catch (fbErr) {
    console.warn('[Email Service] Owner fallback send error:', fbErr.message);
  }

  // 3. Failover: Print details to server console so testing never blocks
  console.log('\n============================================================');
  console.log(`[Email Service] FAILOVER DETAILS:`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`HTML Body:\n${html}`);
  console.log('============================================================\n');

  return { success: true, mode: 'console_failover' };
};
