ALTER TABLE "members"
ADD COLUMN "alumni_email" varchar,
ADD COLUMN "mailbox_provisioned" boolean DEFAULT false,
ADD COLUMN "mailbox_provisioned_at" timestamp,
ADD COLUMN "mailbox_provision_error" text;

ALTER TABLE "members"
ADD CONSTRAINT "members_alumni_email_unique" UNIQUE("alumni_email");
