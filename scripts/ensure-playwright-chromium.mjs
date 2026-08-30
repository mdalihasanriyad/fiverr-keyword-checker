// Ensures Playwright's bundled Chromium is installed before E2E tests run.
// Skipped when PLAYWRIGHT_CHROMIUM_PATH points at a system Chromium (CI/sandbox).
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

if (process.env.PLAYWRIGHT_CHROMIUM_PATH) {
  if (existsSync(process.env.PLAYWRIGHT_CHROMIUM_PATH)) {
    console.log("[pretest:e2e] Using system Chromium at PLAYWRIGHT_CHROMIUM_PATH; skipping install.");
  } else {
    console.warn("[pretest:e2e] PLAYWRIGHT_CHROMIUM_PATH is set but the file does not exist; installing Playwright Chromium anyway.");
    install();
  }
} else {
  install();
}

function install() {
  console.log("[pretest:e2e] Ensuring Playwright Chromium is installed...");
  execSync("npx playwright install chromium", { stdio: "inherit" });
}
