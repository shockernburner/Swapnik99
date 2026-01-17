// Resend email integration for Swapnik99
import { Resend } from 'resend';

const FROM_EMAIL = 'Swapnik99 <info@swapnik99.org>';

async function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }
  return new Resend(apiKey);
}

export async function sendPasswordResetEmail(toEmail: string, resetToken: string, memberName: string) {
  const client = await getResendClient();
  
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.REPL_SLUG 
    ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
    : 'http://localhost:5000';
  
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
  
  const { data, error } = await client.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: 'Reset Your Swapnik99 Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2B4F81 0%, #67C5E5 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Swapnik99</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">BUET '99 Alumni Network</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #2B4F81; margin-top: 0;">Password Reset Request</h2>
          
          <p>Hello ${memberName},</p>
          
          <p>We received a request to reset your password for your Swapnik99 account. Click the button below to create a new password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #2B4F81; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Reset Password</a>
          </div>
          
          <p style="color: #666; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
          
          <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            This email was sent by Swapnik99 - BUET Batch 1999 Alumni Network<br>
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetLink}" style="color: #67C5E5; word-break: break-all;">${resetLink}</a>
          </p>
        </div>
      </body>
      </html>
    `
  });

  if (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }

  return data;
}
