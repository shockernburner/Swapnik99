import "dotenv/config";

import { pool } from "../server/db";
import { sendAlumniMailboxWelcomeEmail } from "../server/email";
import { resetMailcowMailboxPassword } from "../server/services/mailcow";
import { storage } from "../server/storage";

type SelectedMember = {
  id: string;
  name: string;
  email: string;
  alumniEmail: string;
};

type Counters = {
  targeted: number;
  sent: number;
  failed: number;
};

function parseArgs(argv: string[]) {
  let sendAll = false;
  let emailList: string[] = [];

  for (const arg of argv) {
    if (arg === "--all") {
      sendAll = true;
      continue;
    }

    if (arg.startsWith("--emails=")) {
      emailList = arg
        .slice("--emails=".length)
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
    }
  }

  if ((sendAll && emailList.length > 0) || (!sendAll && emailList.length === 0)) {
    throw new Error("Usage: npm run welcome-mails:send -- --all OR npm run welcome-mails:send -- --emails=user1@example.com,user2@example.com");
  }

  return { sendAll, emailList };
}

function selectMembers(
  members: Awaited<ReturnType<typeof storage.getApprovedMembers>>,
  filters: { sendAll: boolean; emailList: string[] },
): SelectedMember[] {
  const eligibleMembers = members.filter(
    (member) => member.mailboxProvisioned === true && typeof member.alumniEmail === "string" && member.alumniEmail.length > 0,
  );

  if (filters.sendAll) {
    return eligibleMembers.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      alumniEmail: member.alumniEmail!,
    }));
  }

  const allowedEmails = new Set(filters.emailList);
  return eligibleMembers
    .filter((member) => allowedEmails.has(member.email.toLowerCase()))
    .map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      alumniEmail: member.alumniEmail!,
    }));
}

function printSummary(counters: Counters) {
  console.log("\nWelcome mail resend summary");
  console.log("===========================");
  console.log(`Targeted: ${counters.targeted}`);
  console.log(`Sent: ${counters.sent}`);
  console.log(`Failed: ${counters.failed}`);
}

async function run() {
  const filters = parseArgs(process.argv.slice(2));
  const approvedMembers = await storage.getApprovedMembers();
  const selectedMembers = selectMembers(approvedMembers, filters);

  if (selectedMembers.length === 0) {
    console.error("No approved provisioned members matched the requested selection.");
    process.exitCode = 1;
    return;
  }

  const counters: Counters = {
    targeted: selectedMembers.length,
    sent: 0,
    failed: 0,
  };

  for (const member of selectedMembers) {
    let temporaryPassword = "";

    try {
      const resetResult = await resetMailcowMailboxPassword(member.alumniEmail);
      temporaryPassword = resetResult.temporaryPassword;

      await sendAlumniMailboxWelcomeEmail({
        name: member.name,
        email: member.email,
        alumniEmail: member.alumniEmail,
        temporaryPassword,
      });

      counters.sent += 1;
      console.log(`[sent] ${member.email} -> ${member.alumniEmail}`);
    } catch (error: any) {
      counters.failed += 1;
      const errorMessage = error?.message || "Unknown error";
      console.error(`[failed] ${member.email} -> ${member.alumniEmail}: ${errorMessage}`);
      if (temporaryPassword) {
        console.error(`[manual-password] ${member.alumniEmail}: ${temporaryPassword}`);
      }
    }
  }

  printSummary(counters);

  if (counters.failed > 0) {
    process.exitCode = 1;
  }
}

run()
  .catch((error) => {
    console.error("Welcome mail resend script failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });