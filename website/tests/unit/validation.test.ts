import { describe, expect, it } from "vitest";

import {
  normalizeEmail,
  safeRedirectPath,
  sanitizeName,
  validateEmail,
  validateName,
  validatePassword,
} from "~/lib/validation";

describe("validateEmail", () => {
  it.each(["user@example.com", "first.last+tag@sub.example.co"])("accepts %s", (email) => {
    expect(validateEmail(email)).toBeNull();
  });

  it.each(["", "plain", "a@b", "a b@example.com", `${"a".repeat(250)}@example.com`])("rejects %j", (email) => {
    expect(validateEmail(email)).not.toBeNull();
  });

  it("normalizes case and whitespace", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
  });
});

describe("validatePassword", () => {
  it("accepts a strong password", () => {
    expect(validatePassword("Correct1horse")).toBeNull();
  });

  it.each([
    ["", "required"],
    ["Sh0rt", "at least 8"],
    ["alllowercase1", "uppercase"],
    ["ALLUPPERCASE1", "lowercase"],
    ["NoDigitsHere", "number"],
    [`Aa1${"x".repeat(70)}`, "at most 72"],
  ])("rejects %j (%s)", (password, reason) => {
    expect(validatePassword(password)).toContain(reason);
  });

  it("counts bytes, not characters, for the bcrypt limit", () => {
    expect(validatePassword(`Aa1${"é".repeat(35)}`)).toContain("at most 72");
  });
});

describe("names", () => {
  it("trims, collapses whitespace and strips control characters", () => {
    expect(sanitizeName("  Ada \t\n Lovelace\u0000 ")).toBe("Ada Lovelace");
  });

  it("caps the length", () => {
    expect(sanitizeName("x".repeat(500))).toHaveLength(100);
  });

  it("requires at least two characters", () => {
    expect(validateName("A")).not.toBeNull();
    expect(validateName("Al")).toBeNull();
  });
});

describe("safeRedirectPath", () => {
  it.each(["/dashboard", "/account?tab=security", "/a/b#c"])("keeps same-site path %s", (path) => {
    expect(safeRedirectPath(path, "/fallback")).toBe(path);
  });

  it.each([
    null,
    "",
    "dashboard",
    "//evil.com",
    "/\\evil.com",
    "https://evil.com/x",
    "javascript:alert(1)",
    // Dot segments and control characters that URL parsing turns into "//host"
    "/.//evil.com",
    "/..//evil.com",
    "/a/..//evil.com",
    "/%2e//evil.com",
    "/./\\evil.com",
    "/\t/evil.com",
  ])("falls back for %j", (path) => {
    expect(safeRedirectPath(path, "/fallback")).toBe("/fallback");
  });
});
