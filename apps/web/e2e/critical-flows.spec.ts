import { expect, test } from "@playwright/test";
import {
  PASSWORD,
  addToBuild,
  cleanupE2eUsers,
  loginViaUi,
  promoteToAdmin,
  registerViaUi,
  signOut,
  uniqueEmail,
} from "./helpers";

test.afterAll(cleanupE2eUsers);

test.describe("register, login and logout", () => {
  test("a new user can register, is signed in, and can sign out and back in", async ({ page }) => {
    const email = uniqueEmail("auth");
    await registerViaUi(page, email);
    await expect(page.getByRole("banner")).toContainText("(USER)");

    await signOut(page);

    await loginViaUi(page, email);
    await expect(page.getByRole("banner")).toContainText(email);
  });

  test("a wrong password is rejected with an error and no session", async ({ page }) => {
    const email = uniqueEmail("badpass");
    await registerViaUi(page, email);
    await signOut(page);

    await loginViaUi(page, email, "wrong-password");
    await expect(page.locator("form")).toContainText(/invalid|incorrect|failed/i);
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
  });

  test("registering the same email twice shows an error", async ({ page }) => {
    const email = uniqueEmail("dup");
    await registerViaUi(page, email);
    await signOut(page);

    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.locator("form button[type=submit]").click();
    await expect(page.locator("form")).toContainText(/already exists/i);
  });
});

test.describe("access control", () => {
  test("logged-out visitors are sent to log in for /admin and /builds", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/builds");
    await expect(page).toHaveURL(/\/login/);
  });

  test("a regular user is bounced from /admin; an admin can open it", async ({ page }) => {
    const email = uniqueEmail("role");
    await registerViaUi(page, email);
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin/);
    await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);

    // Roles are signed into the JWT at login, so promote then log in again.
    await promoteToAdmin(email);
    await signOut(page);
    await loginViaUi(page, email);
    await expect(page.getByRole("banner")).toContainText("(ADMIN)");

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Inventory Admin" })).toBeVisible();
    await expect(page.getByText("Total components")).toBeVisible();
  });
});

test.describe("the build workspace", () => {
  test("adding parts shows them in the build with a live summary and power estimate", async ({ page }) => {
    await page.goto("/workspace");
    await addToBuild(page, "PC Case", "H510");
    await addToBuild(page, "Motherboard", "ROG STRIX");

    await expect(page.getByText("Your build")).toBeVisible();
    await expect(page.getByText("● placed")).toHaveCount(2); // case + auto-placed motherboard
    await expect(page.getByText("Build summary").first()).toBeVisible();
    await expect(page.getByText("$318.00").first()).toBeVisible(); // 89 + 229
    await expect(page.getByText("No problems")).toBeVisible();
  });

  test("an incompatible pair shows a compatibility ERROR", async ({ page }) => {
    await page.goto("/workspace");
    await addToBuild(page, "CPU", "7800X3D"); // AM5
    await addToBuild(page, "Motherboard", "MAG B760M"); // LGA1700

    await expect(page.getByText("ERROR", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/socket/i).first()).toBeVisible();
  });

  test("a guest is told to log in when saving", async ({ page }) => {
    await page.goto("/workspace");
    await addToBuild(page, "PC Case", "H510");
    await page.getByRole("button", { name: "Save build" }).click();
    await expect(page.getByText("Log in to save builds.")).toBeVisible();
  });

  test("fans show up in the airflow panel and estimates appear for a full build", async ({ page }) => {
    await page.goto("/workspace");
    await addToBuild(page, "PC Case", "H510");
    await addToBuild(page, "Cooling Fan", "NF-A12x25");
    await expect(page.getByText("intake")).toBeVisible(); // first mount is the front, so a normal fan intakes
    await expect(page.getByText(/positive pressure/i)).toBeVisible();
    await expect(page.getByText("Rough estimates from component specs")).toBeVisible();
  });
});

