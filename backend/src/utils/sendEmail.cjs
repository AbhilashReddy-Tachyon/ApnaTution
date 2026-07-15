const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
    const { EMAIL_SERVICE, EMAIL_USER, EMAIL_PASSWORD, FROM_NAME, FROM_EMAIL } = process.env;

    if (!EMAIL_USER || !EMAIL_PASSWORD || EMAIL_PASSWORD === "your_gmail_app_password_here") {
        throw new Error("Email service not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env");
    }

    const transporter = nodemailer.createTransport({
        service: EMAIL_SERVICE || "gmail",
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASSWORD
        }
    });

    const message = {
        from: `${FROM_NAME || "ApnaTutors"} <${FROM_EMAIL || EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.html
    };

    const info = await transporter.sendMail(message);
    console.log("Message sent: %s", info.messageId);
};

module.exports = sendEmail;
