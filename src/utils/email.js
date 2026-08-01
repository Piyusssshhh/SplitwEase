const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../utils/logger');

const hasEmailConfig = env.email.host && env.email.user && env.email.pass;

let transporter = null;
if (hasEmailConfig) {
  transporter = nodemailer.createTransport({
    host: env.email.host,
    port: env.email.port,
    secure: env.email.port === 465,
    auth: { user: env.email.user, pass: env.email.pass },
  });
} else {
  logger.warn('[email] SMTP not configured — emails will be logged instead of sent');
}

// Sends an email if SMTP is configured; otherwise logs it. This means the
// app runs fine in dev without real email credentials, same pattern as
// how we made Google OAuth optional.
async function sendEmail({ to, subject, html }) {
  if (!transporter) {
    logger.info('[email] (SMTP not configured, logging instead)', { to, subject, html });
    return { simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: env.email.from || env.email.user,
      to,
      subject,
      html,
    });
    logger.info('Email sent', { to, subject, messageId: info.messageId });
    return info;
  } catch (err) {
    logger.error('Failed to send email', { to, subject, error: err.message });
    throw err;
  }
}

module.exports = { sendEmail, emailEnabled: hasEmailConfig };