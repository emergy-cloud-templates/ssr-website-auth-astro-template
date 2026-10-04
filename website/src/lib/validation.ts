/**
 * Input rules shared by the API routes (authoritative) and the forms (early
 * feedback). Each validator returns an error message, or null when valid.
 */

export const LIMITS = {
  emailMax: 254,
  passwordMin: 8,
  // bcrypt, used by Supabase Auth, only reads the first 72 bytes.
  passwordMax: 72,
  nameMin: 2,
  nameMax: 100,
} as const;

export const PASSWORD_HINT = `At least ${LIMITS.passwordMin} characters, with an uppercase letter, a lowercase letter and a number.`;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateEmail(email: string): string | null {
  if (!email) return "Email is required.";
  if (email.length > LIMITS.emailMax || !EMAIL_PATTERN.test(email)) {
    return "Please enter a valid email address.";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < LIMITS.passwordMin) {
    return `Password must be at least ${LIMITS.passwordMin} characters.`;
  }
  if (new TextEncoder().encode(password).length > LIMITS.passwordMax) {
    return `Password must be at most ${LIMITS.passwordMax} bytes.`;
  }
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  return null;
}

/** Trims, collapses whitespace and drops control characters. Output is escaped at render time. */
export function sanitizeName(raw: string): string {
  return (
    raw
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, LIMITS.nameMax)
  );
}

export function validateName(name: string): string | null {
  if (!name) return "Name is required.";
  if (name.length < LIMITS.nameMin) return "Please enter a valid name.";
  return null;
}

/**
 * Returns `raw` when it is a same-site relative path, otherwise `fallback`.
 * Guards every user-supplied redirect target against open redirects
 * (`//evil.com`, `/\evil.com`, `https://evil.com`, `javascript:` ...).
 */
export function safeRedirectPath(raw: string | null | undefined, fallback: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return fallback;
  }
  try {
    const base = "http://internal.invalid";
    const url = new URL(raw, base);
    if (url.origin !== base) return fallback;
    const path = `${url.pathname}${url.search}${url.hash}`;
    // URL parsing collapses dot segments: "/.//evil.com" becomes "//evil.com",
    // which a browser treats as another host. Check the result, not the input.
    if (path.startsWith("//") || path.startsWith("/\\")) return fallback;
    return path;
  } catch {
    return fallback;
  }
}
