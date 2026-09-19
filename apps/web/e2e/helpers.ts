import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { prisma } from "@pcbuilder/database";

export const E2E_PREFIX = "e2e";
export const PASSWORD = "password123";

export function uniqueEmail(label: string) {
  return `${E2E_PREFIX}-${label}-${randomUUID().slice(0, 8)}@test.local`;
}

export async function registerViaUi(page: Page, email: string, password = PASSWORD) {
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.locator("form button[type=submit]").click();
  // Registration signs the user in and lands on the home page with their email in the nav.
  await expect(page.getByRole("banner")).toContainText(email);
}

export async function loginViaUi(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.locator("form button[type=submit]").click();
}

// Waits for the sign-out to actually finish (the nav flips back to "Log in")
// before returning, so the next navigation can't race it and get aborted.
export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
}

export async function promoteToAdmin(email: string) {
  await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
}

// Picks a category in the workspace, selects a component by model text, and
// adds it to the build.
export async function addToBuild(page: Page, category: string, modelText: string) {
  await page.getByRole("button", { name: category, exact: true }).click();
  await page.getByText(modelText).first().click();
  await page.getByRole("button", { name: "Add to build" }).click();
  await expect(page.getByRole("list").filter({ hasText: modelText }).first()).toBeVisible();
}

export async function cleanupE2eUsers() {
  await prisma.user.deleteMany({ where: { email: { startsWith: `${E2E_PREFIX}-` } } });
}
