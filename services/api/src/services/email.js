
import nodemailer from 'nodemailer';

const requiredEnv = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'EMAIL_FROM',
];

for (const key of requiredEnv) {
    if (!process.env[key]) {
        throw new Error(`${key} is missing from the environment.`);
    }
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendEmail({ to, subject, html, text }) {
    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to,
            subject,
            html,
            text,
        });

        console.log('[email-sent]', {
            messageId: info.messageId,
            to,
        });

        return info;
    } catch (error) {
        console.error('[email-error]', error.message);
        throw new Error('Unable to send email. Please try again.');
    }
}
