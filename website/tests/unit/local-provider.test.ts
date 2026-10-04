import { beforeEach, describe, expect, it } from "vitest";

import { hashPassword, hashToken, verifyPassword } from "~/lib/auth/local/crypto";
import { createDatabase } from "~/lib/auth/local/db";
import { createLocalAuth, SESSION_COOKIE, type LocalAuthOptions } from "~/lib/auth/local/provider";
import { AuthError, type AuthService } from "~/lib/auth/types";

import { MemoryCookieJar } from "./helpers";

const PASSWORD = "Correct1horse";
const REDIRECT = "http://localhost:4321/auth/callback?next=%2Fdashboard";

type Db = ReturnType<typeof createDatabase>;

/** One "browser": its own cookies, a fresh provider per request like the app. */
function browser(db: Db, options: Partial<LocalAuthOptions> = {}) {
  const cookies = new MemoryCookieJar();
  const emails: string[] = [];
  const request = (): AuthService =>
    createLocalAuth({
      db,
      cookies,
      secureCookies: true,
      requireEmailConfirmation: false,
      log: (message) => emails.push(message),
      ...options,
    });
  return { cookies, emails, request };
}

function latestLink(db: Db): URL {
  const row = db.prepare("SELECT link FROM outbox ORDER BY id DESC LIMIT 1").get() as { link: string };
  return new URL(row.link);
}

const code = (promise: Promise<unknown>) =>
  promise.then(
    () => "resolved",
    (error: unknown) => (error instanceof AuthError ? error.code : error),
  );

describe("password hashing", () => {
  it("verifies the right password only", async () => {
    const hash = await hashPassword(PASSWORD);
    expect(hash).toMatch(/^scrypt\$/);
    expect(await verifyPassword(PASSWORD, hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
    expect(await verifyPassword(PASSWORD, "garbage")).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword(PASSWORD)).not.toBe(await hashPassword(PASSWORD));
  });
});

describe("local auth provider", () => {
  let db: Db;
  beforeEach(() => {
    db = createDatabase(":memory:");
  });

  it("signs up, keeps the session across requests, and signs out", async () => {
    const alice = browser(db);
    expect(
      await alice.request().signUp({ email: "alice@example.com", password: PASSWORD, name: "Alice" }, REDIRECT),
    ).toEqual({
      signedIn: true,
    });

    const cookie = alice.cookies.store.get(SESSION_COOKIE);
    expect(cookie?.options).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    // Only the hash of the session token is stored.
    const stored = db.prepare("SELECT token_hash FROM sessions").get() as { token_hash: string };
    expect(stored.token_hash).toBe(hashToken(cookie!.value));

    expect(await alice.request().getUser()).toMatchObject({ email: "alice@example.com", name: "Alice" });

    await alice.request().signOut();
    expect(alice.cookies.get(SESSION_COOKIE)).toBeUndefined();
    expect(await alice.request().getUser()).toBeNull();
    expect(db.prepare("SELECT COUNT(*) AS n FROM sessions").get()).toEqual({ n: 0 });
  });

  it("signs in with the right password and rejects anything else with one generic error", async () => {
    await browser(db).request().signUp({ email: "bob@example.com", password: PASSWORD, name: "Bob" }, REDIRECT);

    const bob = browser(db);
    expect(await code(bob.request().signIn("bob@example.com", "Wrong1password"))).toBe("invalid_credentials");
    expect(await code(bob.request().signIn("nobody@example.com", PASSWORD))).toBe("invalid_credentials");
    expect(await bob.request().getUser()).toBeNull();

    const user = await bob.request().signIn("bob@example.com", PASSWORD);
    expect(user.email).toBe("bob@example.com");
    expect(await bob.request().getUser()).toMatchObject({ id: user.id });
  });

  it("refuses a duplicate signup without confirmation, and hides it with confirmation", async () => {
    const input = { email: "dup@example.com", password: PASSWORD, name: "Dup" };
    await browser(db).request().signUp(input, REDIRECT);
    expect(await code(browser(db).request().signUp(input, REDIRECT))).toBe("signup_failed");

    const confirming = browser(db, { requireEmailConfirmation: true });
    expect(await confirming.request().signUp(input, REDIRECT)).toEqual({ signedIn: false });
  });

  it("requires the emailed link when confirmation is on; the link is single use", async () => {
    const carol = browser(db, { requireEmailConfirmation: true });
    expect(
      await carol.request().signUp({ email: "carol@example.com", password: PASSWORD, name: "Carol" }, REDIRECT),
    ).toEqual({ signedIn: false });
    expect(carol.cookies.get(SESSION_COOKIE)).toBeUndefined();
    expect(carol.emails.join()).toContain("carol@example.com");

    expect(await code(carol.request().signIn("carol@example.com", PASSWORD))).toBe("email_not_confirmed");

    const link = latestLink(db);
    expect(link.searchParams.get("next")).toBe("/dashboard");
    expect(link.searchParams.get("type")).toBe("signup");
    const params = { tokenHash: link.searchParams.get("token_hash")!, type: "signup" };

    await carol.request().verifyCallback(params);
    expect(await carol.request().getUser()).toMatchObject({ email: "carol@example.com" });
    expect(await code(browser(db).request().verifyCallback(params))).toBe("invalid_token");

    await carol.request().signOut();
    await carol.request().signIn("carol@example.com", PASSWORD);
  });

  it("resets a password through the emailed link and signs out other devices", async () => {
    const dave = browser(db);
    await dave.request().signUp({ email: "dave@example.com", password: PASSWORD, name: "Dave" }, REDIRECT);

    const otherDevice = browser(db);
    await otherDevice.request().signIn("dave@example.com", PASSWORD);

    const resetter = browser(db);
    await resetter
      .request()
      .requestPasswordReset("dave@example.com", "http://localhost:4321/auth/callback?next=%2Fauth%2Fupdate-password");
    const link = latestLink(db);
    expect(link.searchParams.get("type")).toBe("recovery");
    await resetter.request().verifyCallback({ tokenHash: link.searchParams.get("token_hash")!, type: "recovery" });

    expect(await code(resetter.request().updatePassword(PASSWORD))).toBe("same_password");
    await resetter.request().updatePassword("New1password");

    expect(await resetter.request().getUser()).not.toBeNull();
    expect(await otherDevice.request().getUser()).toBeNull();
    expect(await code(browser(db).request().signIn("dave@example.com", PASSWORD))).toBe("invalid_credentials");
    await browser(db).request().signIn("dave@example.com", "New1password");
  });

  it("only treats a fresh session from an emailed link as a recovery session", async () => {
    let now = Date.UTC(2026, 0, 1);
    const ivy = browser(db, { now: () => now });
    await ivy.request().signUp({ email: "ivy@example.com", password: PASSWORD, name: "Ivy" }, REDIRECT);
    expect(await ivy.request().isRecoverySession()).toBe(false);

    await ivy.request().requestPasswordReset("ivy@example.com", REDIRECT);
    await ivy.request().verifyCallback({ tokenHash: latestLink(db).searchParams.get("token_hash")!, type: "recovery" });
    expect(await ivy.request().isRecoverySession()).toBe(true);

    now += 16 * 60 * 1000;
    expect(await ivy.request().isRecoverySession()).toBe(false);
    expect(await browser(db).request().isRecoverySession()).toBe(false);
  });

  it("does not reveal unknown emails on password reset", async () => {
    await browser(db).request().requestPasswordReset("ghost@example.com", REDIRECT);
    expect(db.prepare("SELECT COUNT(*) AS n FROM outbox").get()).toEqual({ n: 0 });
  });

  it("rejects expired links and expired sessions", async () => {
    let now = Date.UTC(2026, 0, 1);
    const clock = () => now;
    const erin = browser(db, { now: clock, requireEmailConfirmation: true });
    await erin.request().signUp({ email: "erin@example.com", password: PASSWORD, name: "Erin" }, REDIRECT);
    const tokenHash = latestLink(db).searchParams.get("token_hash")!;

    now += 2 * 60 * 60 * 1000; // links live 1 hour
    expect(await code(erin.request().verifyCallback({ tokenHash, type: "signup" }))).toBe("invalid_token");

    db.prepare("UPDATE users SET email_confirmed_at = 1").run();
    await erin.request().signIn("erin@example.com", PASSWORD);
    now += 8 * 24 * 60 * 60 * 1000; // sessions live 7 days
    expect(await erin.request().getUser()).toBeNull();
    expect(erin.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });

  it("renews a session that is past half of its lifetime", async () => {
    let now = Date.UTC(2026, 0, 1);
    const frank = browser(db, { now: () => now });
    await frank.request().signUp({ email: "frank@example.com", password: PASSWORD, name: "Frank" }, REDIRECT);
    const firstExpiry = frank.cookies.store.get(SESSION_COOKIE)!.options.expires!.getTime();

    now += 4 * 24 * 60 * 60 * 1000;
    expect(await frank.request().getUser()).not.toBeNull();
    expect(frank.cookies.store.get(SESSION_COOKIE)!.options.expires!.getTime()).toBeGreaterThan(firstExpiry);
  });

  it("updates the profile, verifies the password and deletes the account", async () => {
    const gina = browser(db);
    await gina.request().signUp({ email: "gina@example.com", password: PASSWORD, name: "Gina" }, REDIRECT);

    expect((await gina.request().updateProfile({ name: "Gina Smith" })).name).toBe("Gina Smith");
    expect(await gina.request().getUser()).toMatchObject({ name: "Gina Smith" });

    expect(await gina.request().verifyPassword("Wrong1password")).toBe(false);
    expect(await gina.request().verifyPassword(PASSWORD)).toBe(true);

    await gina.request().deleteAccount();
    expect(await gina.request().getUser()).toBeNull();
    expect(db.prepare("SELECT COUNT(*) AS n FROM users").get()).toEqual({ n: 0 });
    expect(db.prepare("SELECT COUNT(*) AS n FROM sessions").get()).toEqual({ n: 0 });
  });

  it("requires a session for account operations", async () => {
    const anonymous = browser(db).request();
    expect(await code(anonymous.updatePassword("New1password"))).toBe("not_authenticated");
    expect(await code(anonymous.updateProfile({ name: "X" }))).toBe("not_authenticated");
    expect(await code(anonymous.deleteAccount())).toBe("not_authenticated");
    expect(await code(anonymous.verifyPassword(PASSWORD))).toBe("not_authenticated");
  });

  it("ignores forged or unknown session cookies", async () => {
    const mallory = browser(db);
    mallory.cookies.set(SESSION_COOKIE, "forged", { path: "/" });
    expect(await mallory.request().getUser()).toBeNull();
    expect(mallory.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });

  it("lists sent emails for the dev mailbox", async () => {
    const helen = browser(db, { requireEmailConfirmation: true });
    await helen.request().signUp({ email: "helen@example.com", password: PASSWORD, name: "Helen" }, REDIRECT);
    const [email] = helen.request().readOutbox!();
    expect(email).toMatchObject({ to: "helen@example.com", subject: expect.stringContaining("Confirm") });
    expect(email!.link).toContain("token_hash=");
  });
});
