import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  let transporter;

  // Use configured SMTP if available
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Fallback to Ethereal Test Account (catches emails online for development)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  const mailOptions = {
    from: `BatchMinder System <${process.env.SMTP_USER || 'noreply@batchminder.local'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  const info = await transporter.sendMail(mailOptions);
  
  if (!process.env.SMTP_HOST) {
    console.log('\n======================================================');
    console.log(`[Ethereal Testing] Email sent successfully!`);
    console.log(`Open this link in your browser to view the email:`);
    console.log(nodemailer.getTestMessageUrl(info));
    console.log('======================================================\n');
  } else {
    console.log(`\n[Real Email] Successfully sent to: ${options.email}`);
  }
};

export default sendEmail;
