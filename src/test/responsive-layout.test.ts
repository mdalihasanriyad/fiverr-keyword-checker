import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const indexSrc = readFileSync(
  path.resolve(__dirname, "../pages/Index.tsx"),
  "utf-8",
);

/** All className="..." strings in the file, in source order. */
const classNames = Array.from(
  indexSrc.matchAll(/className="([^"]+)"/g),
  (m) => m[1],
);

const mainGrid = classNames.find(
  (c) => c.includes("grid-cols-1") && c.includes("lg:grid-cols-2"),
);

describe("Index responsive panel layout", () => {
  it("uses a single main grid that is 1 column on mobile and 2 columns on large screens", () => {
    expect(mainGrid).toBeDefined();
    expect(mainGrid).toMatch(/\bgrid\b/);
    expect(mainGrid).toMatch(/\bgrid-cols-1\b/);
    expect(mainGrid).toMatch(/\blg:grid-cols-2\b/);
  });

  it("never renders a 3-column panel grid (leftover translation column)", () => {
    expect(indexSrc).not.toMatch(/grid-cols-3/);
  });

  it("keeps a responsive gap between the stacked panels on mobile", () => {
    expect(mainGrid).toMatch(/gap-4/);
    expect(mainGrid).toMatch(/sm:gap-6/);
  });

  it("renders exactly two panels (input + preview) inside the main grid", () => {
    const start = indexSrc.indexOf(mainGrid!);
    const grid = indexSrc.slice(start);
    expect(grid).toContain("Paste your Fiverr message");
    expect(grid).toContain("Preview with Highlights");
  });

  it("does not mount the removed translator panels", () => {
    expect(indexSrc).not.toMatch(/InlineTranslator/);
    expect(indexSrc).not.toMatch(/TranslatorPanel/);
  });

  it("does not force fixed pixel widths on the panels (so each takes 50%)", () => {
    const start = indexSrc.indexOf(mainGrid!);
    const grid = indexSrc.slice(start, start + 6000);
    expect(grid).not.toMatch(/\bw-\[\d+px\]/);
    expect(grid).not.toMatch(/\blg:w-1\/3\b/);
  });

  it("caps the page container at the agreed 1500px max width", () => {
    expect(indexSrc).toMatch(/max-w-\[1500px\]/);
  });
});
