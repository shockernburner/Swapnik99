const LOCAL_PART_REGEX = /^[a-z0-9._-]+$/;

export function normalizeRollNumber(rollNumber: string): string {
  const normalized = rollNumber
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "");

  if (!normalized) {
    throw new Error("Roll number cannot be normalized to a valid alumni email");
  }

  if (!LOCAL_PART_REGEX.test(normalized)) {
    throw new Error("Roll number produced an invalid alumni email local part");
  }

  return normalized;
}

export function generateAlumniEmail(rollNumber: string, domain: string): { localPart: string; alumniEmail: string } {
  const normalizedDomain = domain.trim().toLowerCase();
  if (!normalizedDomain) {
    throw new Error("Mail domain is not configured");
  }

  const localPart = normalizeRollNumber(rollNumber);
  return {
    localPart,
    alumniEmail: `${localPart}@${normalizedDomain}`,
  };
}
