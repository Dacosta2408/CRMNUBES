const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

// POST /api/email/send
router.post("/send", async (req, res) => {
  const { to, subject, body, fromName, fromEmail, host, port, username, password } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ success: false, error: "Missing required fields (to, subject, body)" });
  }

  try {
    // Configure default / fallback settings or use requested values
    const smtpHost = host || "smtp.gmail.com";
    const smtpPort = parseInt(port || "587", 10);
    const smtpUser = username || fromEmail;
    const smtpPass = password;

    if (!smtpUser || !smtpPass) {
      return res.status(400).json({ success: false, error: "SMTP username and password are required to send emails" });
    }

    // Build transporter config. As specified: use secure: false with requireTLS: true as default
    // If port is 465, we might set secure: true or fallback to the requirement
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      requireTLS: smtpPort !== 465, // True if secure: false, to negotiate TLS
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const mailOptions = {
      from: fromName ? `"${fromName}" <${fromEmail || smtpUser}>` : (fromEmail || smtpUser),
      to: to,
      subject: subject,
      text: body, // plain text format
      html: body.replace(/\n/g, "<br>") // basic HTML line break conversion
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully via bridge:", info.messageId);

    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error("Error sending email in bridge server:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
