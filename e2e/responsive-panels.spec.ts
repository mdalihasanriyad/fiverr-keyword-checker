import { test, expect, type Page } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile-small", width: 360, height: 800, stacked: true },
  { name: "mobile", width: 390, height: 844, stacked: true },
  { name: "tablet", width: 820, height: 1180, stacked: true },
  { name: "laptop", width: 1280, height: 900, stacked: false },
  { name: "desktop", width: 1440, height: 900, stacked: false },
  { name: "wide", width: 1920, height: 1080, stacked: false },
] as const;

async function boxes(page: Page) {
  const grid = page.getByTestId("main-grid");
  const input = page.getByTestId("input-panel");
  const preview = page.getByTestId("preview-panel");
  await expect(grid).toBeVisible();
  await expect(input).toBeVisible();
  await expect(preview).toBeVisible();
  const [g, i, p] = await Promise.all([
    grid.boundingBox(),
    input.boundingBox(),
    preview.boundingBox(),
  ]);
  if (!g || !i || !p) throw new Error("panel bounding boxes unavailable");
  return { g, i, p };
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test.beforeEach(async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
    });

    test("both panels render with the expected layout", async ({ page }) => {
      const { g, i, p } = await boxes(page);

      if (vp.stacked) {
        // stacked: same left edge, full grid width, preview below input
        expect(Math.abs(i.x - p.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(i.width - g.width)).toBeLessThanOrEqual(1);
        expect(Math.abs(p.width - g.width)).toBeLessThanOrEqual(1);
        expect(p.y).toBeGreaterThan(i.y + i.height - 1);
      } else {
        // side by side: equal widths, aligned tops, no leftover column
        expect(Math.abs(i.width - p.width)).toBeLessThanOrEqual(2);
        expect(Math.abs(i.y - p.y)).toBeLessThanOrEqual(2);
        expect(p.x).toBeGreaterThan(i.x + i.width - 1);
        const gap = p.x - (i.x + i.width);
        expect(gap).toBeGreaterThanOrEqual(0);
        expect(gap).toBeLessThanOrEqual(40);
        // panels + gap consume the full grid width (no hidden third column)
        expect(Math.abs(i.width + gap + p.width - g.width)).toBeLessThanOrEqual(2);
        expect(i.width / g.width).toBeGreaterThan(0.45);
      }
    });

    test("no horizontal overflow and panels stay inside the viewport", async ({ page }) => {
      const { i, p } = await boxes(page);
      expect(i.x).toBeGreaterThanOrEqual(0);
      expect(p.x + p.width).toBeLessThanOrEqual(vp.width + 1);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });

    test("no leftover translation panel or empty column", async ({ page }) => {
      await expect(page.getByText("Bangla Translator")).toHaveCount(0);
      const children = await page.getByTestId("main-grid").evaluate(
        (el) => el.children.length,
      );
      expect(children).toBe(2);
    });
  });
}

test.describe("resize behaviour", () => {
  test("switches from stacked to side-by-side at the lg breakpoint", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    let { i, p } = await boxes(page);
    expect(p.y).toBeGreaterThan(i.y + i.height - 1);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(200);
    ({ i, p } = await boxes(page));
    expect(Math.abs(i.y - p.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(i.width - p.width)).toBeLessThanOrEqual(2);
  });
});
