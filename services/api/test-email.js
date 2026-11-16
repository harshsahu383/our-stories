
import 'dotenv/config';
import { sendEmail } from './src/services/email.js';

const recipient = process.env.TEST_EMAIL;

if (!recipient) {
    throw new Error('Add TEST_EMAIL to your .env file.');
}

try {
    const result = await sendEmail({
        to: recipient,
        subject: 'Our Stories - Email Test',
        html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome to Our Stories</h2>
        <p>Your email service is connected successfully.</p>
        <p>We are getting ready to help preserve your stories.</p>
      </div>
    `,
        text: 'Our Stories email service is connected successfully.',
    });

    console.log('Email sent successfully:', result.id);
} catch (error) {
    console.error('Email test failed:', error.message);
    process.exitCode = 1;
}



try {
    await sendEmail({
        to: process.env.TEST_EMAIL,
        subject: 'Our Stories - SMTP Test',
        text: 'Congratulations! Gmail SMTP is working.',
        html: '<h2>Our Stories</h2><p>Gmail SMTP is working successfully!</p>',
    });

    console.log('SMTP TEST SUCCESSFUL');
} catch (error) {
    console.error('SMTP TEST FAILED:', error.message);
    process.exitCode = 1;
}