test.describe("saved builds", () => {
  test("save, list, reopen, rename, duplicate and delete a build", async ({ page }) => {
    await registerViaUi(page, uniqueEmail("builds"));

    await page.goto("/workspace");
    await page.getByLabel("Build name").fill("E2E build");
    await addToBuild(page, "PC Case", "H510");
    await addToBuild(page, "Motherboard", "ROG STRIX");
    await page.getByRole("button", { name: "Save build" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();

    // It's listed on /builds...
    await page.goto("/builds");
    await expect(page.getByRole("link", { name: "E2E build" })).toBeVisible();
    await expect(page.getByText("2 component(s)")).toBeVisible();

    // ...and reopening restores the parts, the placements and the name.
    await page.getByRole("link", { name: "E2E build" }).click();
    await expect(page.getByLabel("Build name")).toHaveValue("E2E build");
    await expect(page.getByText("H510")).toBeVisible();
    await expect(page.getByText("ROG STRIX B650-A GAMING WIFI").first()).toBeVisible();
    await expect(page.getByText("● placed")).toHaveCount(2);

    // Rename, duplicate, delete.
    await page.goto("/builds");
    page.once("dialog", (dialog) => dialog.accept("Renamed build"));
    await page.getByRole("button", { name: "Rename" }).click();
    await expect(page.getByRole("link", { name: "Renamed build" })).toBeVisible();

    await page.getByRole("button", { name: "Duplicate" }).click();
    await expect(page.getByRole("link", { name: "Renamed build (copy)" })).toBeVisible();

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete" }).first().click();
    await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(1); // wait for the list to refresh
    await page.getByRole("button", { name: "Delete" }).first().click();
    await expect(page.getByText("No saved builds yet.")).toBeVisible();
  });

  test("another user cannot open my build", async ({ page, browser }) => {
    await registerViaUi(page, uniqueEmail("owner"));
    await page.goto("/workspace");
    await addToBuild(page, "PC Case", "H510");
    await page.getByRole("button", { name: "Save build" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    const buildId = await page.evaluate(async () => (await (await fetch("/api/builds")).json()).data[0].id);

    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await registerViaUi(otherPage, uniqueEmail("stranger"));
    const response = await otherPage.request.get(`/api/builds/${buildId}`);
    expect(response.status()).toBe(404);
    await other.close();
  });
});

test.describe("sharing", () => {
  test("a shared build is viewable read-only by anyone and dies when sharing stops", async ({ page, browser }) => {
    await registerViaUi(page, uniqueEmail("sharer"));
    await page.goto("/workspace");
    await page.getByLabel("Build name").fill("Shared build");
    await addToBuild(page, "PC Case", "H510");
    await page.getByRole("button", { name: "Save build" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();

    await page.getByRole("button", { name: "Share" }).click();
    await expect(page.getByRole("button", { name: "Copy share link" })).toBeVisible();
    const slug = await page.evaluate(async () => {
      const list = await (await fetch("/api/builds")).json();
      return (await (await fetch(`/api/builds/${list.data[0].id}`)).json()).data.shareSlug as string;
    });
    expect(slug).toBeTruthy();

    // A logged-out visitor sees the build but none of the editing controls.
    const visitor = await browser.newContext();
    const visitorPage = await visitor.newPage();
    await visitorPage.goto(`/shared/${slug}`);
    await expect(visitorPage.getByRole("heading", { name: "Shared build" })).toBeVisible();
    await expect(visitorPage.getByText("H510")).toBeVisible();
    await expect(visitorPage.getByText("Build summary")).toBeVisible();
    await expect(visitorPage.getByRole("button", { name: /Save/ })).toHaveCount(0);
    await expect(visitorPage.getByRole("button", { name: "Add to build" })).toHaveCount(0);

    // Stop sharing: the old link stops working.
    await page.getByRole("button", { name: "Stop sharing" }).click();
    await expect(page.getByRole("button", { name: "Share", exact: true })).toBeVisible();
    const gone = await visitorPage.goto(`/shared/${slug}`);
    expect(gone?.status()).toBe(404);
    await visitor.close();
  });

  test("an unknown share link is a 404", async ({ page }) => {
    const response = await page.goto("/shared/definitely-not-a-real-slug");
    expect(response?.status()).toBe(404);
  });
});
