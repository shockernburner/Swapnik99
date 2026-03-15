import "dotenv/config";

import { pool } from "../server/db";
import { storage } from "../server/storage";
import { provisionMailboxForApprovedMember, type ApprovalWorkflowResult } from "../server/services/member-approval";

type BatchCounters = {
  total: number;
  provisioned: number;
  skipped: number;
  conflict: number;
  validationFailed: number;
  failed: number;
  welcomeEmailNotSent: number;
};

type FailedItem = {
  memberId: string;
  name: string;
  email: string;
  mailboxStatus: "failed";
  message: string;
};

function printSummary(counters: BatchCounters, elapsedMs: number) {
  console.log("\nMailbox backfill summary");
  console.log("=======================");
  console.log(`Total candidates: ${counters.total}`);
  console.log(`Provisioned: ${counters.provisioned}`);
  console.log(`Skipped: ${counters.skipped}`);
  console.log(`Conflict: ${counters.conflict}`);
  console.log(`Validation failed: ${counters.validationFailed}`);
  console.log(`Failed: ${counters.failed}`);
  console.log(`Welcome email not sent: ${counters.welcomeEmailNotSent}`);
  console.log(`Elapsed: ${Math.round(elapsedMs / 1000)}s`);
}

async function runBackfill() {
  const startedAt = Date.now();
  const candidates = await storage.getApprovedMembersMissingMailbox();
  const counters: BatchCounters = {
    total: candidates.length,
    provisioned: 0,
    skipped: 0,
    conflict: 0,
    validationFailed: 0,
    failed: 0,
    welcomeEmailNotSent: 0,
  };

  const nonSuccessResults: ApprovalWorkflowResult[] = [];
  const failedItems: FailedItem[] = [];

  console.log(`Found ${candidates.length} approved members missing mailbox provisioning.`);

  for (const candidate of candidates) {
    try {
      const result = await provisionMailboxForApprovedMember(candidate.id);

      switch (result.mailboxStatus) {
        case "provisioned":
          counters.provisioned += 1;
          break;
        case "skipped":
          counters.skipped += 1;
          break;
        case "conflict":
          counters.conflict += 1;
          nonSuccessResults.push(result);
          break;
        case "validation_failed":
          counters.validationFailed += 1;
          nonSuccessResults.push(result);
          break;
        case "failed":
          counters.failed += 1;
          nonSuccessResults.push(result);
          break;
      }

      if (result.mailboxStatus === "provisioned" && !result.welcomeEmailSent) {
        counters.welcomeEmailNotSent += 1;
      }

      const welcomeInfo = result.mailboxStatus === "provisioned"
        ? result.welcomeEmailSent
          ? "welcome-email=sent"
          : "welcome-email=not-sent"
        : "welcome-email=n/a";

      console.log(
        `[${result.mailboxStatus}] ${candidate.email} -> ${result.alumniEmail ?? "n/a"} (${welcomeInfo})`,
      );
    } catch (error: any) {
      counters.failed += 1;
      const message = error?.message || "Mailbox provisioning failed";
      failedItems.push({
        memberId: candidate.id,
        name: candidate.name,
        email: candidate.email,
        mailboxStatus: "failed",
        message,
      });
      console.error(`[failed] ${candidate.email}: ${message}`);
    }
  }

  printSummary(counters, Date.now() - startedAt);

  if (nonSuccessResults.length > 0 || failedItems.length > 0) {
    console.log("\nItems needing manual attention");
    console.log("============================");

    for (const result of nonSuccessResults) {
      console.log(
        `- ${result.member.email} (${result.memberId}) status=${result.mailboxStatus} error=${result.mailboxError || "n/a"}`,
      );
    }

    for (const failed of failedItems) {
      console.log(`- ${failed.email} (${failed.memberId}) status=${failed.mailboxStatus} error=${failed.message}`);
    }
  }
}

runBackfill()
  .catch((error) => {
    console.error("Mailbox backfill script failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
