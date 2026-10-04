import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

import { siteConfig } from "../../../config/site";
import {
  AuthError,
  type AuthService,
  type AuthUser,
  type CallbackParams,
  type CookieJar,
  type OutboxEmail,
  type SignUpInput,
  RECOVERY_WINDOW_MS,
} from "../types";
import { hashPassword, hashToken, randomToken, verifyPassword } from "./crypto";

export const SESSION_COOKIE = "local_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_TTL_MS = 60 * 60 * 1000;

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  email_confirmed_at: number | null;
  created_at: number;
}

interface SessionRow extends UserRow {
  expires_at: number;
  session_created_at: number;
  session_method: "password" | "link";
}

export interface LocalAuthOptions {
  db: DatabaseSync;
  cookies: CookieJar;
  secureCookies: boolean;
  requireEmailConfirmation: boolean;
  /** Injectable clock for tests. */
  now?: () => number;
  /** Where "sent" emails are announced. Defaults to the server console. */
  log?: (message: string) => void;
}

function toAuthUser(row: UserRow): AuthUser {
  return { id: row.id, email: row.email, name: row.name, createdAt: new Date(row.created_at).toISOString() };
}

function withParams(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

// Compared against when the email is unknown, so a miss costs the same time
// as a wrong password and response timing does not reveal which emails exist.
let dummyHash: Promise<string> | undefined;

/**
 * A self-contained auth backend for local development and tests: users,
 * sessions and emailed links live in a SQLite file (Node's built-in
 * `node:sqlite`, no Docker, no account). Emails are not sent: they are logged
 * to the console and listed at /dev/mailbox.
 *
 * Mirrors the Supabase provider's behavior (generic errors, single-use links,
 * optional email confirmation) so flows tested locally behave the same in
 * production. Not for production use: see `resolveConfig`.
 */
export function createLocalAuth(options: LocalAuthOptions): AuthService {
  const { db, cookies, secureCookies, requireEmailConfirmation } = options;
  const now = options.now ?? Date.now;
  const log = options.log ?? ((message: string) => console.info(message));

  let currentUser: Promise<AuthUser | null> | undefined;

  const findUserByEmail = (email: string) =>
    db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;

  const setSessionCookie = (token: string, expiresAt: number) => {
    cookies.set(SESSION_COOKIE, token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookies,
      expires: new Date(expiresAt),
    });
  };

  const startSession = (user: UserRow, method: SessionRow["session_method"] = "password") => {
    const token = randomToken();
    const expiresAt = now() + SESSION_TTL_MS;
    db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at, method) VALUES (?, ?, ?, ?, ?)").run(
      hashToken(token),
      user.id,
      expiresAt,
      now(),
      method,
    );
    setSessionCookie(token, expiresAt);
    currentUser = Promise.resolve(toAuthUser(user));
  };

  const endSession = () => {
    const token = cookies.get(SESSION_COOKIE);
    if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
    cookies.delete(SESSION_COOKIE, { path: "/" });
    currentUser = Promise.resolve(null);
  };

  const sessionRow = (): SessionRow | undefined => {
    const token = cookies.get(SESSION_COOKIE);
    if (!token) return undefined;
    const row = db
      .prepare(
        `SELECT users.*, sessions.expires_at, sessions.created_at AS session_created_at,
                sessions.method AS session_method FROM sessions
         JOIN users ON users.id = sessions.user_id
         WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
      )
      .get(hashToken(token), now()) as SessionRow | undefined;
    if (!row) {
      cookies.delete(SESSION_COOKIE, { path: "/" });
      return undefined;
    }
    // Sliding expiry: renew once less than half of the lifetime is left.
    if (row.expires_at - now() < SESSION_TTL_MS / 2) {
      const expiresAt = now() + SESSION_TTL_MS;
      db.prepare("UPDATE sessions SET expires_at = ? WHERE token_hash = ?").run(expiresAt, hashToken(token));
      setSessionCookie(token, expiresAt);
    }
    return row;
  };

  const getUser = () => {
    currentUser ??= Promise.resolve().then(() => {
      const row = sessionRow();
      return row ? toAuthUser(row) : null;
    });
    return currentUser;
  };

  const requireUserRow = async (): Promise<UserRow> => {
    const user = await getUser();
    const row = user && (db.prepare("SELECT * FROM users WHERE id = ?").get(user.id) as UserRow | undefined);
    if (!row) throw new AuthError("not_authenticated");
    return row;
  };

  const issueToken = (userId: string, type: "signup" | "recovery") => {
    const token = randomToken();
    db.prepare("INSERT INTO verification_tokens (token_hash, user_id, type, expires_at) VALUES (?, ?, ?, ?)").run(
      hashToken(token),
      userId,
      type,
      now() + TOKEN_TTL_MS,
    );
    return token;
  };

  const sendEmail = (to: string, subject: string, body: string, link: string) => {
    db.prepare("INSERT INTO outbox (to_email, subject, body, link, created_at) VALUES (?, ?, ?, ?, ?)").run(
      to,
      subject,
      body,
      link,
      now(),
    );
    log(`\n[local auth] Email to ${to}: ${subject}\n  ${link}\n  (also listed at /dev/mailbox)\n`);
  };

  return {
    provider: "local",
    getUser,

    async signIn(email, password) {
      const row = findUserByEmail(email);
      dummyHash ??= hashPassword("not-a-real-password");
      const valid = await verifyPassword(password, row?.password_hash ?? (await dummyHash));
      if (!row || !valid) throw new AuthError("invalid_credentials");
      if (requireEmailConfirmation && !row.email_confirmed_at) throw new AuthError("email_not_confirmed");
      startSession(row);
      return toAuthUser(row);
    },

    async signUp({ email, password, name }: SignUpInput, emailRedirectTo) {
      const passwordHash = await hashPassword(password);
      if (findUserByEmail(email)) {
        // Same answer as a fresh signup when confirmation is on (like Supabase),
        // so the form does not reveal which emails already have an account.
        if (requireEmailConfirmation) return { signedIn: false };
        throw new AuthError("signup_failed");
      }
      const timestamp = now();
      const row: UserRow = {
        id: randomUUID(),
        email,
        name,
        password_hash: passwordHash,
        email_confirmed_at: requireEmailConfirmation ? null : timestamp,
        created_at: timestamp,
      };
      db.prepare(
        `INSERT INTO users (id, email, name, password_hash, email_confirmed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(row.id, row.email, row.name, row.password_hash, row.email_confirmed_at, timestamp, timestamp);

      if (!requireEmailConfirmation) {
        startSession(row);
        return { signedIn: true };
      }
      const link = withParams(emailRedirectTo, { token_hash: issueToken(row.id, "signup"), type: "signup" });
      sendEmail(
        email,
        `Confirm your ${siteConfig.name} account`,
        "Click the link to confirm your email address.",
        link,
      );
      return { signedIn: false };
    },

    async signOut() {
      endSession();
    },

    async requestPasswordReset(email, redirectTo) {
      const row = findUserByEmail(email);
      if (!row) return;
      const link = withParams(redirectTo, { token_hash: issueToken(row.id, "recovery"), type: "recovery" });
      sendEmail(email, `Reset your ${siteConfig.name} password`, "Click the link to choose a new password.", link);
    },

    async verifyCallback({ tokenHash, type }: CallbackParams) {
      if (!tokenHash || (type !== "signup" && type !== "recovery")) throw new AuthError("invalid_token");
      const hashed = hashToken(tokenHash);
      const token = db
        .prepare("SELECT user_id FROM verification_tokens WHERE token_hash = ? AND type = ? AND expires_at > ?")
        .get(hashed, type, now()) as { user_id: string } | undefined;
      // Single use, whatever the outcome.
      db.prepare("DELETE FROM verification_tokens WHERE token_hash = ?").run(hashed);
      if (!token) throw new AuthError("invalid_token");

      if (type === "signup") {
        db.prepare("UPDATE users SET email_confirmed_at = COALESCE(email_confirmed_at, ?) WHERE id = ?").run(
          now(),
          token.user_id,
        );
      }
      const row = db.prepare("SELECT * FROM users WHERE id = ?").get(token.user_id) as UserRow | undefined;
      if (!row) throw new AuthError("invalid_token");
      startSession(row, "link");
    },

    async isRecoverySession() {
      const row = sessionRow();
      return Boolean(row && row.session_method === "link" && now() - row.session_created_at < RECOVERY_WINDOW_MS);
    },

    async verifyPassword(password) {
      const row = await requireUserRow();
      return verifyPassword(password, row.password_hash);
    },

    async updatePassword(password) {
      const row = await requireUserRow();
      if (await verifyPassword(password, row.password_hash)) throw new AuthError("same_password");
      db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
        await hashPassword(password),
        now(),
        row.id,
      );
      // Sign out every other device; keep the session that made the change.
      const current = cookies.get(SESSION_COOKIE);
      db.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?").run(
        row.id,
        current ? hashToken(current) : "",
      );
    },

    async updateProfile({ name }) {
      const row = await requireUserRow();
      db.prepare("UPDATE users SET name = ?, updated_at = ? WHERE id = ?").run(name, now(), row.id);
      const user = toAuthUser({ ...row, name });
      currentUser = Promise.resolve(user);
      return user;
    },

    async deleteAccount() {
      const row = await requireUserRow();
      db.prepare("DELETE FROM users WHERE id = ?").run(row.id);
      cookies.delete(SESSION_COOKIE, { path: "/" });
      currentUser = Promise.resolve(null);
    },

    readOutbox(limit = 50): OutboxEmail[] {
      const rows = db
        .prepare("SELECT id, to_email, subject, body, link, created_at FROM outbox ORDER BY id DESC LIMIT ?")
        .all(limit) as {
        id: number;
        to_email: string;
        subject: string;
        body: string;
        link: string | null;
        created_at: number;
      }[];
      return rows.map((row) => ({
        id: row.id,
        to: row.to_email,
        subject: row.subject,
        body: row.body,
        link: row.link,
        createdAt: new Date(row.created_at).toISOString(),
      }));
    },
  };
}
