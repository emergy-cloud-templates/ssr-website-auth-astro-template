import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Correct1horse";

export interface TestUser {
  name: string;
  email: string;
  password: string;
}

export function newUser(name = "Ada Lovelace"): TestUser {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return { name, email: `user-${id}@example.com`, password: PASSWORD };
}

export async function signUp(page: Page, user: TestUser): Promise<void> {
  await page.goto("/auth/signup");
  await page.getByLabel("Full name").fill(user.name);
  await page.getByLabel("Email address").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByLabel("Confirm password").fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/dashboard");
}

export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function signOut(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");
}

/** Fails on any WCAG 2.x A/AA violation Axe can detect on the current page. */
export async function expectAccessible(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}
