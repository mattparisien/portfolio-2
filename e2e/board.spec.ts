import { test, expect, type Page } from "@playwright/test";

// ── helpers ────────────────────────────────────────────────────────────────
/** Navigate to / without the consent cookie so the consent screen is shown. */
async function visitFreshUser(page: Page) {
  await page.context().clearCookies();
  await page.goto("/");
}

/** Navigate to / with the consent cookie already set (returning user). */
async function visitReturningUser(page: Page) {
  await page.context().addCookies([
    { name: "crumb_consented", value: "true", url: "http://localhost:3000" },
  ]);
  await page.goto("/");
}

// ============================================================================
// Consent screen
// ============================================================================
test.describe("Consent screen", () => {
  test("shows the consent screen for a first-time visitor", async ({ page }) => {
    await visitFreshUser(page);
    await expect(page.getByRole("button", { name: /i agree/i })).toBeVisible();
  });

  test("consent screen contains the community guidelines text", async ({ page }) => {
    await visitFreshUser(page);
    await expect(page.getByText(/queer community/i)).toBeVisible();
  });

  test("clicking 'I Agree' hides the consent screen", async ({ page }) => {
    await visitFreshUser(page);
    await page.getByRole("button", { name: /i agree/i }).click();
    await expect(page.getByRole("button", { name: /i agree/i })).not.toBeVisible({ timeout: 5_000 });
  });

  test("clicking 'I Agree' sets the crumb_consented cookie", async ({ page }) => {
    await visitFreshUser(page);
    await page.getByRole("button", { name: /i agree/i }).click();
    const cookies = await page.context().cookies();
    const consent = cookies.find((c) => c.name === "crumb_consented");
    expect(consent?.value).toBe("true");
  });

  test("does NOT show the consent screen when the cookie is already set", async ({ page }) => {
    await visitReturningUser(page);
    await expect(page.getByRole("button", { name: /i agree/i })).not.toBeVisible();
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
