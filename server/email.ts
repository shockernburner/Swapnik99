// Resend email integration for Swapnik99
import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

export async function sendPasswordResetEmail(toEmail: string, resetToken: string, memberName: string) {
  const { client, fromEmail } = await getUncachableResendClient();
  
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.REPL_SLUG 
    ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
    : 'http://localhost:5000';
  
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
  
  const { data, error } = await client.emails.send({
    from: fromEmail || 'Swapnik99 <noreply@resend.dev>',
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
