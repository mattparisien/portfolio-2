import { test, expect, type Page } from "@playwright/test";

const CONSENT_STORAGE_KEY = "crumb_cookie_consent";

// ── helpers ────────────────────────────────────────────────────────────────
/**
 * Navigate to / without consent so the banner is shown.
 * The addInitScript removes any persisted key for environments that respect it.
 */
async function visitFreshUser(page: Page) {
  await page.addInitScript((key) => localStorage.removeItem(key), CONSENT_STORAGE_KEY);
  await page.goto("/");
}

/**
 * Navigate to / and ensure the consent banner is not blocking the board.
 *
 * In production the `crumb_cookie_consent` localStorage key suppresses the
 * banner — we seed it via addInitScript.  In development, the env variable
 * NEXT_PUBLIC_PERSIST_COOKIE_CONSENT=true forces the banner on every load
 * (ignoring localStorage).  We handle both by clicking "Accept all" if the
 * button happens to be visible after navigation.
 */
async function visitReturningUser(page: Page) {
  // Seed localStorage for environments that respect it.
  await page.addInitScript(
    ([key, value]: string[]) => localStorage.setItem(key, value),
    [CONSENT_STORAGE_KEY, "1"],
  );
  await page.goto("/");
  // In debug/persist mode the banner is always rendered — dismiss it.
  const acceptBtn = page.getByRole("button", { name: /accept all/i });
  const isVisible = await acceptBtn.isVisible().catch(() => false);
  if (isVisible) {
    await acceptBtn.click();
    await expect(acceptBtn).not.toBeVisible({ timeout: 5_000 });
  }
}

// ============================================================================
// Consent screen
// ============================================================================
test.describe("Consent screen", () => {
  test("shows the consent screen for a first-time visitor", async ({ page }) => {
    await visitFreshUser(page);
    await expect(page.getByRole("button", { name: /accept all/i })).toBeVisible();
  });

  test("consent screen contains cookie policy text", async ({ page }) => {
    await visitFreshUser(page);
    await expect(page.getByText(/cookies help us improve/i)).toBeVisible();
  });

  test("clicking 'Accept all' hides the consent screen", async ({ page }) => {
    await visitFreshUser(page);
    await page.getByRole("button", { name: /accept all/i }).click();
    await expect(page.getByRole("button", { name: /accept all/i })).not.toBeVisible({ timeout: 5_000 });
  });

  test("accepting consent makes the drawing tools accessible", async ({ page }) => {
    await visitFreshUser(page);
    await page.getByRole("button", { name: /accept all/i }).click();
    await expect(page.getByRole("button", { name: "Select" })).toBeVisible({ timeout: 10_000 });
  });

  test("board is accessible for a returning user without re-consenting", async ({ page }) => {
    await visitReturningUser(page);
    await expect(page.getByRole("button", { name: "Select" })).toBeVisible({ timeout: 10_000 });
  });
});

// ============================================================================
// Drawing board renders
// ============================================================================
test.describe("Drawing board", () => {
  test.beforeEach(async ({ page }) => {
    await visitReturningUser(page);
  });

  test("renders a <canvas> element", async ({ page }) => {
    // Fabric.js creates an upper + lower canvas; at least one must be present
    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 10_000 });
  });

  test("renders the CRUMB logo in the header", async ({ page }) => {
    // BoardHeader contains an SVG with data-name="Layer 1"
    await expect(page.locator('svg[data-name="Layer 1"]')).toBeVisible({ timeout: 10_000 });
  });

  test("renders the drawing tools panel", async ({ page }) => {
    // At least one toolbar button must be present (e.g. Select, Pencil, Eraser)
    await expect(page.getByRole("button", { name: "Select" })).toBeVisible({ timeout: 10_000 });
  });
});

// ============================================================================
// Toolbar — tool buttons
// ============================================================================
test.describe("Toolbar tools", () => {
  test.beforeEach(async ({ page }) => {
    await visitReturningUser(page);
    // Wait for the board to be interactive
    await page.getByRole("button", { name: "Select" }).waitFor({ timeout: 10_000 });
  });

  test("Pencil button is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Pencil" })).toBeVisible();
  });

  test("Eraser button is visible inside the draw tools popover", async ({ page }) => {
    // Eraser is nested in the DrawToolGroup popover — open it first
    await page.getByRole("button", { name: "Drawing tools" }).click();
    await expect(page.getByRole("button", { name: "Eraser" })).toBeVisible();
  });

  test("clicking the Pencil button keeps the canvas interactive", async ({ page }) => {
    await page.getByRole("button", { name: "Pencil" }).click();
    // After clicking Pencil the canvas should still be present
    await expect(page.locator("canvas").first()).toBeVisible();
  });

  test("clicking the Eraser button keeps the canvas interactive", async ({ page }) => {
    await page.getByRole("button", { name: "Drawing tools" }).click();
    await page.getByRole("button", { name: "Eraser" }).click();
    await expect(page.locator("canvas").first()).toBeVisible();
  });

  test("clicking the Select button keeps the canvas interactive", async ({ page }) => {
    await page.getByRole("button", { name: "Select" }).click();
    await expect(page.locator("canvas").first()).toBeVisible();
  });
});

// ============================================================================
// Canvas — basic interaction smoke test
// ============================================================================
test.describe("Canvas interaction", () => {
  test.beforeEach(async ({ page }) => {
    await visitReturningUser(page);
    await page.getByRole("button", { name: "Select" }).waitFor({ timeout: 10_000 });
  });

  test("canvas accepts pointer events without throwing", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    // Switch to pencil and draw a short stroke — no uncaught errors expected
    await page.getByRole("button", { name: "Pencil" }).click();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 30, cy + 20, { steps: 5 });
    await page.mouse.up();

    // Canvas must still be in the DOM after drawing
    await expect(canvas).toBeVisible();
  });

  test("page has no uncaught JS errors during basic interaction", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const canvas = page.locator("canvas").first();
    await canvas.waitFor({ timeout: 10_000 });

    // Click around and switch tools
    await page.getByRole("button", { name: "Pencil" }).click();
    await page.getByRole("button", { name: "Select" }).click();
    // Eraser is in the draw tools popover
    await page.getByRole("button", { name: "Drawing tools" }).click();
    await page.getByRole("button", { name: "Eraser" }).click();

    // Filter out known non-fatal third-party warnings
    const fatal = errors.filter(
      (e) => !e.includes("Liveblocks") && !e.includes("ResizeObserver")
    );
    expect(fatal).toHaveLength(0);
  });
});
