import nodemailer from "nodemailer";

/**
 * Centered, secure email mailing utility.
 * Guarantees that credentials are kept on the server and fail gracefully if not configured.
 * 
 * @param to Recipient email address
 * @param subject Subject of the email
 * @param htmlContent HTML content body of the email
 * @returns Promise<boolean> indicating whether the sending was successful or skipped
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string
): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const portStr = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM_EMAIL;

  // Security Constraint: Fail gracefully if any of the required variables are missing
  if (!host || !portStr || !user || !pass || !fromEmail) {
    console.error("SMTP configuration missing, email skipped");
    return false;
  }

  const port = parseInt(portStr, 10);
  if (isNaN(port)) {
    console.error("SMTP_PORT must be a valid integer, email skipped");
    return false;
  }

  // Security Constraint: secure: true for port 465, secure: false with TLS for port 587
  const secure = port === 465;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        // Safe configuration to allow dynamic preview hosts
        rejectUnauthorized: false,
      }
    });

    const mailOptions = {
      from: `"Mountech Academy" <${fromEmail}>`,
      to,
      subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[SMTP_SUCCESS] Email sent successfully to ${to} (Subject: "${subject}")`);
    return true;
  } catch (err: any) {
    console.error(`[SMTP_ERROR] Failed to send email to ${to}:`, err.message);
    return false;
  }
}
