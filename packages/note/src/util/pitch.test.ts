import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";
import { extractPitchNumbers } from "./pitch";

beforeAll(() => {
  const dom = new JSDOM();
  globalThis.DOMParser = dom.window.DOMParser;
  globalThis.Node = dom.window.Node;
  globalThis.Element = dom.window.Element;
});

describe("extractPitchNumbers", () => {
  it("should extract unique pitch numbers from multiple items", () => {
    const html = `<ol><li><span style="display:inline;"><span>[</span><span>0</span><span>]</span></span></li><li><span style="display:inline;"><span>[</span><span>0</span><span>]</span></span></li><li><span style="display:inline;"><span>[</span><span>0</span><span>]</span></span></li><li><span style="display:inline;"><span>[</span><span>0</span><span>]</span></span></li></ol>`;
    expect(extractPitchNumbers(html)).toEqual([0]);
  });

  it("should extract a single pitch number", () => {
    const html = `<span style="display:inline;"><span>[</span><span>2</span><span>]</span></span>`;
    expect(extractPitchNumbers(html)).toEqual([2]);
  });

  it("should extract pitch number from a group", () => {
    const html = `<div class="pa-positions__group" data-details="アクセント辞典"><div class="pa-positions__dictionary"><div class="pa-positions__dictionary-inner">アクセント辞典</div></div><ol><li><span style="display:inline;"><span>[</span><span>0</span><span>]</span></span></li></ol></div>`;
    expect(extractPitchNumbers(html)).toEqual([0]);
  });

  it("should extract a different pitch number from a group", () => {
    const html = `<div class="pa-positions__group" data-details="アクセント辞典"><div class="pa-positions__dictionary"><div class="pa-positions__dictionary-inner">アクセント辞典</div></div><ol><li><span style="display:inline;"><span>[</span><span>3</span><span>]</span></span></li></ol></div>`;
    expect(extractPitchNumbers(html)).toEqual([3]);
  });

  it("should handle empty string", () => {
    expect(extractPitchNumbers("")).toEqual([]);
  });

  it("should handle multiple unique numbers", () => {
    const html = `
      <ol>
        <li><span>[</span><span>0</span><span>]</span></li>
        <li><span>[</span><span>2</span><span>]</span></li>
      </ol>
    `;
    expect(extractPitchNumbers(html)).toEqual([0, 2]);
  });

  it("should handle plain text format 'アクセント辞典: 0'", () => {
    const html = "アクセント辞典: 0";
    expect(extractPitchNumbers(html)).toEqual([0]);
  });

  it("should handle list with labels 'アクセント辞典: 0', 'アクセント辞典: 3'", () => {
    const html =
      "<ol><li>アクセント辞典: 0</li><li>アクセント辞典: 3</li></ol>";
    expect(extractPitchNumbers(html)).toEqual([0, 3]);
  });

  it("should handle list with bracketed numbers '<ol><li>[2]</li></ol>'", () => {
    const html = "<ol><li>[2]</li></ol>";
    expect(extractPitchNumbers(html)).toEqual([2]);
  });

  it("should handle full-width numbers '［０］'", () => {
    const html = "［０］";
    expect(extractPitchNumbers(html)).toEqual([0]);
  });

  it("should ignore large numbers that are likely not pitch accents (e.g., years)", () => {
    const html = "アクセント辞典 (2024): 0, 2";
    expect(extractPitchNumbers(html)).toEqual([0, 2]);
  });
});
