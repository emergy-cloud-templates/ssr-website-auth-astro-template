import { expect, test } from "@playwright/test";

import { expectAccessible, newUser, signIn, signOut, signUp } from "./fixtures";

test("public pages render and protected pages require a session", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome to");
  await expectAccessible(page);

  await page.goto("/dashboard");
  await expect(page).toHaveURL("/auth/signin?redirectTo=%2Fdashboard");
  await expectAccessible(page);

  const missing = await page.goto("/no-such-page");
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("sign up, sign out, then sign back in to the page that was requested", async ({ page }) => {
  const user = newUser();
  await signUp(page, user);
  await expect(page.getByRole("heading", { name: `Welcome back, ${user.name}!` })).toBeVisible();
  await expectAccessible(page);

  await signOut(page);
  await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();

  await page.goto("/account");
  await expect(page).toHaveURL(/\/auth\/signin\?redirectTo=%2Faccount$/);
  await signIn(page, user.email, user.password);
  await expect(page).toHaveURL("/account");

  // Signed-in users skip the guest-only pages.
  await page.goto("/auth/signin");
  await expect(page).toHaveURL("/dashboard");

  // Without a fresh reset link, the password changes in account settings
  // (which asks for the current one), not on the reset page.
  await page.goto("/auth/update-password");
  await expect(page).toHaveURL("/account");
});

test("rejects bad credentials and weak passwords with clear messages", async ({ page }) => {
  await page.goto("/auth/signin");
  await signIn(page, "nobody@example.com", "Wrong1password");
  await expect(page.getByRole("alert")).toHaveText("Invalid email or password.");

  await page.goto("/auth/signup");
  await page.getByLabel("Full name").fill("Weak Password");
  await page.getByLabel("Email address").fill(newUser().email);
  await page.getByLabel("Password", { exact: true }).fill("weakpass");
  await page.getByLabel("Confirm password").fill("weakpass");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("alert")).toContainText("uppercase");
  await expectAccessible(page);
});

test("resets a forgotten password through the emailed link", async ({ page }) => {
  const user = newUser("Grace Hopper");
  await signUp(page, user);
  await signOut(page);

  await page.goto("/auth/reset-password");
  await page.getByLabel("Email address").fill(user.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("If an account exists");

  await page.goto("/dev/mailbox");
  const email = page.getByRole("listitem").filter({ hasText: user.email }).first();
  await expect(email).toContainText("Reset your");
  await email.getByRole("link", { name: "Open link" }).click();
  await expect(page).toHaveURL("/auth/update-password");

  const newPassword = "Brand1newpass";
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password").fill(newPassword);
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByRole("status")).toHaveText("Your password has been updated.");

  // The link is single use.
  await page.context().clearCookies();
  await page.goto("/dev/mailbox");
  await page
    .getByRole("listitem")
    .filter({ hasText: user.email })
    .first()
    .getByRole("link", { name: "Open link" })
    .click();
  await expect(page).toHaveURL("/auth/signin?error=link_expired");
  await expect(page.getByRole("status")).toContainText("invalid or has expired");

  await signIn(page, user.email, user.password);
  await expect(page.getByRole("alert")).toHaveText("Invalid email or password.");
  await signIn(page, user.email, newPassword);
  await expect(page).toHaveURL("/dashboard");
});

test("manages the profile, password and account deletion", async ({ page }) => {
  const user = newUser("Alan Turing");
  await signUp(page, user);
  await page.goto("/account");
  await expectAccessible(page);

  await page.getByLabel("Full name").fill("Alan M. Turing");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Profile updated.");
  await page.reload();
  await expect(page.getByLabel("Full name")).toHaveValue("Alan M. Turing");

  const changed = "Changed1password";
  await page.getByLabel("Current password").fill("Wrong1password");
  await page.getByLabel("New password", { exact: true }).fill(changed);
  await page.getByLabel("Confirm new password").fill(changed);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByRole("alert")).toHaveText("Current password is incorrect.");

  await page.getByLabel("Current password").fill(user.password);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByRole("status")).toHaveText("Password changed.");

  await page.getByRole("button", { name: "Delete account" }).click();
  await page.getByLabel('Type "DELETE" to confirm').fill("DELETE");
  await page.getByLabel("Your password").fill(changed);
  await page.getByRole("button", { name: "Permanently delete" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/auth/signin");
  await signIn(page, user.email, changed);
  await expect(page.getByRole("alert")).toHaveText("Invalid email or password.");
});

test("the dashboard navigation works on every screen size", async ({ page, isMobile }) => {
  await signUp(page, newUser());

  if (isMobile) {
    await page.getByRole("button", { name: "Open navigation" }).click();
  }
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL("/account");
  await expect(page.getByRole("heading", { name: "Account settings", level: 1 })).toBeVisible();

  if (!isMobile) {
    // The collapsed state survives a reload (cookie read on the server).
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
  }
});
