const nodemailer = require("nodemailer");
const { config } = require("../config/env");
const { HttpError } = require("../utils/httpError");

function assertEmailConfig() {
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass || !config.smtpFrom) {
    throw new HttpError(501, "Email notifications are not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS and SMTP_FROM.");
  }
}

function createTransporter() {
  assertEmailConfig();

  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass
    }
  });
}

async function sendEmail({ to, subject, text, html }) {
  if (!to) {
    throw new HttpError(400, "Missing email recipient.");
  }

  const transporter = createTransporter();
  const result = await transporter.sendMail({
    from: config.smtpFrom,
    to,
    subject,
    text,
    html
  });

  return {
    messageId: result.messageId
  };
}

module.exports = {
  sendEmail
};
