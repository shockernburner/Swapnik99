import crypto from "crypto";

export interface CreateMailboxInput {
  localPart: string;
  domain: string;
  name: string;
  quotaMb: number;
}

interface MailcowMessage {
  type?: string;
  msg?: string | string[];
}

function readConfig() {
  const apiUrl = process.env.MAILCOW_API_BASE_URL || process.env.MAILCOW_API_URL;
  const apiKey = process.env.MAILCOW_API_KEY;
  const domain = process.env.MAILCOW_DOMAIN || process.env.MAIL_DOMAIN || "swapnik99.org";
  const quotaMb = Number(process.env.MAILCOW_MAILBOX_QUOTA_MB || process.env.MAIL_QUOTA_MB || "2048");
  const passwordLength = Number(process.env.MAILCOW_PASSWORD_LENGTH || "24");

  if (!apiUrl) {
    throw new Error("MAILCOW_API_BASE_URL or MAILCOW_API_URL is required");
  }

  if (!apiKey) {
    throw new Error("MAILCOW_API_KEY is required");
  }

  if (!Number.isFinite(quotaMb) || quotaMb <= 0) {
    throw new Error("MAILCOW mailbox quota must be a positive number");
  }

  if (!Number.isFinite(passwordLength) || passwordLength < 16) {
    throw new Error("MAILCOW password length must be a number greater than or equal to 16");
  }

  return {
    apiUrl: apiUrl.replace(/\/+$/, ""),
    apiKey,
    domain,
    quotaMb,
    passwordLength,
  };
}

function takeRandomChar(alphabet: string): string {
  const bytes = crypto.randomBytes(1);
  return alphabet[bytes[0] % alphabet.length];
}

function shuffleCharacters(characters: string[]): string {
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(0, index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }

  return characters.join("");
}

function createTemporaryPassword(length = 24): string {
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const specialChars = "!@#$%^&*()?=";
  const allCharacters = `${lowercase}${uppercase}${digits}${specialChars}`;

  const passwordCharacters = [
    takeRandomChar(lowercase),
    takeRandomChar(uppercase),
    takeRandomChar(digits),
    takeRandomChar(specialChars),
  ];

  while (passwordCharacters.length < length) {
    passwordCharacters.push(takeRandomChar(allCharacters));
  }

  return shuffleCharacters(passwordCharacters);
}

function parseMailcowResponse(payload: unknown): MailcowMessage[] {
  if (Array.isArray(payload)) {
    return payload as MailcowMessage[];
  }

  if (payload && typeof payload === "object") {
    return [payload as MailcowMessage];
  }

  return [];
}

function extractMessage(messages: MailcowMessage[]): string {
  const parts = messages
    .map((entry) => entry.msg)
    .flatMap((message) => (Array.isArray(message) ? message : [message]))
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0);

  return parts.join("; ") || "Unknown Mailcow error";
}

export async function createMailcowMailbox(input: CreateMailboxInput): Promise<{ temporaryPassword: string }> {
  const config = readConfig();
  const temporaryPassword = createTemporaryPassword(config.passwordLength);

  const response = await fetch(`${config.apiUrl}/add/mailbox`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.apiKey,
    },
    body: JSON.stringify({
      local_part: input.localPart,
      domain: input.domain,
      name: input.name,
      authsource: "mailcow",
      quota: input.quotaMb || config.quotaMb,
      password: temporaryPassword,
      password2: temporaryPassword,
      active: "1",
      force_pw_update: "1",
    }),
  });

  const responseBody = await response.json().catch(() => null);
  const messages = parseMailcowResponse(responseBody);
  const hasError = messages.some((entry) => entry.type === "danger" || entry.type === "error");

  if (!response.ok || hasError) {
    const errorMessage = extractMessage(messages);
    throw new Error(`Mailcow mailbox creation failed: ${errorMessage}`);
  }

  return { temporaryPassword };
}

export async function resetMailcowMailboxPassword(mailbox: string): Promise<{ temporaryPassword: string }> {
  const config = readConfig();
  const temporaryPassword = createTemporaryPassword(config.passwordLength);

  const response = await fetch(`${config.apiUrl}/edit/mailbox`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.apiKey,
    },
    body: JSON.stringify({
      items: [mailbox],
      attr: {
        authsource: "mailcow",
        password: temporaryPassword,
        password2: temporaryPassword,
        force_pw_update: "1",
      },
    }),
  });

  const responseBody = await response.json().catch(() => null);
  const messages = parseMailcowResponse(responseBody);
  const hasError = messages.some((entry) => entry.type === "danger" || entry.type === "error");

  if (!response.ok || hasError) {
    const errorMessage = extractMessage(messages);
    throw new Error(`Mailcow mailbox password reset failed: ${errorMessage}`);
  }

  return { temporaryPassword };
}

export function getMailcowDomain(): string {
  return (process.env.MAILCOW_DOMAIN || process.env.MAIL_DOMAIN || "swapnik99.org").trim().toLowerCase();
}

export function getDefaultMailboxQuotaMb(): number {
  const value = Number(process.env.MAILCOW_MAILBOX_QUOTA_MB || process.env.MAIL_QUOTA_MB || "2048");
  if (!Number.isFinite(value) || value <= 0) {
    return 2048;
  }
  return value;
}
