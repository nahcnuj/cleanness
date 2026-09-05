const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalize(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Returns a normalized email or a stable error code. */
export function parseEmail(raw: string): { ok: true; email: string } | { ok: false; reason: string } {
  if (typeof raw !== "string" || raw.length === 0) {
    return { ok: false, reason: "empty" };
  }
  const email = normalize(raw);
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, reason: "invalid_format" };
  }
  return { ok: true, email };
}
