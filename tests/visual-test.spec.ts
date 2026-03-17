/**
 * Visual smoke test for the Context Collector popup and options pages.
 *
 * Opens each HTML file directly (not as a Chrome extension) to verify:
 * - Markup renders without errors
 * - Styles are applied correctly
 * - All views (onboarding, idle, extracting, complete, error) display properly
 *
 * Run: npx playwright test tests/visual-test.ts
 */
import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const POPUP_URL = "/src/popup/index.html";
const OPTIONS_URL = "/src/options/index.html";
const SCREENSHOTS_DIR = path.resolve(__dirname, "../screenshots");

test.describe("Popup UI", () => {
  test("renders popup page without JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(POPUP_URL);
    await page.waitForLoadState("domcontentloaded");

    // The popup might show onboarding or idle view.
    // Since chrome.storage isn't available outside an extension,
    // we expect either to be visible. Let's force idle view visible for testing.
    await page.evaluate(() => {
      // Hide all views
      document.querySelectorAll("section").forEach((s) => s.classList.add("hidden"));
      // Show idle view
      document.getElementById("view-idle")?.classList.remove("hidden");
    });

    await page.setViewportSize({ width: 380, height: 600 });
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/popup-idle.png`,
      fullPage: true,
    });

    // Verify core elements are present
    await expect(page.locator("header h1")).toHaveText("Context Collector");
    await expect(page.locator('[data-platform="whatsapp"]')).toBeVisible();
    await expect(page.locator('[data-platform="gmail"]')).toBeVisible();
    await expect(page.locator("#btn-extract")).toBeVisible();
    await expect(page.locator("#btn-extract")).toHaveText("Extract Context");

    // Check no JS errors (except chrome API missing -- expected outside extension)
    const realErrors = errors.filter((e) => !e.includes("chrome"));
    expect(realErrors).toHaveLength(0);
  });

  test("renders onboarding view", async ({ page }) => {
    await page.goto(POPUP_URL);
    await page.waitForLoadState("domcontentloaded");

    await page.evaluate(() => {
      document.querySelectorAll("section").forEach((s) => s.classList.add("hidden"));
      document.getElementById("view-onboarding")?.classList.remove("hidden");
    });

    await page.setViewportSize({ width: 380, height: 600 });
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/popup-onboarding-step1.png`,
      fullPage: true,
    });

    await expect(page.locator('.onboarding-step[data-step="1"] h2')).toHaveText(
      "Context Collector"
    );
    await expect(page.locator("#btn-onboarding-next")).toHaveText("Get Started");
  });

  test("renders onboarding step 2 (privacy)", async ({ page }) => {
    await page.goto(POPUP_URL);
    await page.waitForLoadState("domcontentloaded");

    await page.evaluate(() => {
      document.querySelectorAll("section").forEach((s) => s.classList.add("hidden"));
      document.getElementById("view-onboarding")?.classList.remove("hidden");
      // Show step 2
      document.querySelectorAll(".onboarding-step").forEach((s) => s.classList.add("hidden"));
      document.querySelector('.onboarding-step[data-step="2"]')?.classList.remove("hidden");
    });

    await page.setViewportSize({ width: 380, height: 600 });
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/popup-onboarding-step2.png`,
      fullPage: true,
    });

    await expect(page.locator('.onboarding-step[data-step="2"] h2')).toHaveText(
      "Your data stays local"
    );
  });

  test("renders onboarding step 3 (how it works)", async ({ page }) => {
    await page.goto(POPUP_URL);
    await page.waitForLoadState("domcontentloaded");

    await page.evaluate(() => {
      document.querySelectorAll("section").forEach((s) => s.classList.add("hidden"));
      document.getElementById("view-onboarding")?.classList.remove("hidden");
      document.querySelectorAll(".onboarding-step").forEach((s) => s.classList.add("hidden"));
      document.querySelector('.onboarding-step[data-step="3"]')?.classList.remove("hidden");
    });

    await page.setViewportSize({ width: 380, height: 600 });
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/popup-onboarding-step3.png`,
      fullPage: true,
    });

    await expect(page.locator('.onboarding-step[data-step="3"] h2')).toHaveText(
      "How it works"
    );
  });

  test("renders extracting view with mock progress", async ({ page }) => {
    await page.goto(POPUP_URL);
    await page.waitForLoadState("domcontentloaded");

    await page.evaluate(() => {
      document.querySelectorAll("section").forEach((s) => s.classList.add("hidden"));
      document.getElementById("view-extracting")?.classList.remove("hidden");

      // Add mock progress cards
      const container = document.getElementById("platform-progress");
      if (container) {
        container.innerHTML = `
          <div class="progress-card">
            <div class="flex items-center justify-between mb-1">
              <span class="platform-name">WhatsApp</span>
              <span class="platform-status"><span style="color:#22C55E">✓</span> 204 messages</span>
            </div>
            <div class="progress-track"><div class="progress-fill" style="width:100%"></div></div>
          </div>
          <div class="progress-card">
            <div class="flex items-center justify-between mb-1">
              <span class="platform-name">Gmail</span>
              <span class="platform-status">4/23 threads - Project Alpha</span>
            </div>
            <div class="progress-track"><div class="progress-fill" style="width:17%"></div></div>
          </div>
        `;
      }

      const overallBar = document.getElementById("overall-bar");
      if (overallBar) overallBar.style.width = "39%";
      const overallLabel = document.getElementById("overall-label");
      if (overallLabel) overallLabel.textContent = "Overall: 134 of ~342 msgs";
      const overallPct = document.getElementById("overall-pct");
      if (overallPct) overallPct.textContent = "39%";
      const elapsed = document.getElementById("elapsed-time");
      if (elapsed) elapsed.textContent = "Elapsed: 0:42";
    });

    await page.setViewportSize({ width: 380, height: 600 });
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/popup-extracting.png`,
      fullPage: true,
    });

    await expect(page.locator("#btn-cancel")).toBeVisible();
  });

  test("renders complete view with results", async ({ page }) => {
    await page.goto(POPUP_URL);
    await page.waitForLoadState("domcontentloaded");

    await page.evaluate(() => {
      document.querySelectorAll("section").forEach((s) => s.classList.add("hidden"));
      document.getElementById("view-complete")?.classList.remove("hidden");

      const summary = document.getElementById("results-summary");
      if (summary) {
        summary.innerHTML = `
          <div style="font-family:monospace;font-size:12px;color:#9CA3AF">342 messages extracted</div>
          <div style="font-family:monospace;font-size:12px;color:#9CA3AF">from 12 conversations</div>
          <div style="font-family:monospace;font-size:12px;color:#9CA3AF">across 2 platforms</div>
          <div style="border-top:1px solid #1F2937;margin-top:8px;padding-top:8px">
            <div style="font-size:12px;color:#9CA3AF">WhatsApp: 8 chats · 204 msg</div>
            <div style="font-size:12px;color:#9CA3AF">Gmail: 4 threads · 138 msg</div>
          </div>
        `;
      }
    });

    await page.setViewportSize({ width: 380, height: 600 });
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/popup-complete.png`,
      fullPage: true,
    });

    await expect(page.locator("#btn-download")).toBeVisible();
    await expect(page.locator("#btn-download")).toHaveText("Download ZIP");
  });

  test("renders error view", async ({ page }) => {
    await page.goto(POPUP_URL);
    await page.waitForLoadState("domcontentloaded");

    await page.evaluate(() => {
      document.querySelectorAll("section").forEach((s) => s.classList.add("hidden"));
      document.getElementById("view-error")?.classList.remove("hidden");

      const details = document.getElementById("error-details");
      if (details) {
        details.innerHTML = `
          <div style="color:#F59E0B;font-size:12px"><strong>Gmail:</strong> Not logged in. Please open mail.google.com and sign in.</div>
          <div style="color:#22C55E;font-size:12px"><strong>WhatsApp:</strong> 204 messages (OK)</div>
        `;
      }
    });

    await page.setViewportSize({ width: 380, height: 600 });
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/popup-error.png`,
      fullPage: true,
    });

    await expect(page.locator("#btn-download-partial")).toBeVisible();
    await expect(page.locator("#btn-retry")).toBeVisible();
  });
});

test.describe("Options Page", () => {
  test("renders settings page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(OPTIONS_URL);
    await page.waitForLoadState("domcontentloaded");

    await page.setViewportSize({ width: 800, height: 900 });
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/options-page.png`,
      fullPage: true,
    });

    await expect(page.locator("h1")).toHaveText("Context Collector Settings");
    await expect(page.locator("#opt-date-range")).toBeVisible();
    await expect(page.locator("#btn-reset-onboarding")).toBeVisible();

    // Check no JS errors (except chrome API missing)
    const realErrors = errors.filter((e) => !e.includes("chrome"));
    expect(realErrors).toHaveLength(0);
  });
});
