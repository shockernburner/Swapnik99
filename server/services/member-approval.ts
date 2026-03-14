import type { Member } from "@shared/schema";
import { storage } from "../storage";
import { sendAlumniMailboxWelcomeEmail } from "../email";
import { generateAlumniEmail } from "./alumni-email";
import { createMailcowMailbox, getDefaultMailboxQuotaMb, getMailcowDomain } from "./mailcow";

export type MailboxStatus = "provisioned" | "failed" | "skipped" | "conflict" | "validation_failed";

export interface ApprovalWorkflowResult {
  memberId: string;
  member: Member;
  approved: boolean;
  mailboxStatus: MailboxStatus;
  alumniEmail?: string | null;
  mailboxProvisioned: boolean;
  mailboxError?: string;
  welcomeEmailSent: boolean;
}

function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const pgError = error as { code?: string; constraint?: string; message?: string };
  if (pgError.code === "23505") {
    return true;
  }

  const message = (pgError.message || "").toLowerCase();
  return message.includes("members_alumni_email_unique") || message.includes("alumni_email");
}

async function ensureApproved(member: Member): Promise<Member> {
  if (member.approvalStatus === "approved") {
    return member;
  }

  const approvedMember = await storage.updateMemberStatus(member.id, "approved");
  if (!approvedMember) {
    throw new Error("Unable to approve member");
  }

  return approvedMember;
}

async function markProvisionFailure(
  memberId: string,
  alumniEmail: string | null,
  mailboxProvisionError: string,
): Promise<Member | undefined> {
  return storage.updateMemberMailboxProvisioning(memberId, {
    alumniEmail,
    mailboxProvisioned: false,
    mailboxProvisionError,
    mailboxProvisionedAt: null,
  });
}

export async function approveMemberWithMailbox(memberId: string): Promise<ApprovalWorkflowResult> {
  const existingMember = await storage.getMemberById(memberId);
  if (!existingMember) {
    throw new Error("Member not found");
  }

  const rollNumber = existingMember.rollNumber?.trim();
  let localPart: string | undefined;
  let alumniEmail: string | undefined;
  let validationError: string | undefined;

  if (!existingMember.mailboxProvisioned || !existingMember.alumniEmail) {
    if (!rollNumber) {
      validationError = "Roll number missing; mailbox was not provisioned";
    } else {
      try {
        const generated = generateAlumniEmail(rollNumber, getMailcowDomain());
        localPart = generated.localPart;
        alumniEmail = generated.alumniEmail;
      } catch (error: any) {
        validationError = error?.message || "Invalid roll number for mailbox generation";
      }
    }
  }

  const approvedMember = await ensureApproved(existingMember);

  if (approvedMember.mailboxProvisioned && approvedMember.alumniEmail) {
    return {
      memberId: approvedMember.id,
      member: approvedMember,
      approved: true,
      mailboxStatus: "skipped",
      alumniEmail: approvedMember.alumniEmail,
      mailboxProvisioned: true,
      welcomeEmailSent: false,
    };
  }

  if (validationError) {
    const updated = await markProvisionFailure(memberId, approvedMember.alumniEmail ?? null, validationError);

    return {
      memberId: approvedMember.id,
      member: updated ?? approvedMember,
      approved: true,
      mailboxStatus: "validation_failed",
      alumniEmail: updated?.alumniEmail ?? approvedMember.alumniEmail,
      mailboxProvisioned: false,
      mailboxError: validationError,
      welcomeEmailSent: false,
    };
  }

  const targetAlumniEmail = alumniEmail!;
  const targetLocalPart = localPart!;

  try {
    await storage.updateMemberMailboxProvisioning(memberId, {
      alumniEmail: targetAlumniEmail,
      mailboxProvisioned: false,
      mailboxProvisionedAt: null,
      mailboxProvisionError: null,
    });
  } catch (error: any) {
    if (isUniqueConstraintError(error)) {
      const mailboxError = `Alumni email conflict: ${targetAlumniEmail} is already in use`;
      const updated = await markProvisionFailure(memberId, approvedMember.alumniEmail ?? null, mailboxError);

      return {
        memberId: approvedMember.id,
        member: updated ?? approvedMember,
        approved: true,
        mailboxStatus: "conflict",
        alumniEmail: updated?.alumniEmail ?? approvedMember.alumniEmail,
        mailboxProvisioned: false,
        mailboxError,
        welcomeEmailSent: false,
      };
    }

    throw error;
  }

  try {
    const { temporaryPassword } = await createMailcowMailbox({
      localPart: targetLocalPart,
      domain: getMailcowDomain(),
      name: approvedMember.name,
      quotaMb: getDefaultMailboxQuotaMb(),
    });

    const updated = await storage.updateMemberMailboxProvisioning(memberId, {
      alumniEmail: targetAlumniEmail,
      mailboxProvisioned: true,
      mailboxProvisionedAt: new Date(),
      mailboxProvisionError: null,
    });

    let welcomeEmailSent = false;
    try {
      await sendAlumniMailboxWelcomeEmail({
        name: approvedMember.name,
        email: approvedMember.email,
        alumniEmail: targetAlumniEmail,
        temporaryPassword,
      });
      welcomeEmailSent = true;
    } catch (welcomeError) {
      console.error("Failed to send alumni welcome email:", welcomeError);
    }

    return {
      memberId: approvedMember.id,
      member: updated ?? approvedMember,
      approved: true,
      mailboxStatus: "provisioned",
      alumniEmail: targetAlumniEmail,
      mailboxProvisioned: true,
      welcomeEmailSent,
    };
  } catch (error: any) {
    const mailboxError = error?.message || "Mailbox provisioning failed";

    const updated = await markProvisionFailure(memberId, targetAlumniEmail, mailboxError);

    return {
      memberId: approvedMember.id,
      member: updated ?? approvedMember,
      approved: true,
      mailboxStatus: "failed",
        alumniEmail: targetAlumniEmail,
      mailboxProvisioned: false,
      mailboxError,
      welcomeEmailSent: false,
    };
  }
}

export async function provisionMailboxForApprovedMember(memberId: string): Promise<ApprovalWorkflowResult> {
  const member = await storage.getMemberById(memberId);
  if (!member) {
    throw new Error("Member not found");
  }

  if (member.approvalStatus !== "approved") {
    throw new Error("Member must be approved before mailbox provisioning");
  }

  return approveMemberWithMailbox(memberId);
}
