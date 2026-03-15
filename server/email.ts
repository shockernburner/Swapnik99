// Resend email integration for Swapnik99
import { Resend } from "resend";
import type { Member } from "@shared/schema";

const FROM_EMAIL = process.env.FROM_EMAIL || "Swapnik99 <info@swapnik99.org>";
const ALUMNI_MAIL_FROM_EMAIL = process.env.ALUMNI_MAIL_FROM_EMAIL || "Swapnik99 Mail <no-reply@mail.swapnik99.org>";

async function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }
  return new Resend(apiKey);
}

export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string,
  memberName: string,
) {
  const client = await getResendClient();

  const baseUrl = process.env.APP_URL || "https://swapnik99.org";

  const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

  const { data, error } = await client.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: "Reset Your Swapnik99 Password",
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
    `,
  });

  if (error) {
    console.error("Failed to send password reset email:", error);
    throw new Error("Failed to send password reset email");
  }

  return data;
}

export async function sendMembershipApprovedEmail(member: Pick<Member, "name" | "email">) {
  const client = await getResendClient();

  const { data, error } = await client.emails.send({
    from: FROM_EMAIL,
    to: member.email,
    subject: "Your Swapnik99 Membership Has Been Approved",
    text: `Hello ${member.name},

Your membership in the Swapnik99 BUET '99 Alumni Network has been approved.

You can now log in and connect with your batchmates.

Login here:
https://swapnik99.org

Best regards
Swapnik99 Alumni Network`,
  });

  if (error) {
    console.error("Failed to send membership approved email:", error);
    throw new Error("Failed to send membership approved email");
  }

  return data;
}

export async function sendAlumniMailboxWelcomeEmail(input: {
  name: string;
  email: string;
  alumniEmail: string;
  temporaryPassword: string;
}) {
  const client = await getResendClient();
  const mailLoginUrl = process.env.MAIL_LOGIN_URL || "https://mail.swapnik99.org";
  const setupGuideUrl = process.env.MAIL_SETUP_GUIDE_URL?.trim();
  const setupGuideText = setupGuideUrl
    ? `You can also follow the mailbox setup guide for other apps:\n${setupGuideUrl}`
    : "You can also use the setup guide already shared with you to configure this mailbox in other apps.";

  const { data, error } = await client.emails.send({
    from: ALUMNI_MAIL_FROM_EMAIL,
    to: input.email,
    subject: "Your Swapnik99 Alumni Email Is Ready",
    text: `Hello ${input.name},

Your new Swapnik99 alumni mailbox has been created.

Alumni email: ${input.alumniEmail}
Temporary password: ${input.temporaryPassword}

You can log in and start using your mailbox here:
${mailLoginUrl}

Please sign in and change this temporary password as soon as possible.

${setupGuideText}

Best regards
Swapnik99 Alumni Network`,
  });

  if (error) {
    console.error("Failed to send alumni mailbox welcome email:", error);
    throw new Error("Failed to send alumni mailbox welcome email");
  }

  return data;
}

export async function sendFriendRequestEmail(
  sender: Pick<Member, "name" | "email">,
  receiver: Pick<Member, "name" | "email">,
) {
  const client = await getResendClient();

  const { data, error } = await client.emails.send({
    from: FROM_EMAIL,
    to: receiver.email,
    subject: "New Friend Request on Swapnik99",
    text: `Hello ${receiver.name},

${sender.name} has sent you a friend request on Swapnik99.

Log in to accept or decline the request.

https://swapnik99.org

Best regards
Swapnik99 Alumni Network`,
  });

  if (error) {
    console.error("Failed to send friend request email:", error);
    throw new Error("Failed to send friend request email");
  }

  return data;
}
