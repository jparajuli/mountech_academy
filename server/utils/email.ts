import nodemailer from "nodemailer";

export async function sendVerificationEmail(email: string, name: string, token: string, reqHost: string): Promise<string> {
  // Use APP_URL if specified in env variables, fallback dynamically to reqHost
  const rawUrl = process.env.APP_URL || (reqHost.startsWith("http") ? reqHost : `https://${reqHost}`);
  const appUrl = (rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`).replace(/\/$/, "");
  const verifyLink = `${appUrl}/api/auth/verify?token=${token}`;

  console.log(`\n======================================================`);
  console.log(`🛡️  MOUNTECH SYSTEMS : REAL VERIFICATION ENGINE`);
  console.log(`🎓  Recipient: ${name} (${email})`);
  console.log(`⚡  Live App URL Inferred: ${appUrl}`);
  console.log(`🔗  Verification URL: ${verifyLink}`);
  console.log(`======================================================\n`);

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"Mountech Academy" <noreply@mountech.academy>`;

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      const mailOptions = {
        from,
        to: email,
        subject: "Verify Your Mountech Academy Account 📡",
        html: `
          <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #f9fafb; padding: 40px; color: #111827;">
            <div style="max-width: 580px; margin: 0 auto; background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
              <div style="background-color: #111827; padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 800;">MOUNTECH ACADEMY</h1>
                <p style="margin: 5px 0 0 0; font-size: 11px; font-weight: 500; font-family: monospace; color: #38bdf8; text-transform: uppercase; letter-spacing: 2px;">Global Tech Certification Labs</p>
              </div>
              <div style="padding: 40px 30px;">
                <h2 style="font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 15px; color: #111827;">Welcome to the Labs, ${name}!</h2>
                <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 25px;">
                  We are excited to have you join Mountech Academy. To access your student sandbox, view authentic online lectures, download PDF textbooks, and enroll in certifications, please verify that this email address belongs to you.
                </p>
                
                <div style="text-align: center; margin: 35px 0;">
                  <a href="${verifyLink}" style="background-color: #0070f3; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
                    Verify My Email Address
                  </a>
                </div>

                <p style="font-size: 12px; line-height: 1.5; color: #6b7280; word-break: break-all;">
                  If the button above does not work, copy and paste this verification URL into your web browser: <br/>
                  <a href="${verifyLink}" style="color: #0070f3; text-decoration: underline;">${verifyLink}</a>
                </p>
                
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;"/>
                
                <p style="font-size: 11px; line-height: 1.4; color: #9ca3af; margin-bottom: 0;">
                  This is an automated security mail sent by Mountech Academy servers. If you did not sign up for an account, you can safely ignore this email.
                </p>
              </div>
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`[VERIFICATION EMAIL ENGINE] Emailed verification link successfully to ${email}`);
    } catch (err: any) {
      console.error(`[VERIFICATION EMAIL ENGINE] Real SMTP delivery failed:`, err.message);
    }
  } else {
    console.log(`[VERIFICATION EMAIL ENGINE] SMTP configuration is absent. Email printed above is available for local sandbox browser activation.`);
  }

  return verifyLink;
}

export async function sendPasswordResetEmail(email: string, name: string, token: string, reqHost: string): Promise<string> {
  // Use APP_URL if specified in env variables, fallback dynamically to reqHost
  const rawUrl = process.env.APP_URL || (reqHost.startsWith("http") ? reqHost : `https://${reqHost}`);
  const appUrl = (rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`).replace(/\/$/, "");
  const resetLink = `${appUrl}/signin?resetToken=${token}`;

  console.log(`\n======================================================`);
  console.log(`🛡️  MOUNTECH SYSTEMS : PASSWORD RECOVERY ENGINE`);
  console.log(`🎓  Recipient: ${name} (${email})`);
  console.log(`⚡  Live App URL Inferred: ${appUrl}`);
  console.log(`🔗  Password Reset URL: ${resetLink}`);
  console.log(`======================================================\n`);

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"Mountech Academy" <noreply@mountech.academy>`;

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      const mailOptions = {
        from,
        to: email,
        subject: "Reset Your Mountech Academy Password 🔑",
        html: `
          <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #f9fafb; padding: 40px; color: #111827;">
            <div style="max-width: 580px; margin: 0 auto; background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
              <div style="background-color: #111827; padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 800;">MOUNTECH ACADEMY</h1>
                <p style="margin: 5px 0 0 0; font-size: 11px; font-weight: 500; font-family: monospace; color: #38bdf8; text-transform: uppercase; letter-spacing: 2px;">Global Tech Certification Labs</p>
              </div>
              <div style="padding: 40px 30px;">
                <h2 style="font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 15px; color: #111827;">Password Reset Request</h2>
                <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 25px;">
                  Hello ${name}, we received a request to change your Mountech Academy password. Click the button below to update your credentials. This password reset link will expire in 1 hour.
                </p>
                
                <div style="text-align: center; margin: 35px 0;">
                  <a href="${resetLink}" style="background-color: #0070f3; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
                    Reset Password Now
                  </a>
                </div>

                <p style="font-size: 12px; line-height: 1.5; color: #6b7280; word-break: break-all;">
                  If the button above does not work, copy and paste this recovery URL into your web browser: <br/>
                  <a href="${resetLink}" style="color: #0070f3; text-decoration: underline;">${resetLink}</a>
                </p>
                
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;"/>
                
                <p style="font-size: 11px; line-height: 1.4; color: #9ca3af; margin-bottom: 0;">
                  This is an automated security mail sent by Mountech Academy servers. If you did not request a password change, you can safely ignore this email.
                </p>
              </div>
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`[PASSWORD RESET EMAIL ENGINE] Emailed reset link successfully to ${email}`);
    } catch (err: any) {
      console.error(`[PASSWORD RESET EMAIL ENGINE] Real SMTP delivery failed:`, err.message);
    }
  } else {
    console.log(`[PASSWORD RESET EMAIL ENGINE] SMTP configuration is absent. Email printed above is available for local sandbox browser activation.`);
  }

  return resetLink;
}

export async function sendLiveClassReminderEmail(
  email: string,
  userName: string,
  sessionTitle: string,
  startTime: string,
  meetUrl: string,
  courseTitle: string
): Promise<void> {
  console.log(`\n======================================================`);
  console.log(`🔔  MOUNTECH SYSTEM : LIVE CLASS REMINDER (AUTOMATED)`);
  console.log(`🎓  Recipient: ${userName} (${email})`);
  console.log(`📖  Course: ${courseTitle}`);
  console.log(`⚡  Live Class: ${sessionTitle}`);
  console.log(`📅  Scheduled Start: ${startTime} (15 mins from now!)`);
  console.log(`🔗  Meeting URL: ${meetUrl}`);
  console.log(`======================================================\n`);

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"Mountech Academy" <noreply@mountech.academy>`;

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      const mailOptions = {
        from,
        to: email,
        subject: `Live Session Starting Soon: ${sessionTitle} 🚀`,
        html: `
          <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #f9fafb; padding: 40px; color: #111827;">
            <div style="max-width: 580px; margin: 0 auto; background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
              <div style="background-color: #f43f5e; padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 800;">LIVE CLASSROOM</h1>
                <p style="margin: 5px 0 0 0; font-size: 11px; font-weight: 500; font-family: monospace; color: #ffe4e6; text-transform: uppercase; letter-spacing: 2px;">Mountech Academy Interactive Labs</p>
              </div>
              <div style="padding: 40px 30px;">
                <h2 style="font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 15px; color: #111827;">Your Interactive Session is Starting in 15 Minutes!</h2>
                <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 10px;">
                  Hello <strong>${userName}</strong>,
                </p>
                <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 25px;">
                  This is an automated reminder that the live review session for <strong>${courseTitle}</strong> is scheduled to begin in 15 minutes. Secure your network sandbox and join the lecture via Google Meet:
                </p>
                
                <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                  <div style="font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 5px;">${sessionTitle}</div>
                  <div style="font-size: 12px; font-family: monospace; color: #dc2626; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                    Starts: ${new Date(startTime).toLocaleTimeString()}
                  </div>
                </div>

                <div style="text-align: center; margin: 35px 0;">
                  <a href="${meetUrl}" style="background-color: #f43f5e; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
                    Join Google Meet Classroom
                  </a>
                </div>

                <p style="font-size: 12px; line-height: 1.5; color: #6b7280; word-break: break-all;">
                  Having issues connecting? Copy and paste the meeting link directly into your browser URL bar: <br/>
                  <a href="${meetUrl}" style="color: #f43f5e; text-decoration: underline;">${meetUrl}</a>
                </p>
                
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;"/>
                
                <p style="font-size: 11px; line-height: 1.4; color: #9ca3af; margin-bottom: 0;">
                  Mountech Automated Scheduler Services. If you unregistered from this training track, please disregard this transmission.
                </p>
              </div>
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`[LIVE REMINDER EMAIL ENGINE] Emailed reminder successfully to ${email}`);
    } catch (err: any) {
      console.error(`[LIVE REMINDER EMAIL ENGINE] Real SMTP reminder delivery failed for ${email}:`, err.message);
    }
  } else {
    console.log(`[LIVE REMINDER EMAIL ENGINE] SMTP configuration is absent. Emulated/Printed live class scheduled reminder for recipient ${email}`);
  }
}

