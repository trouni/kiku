import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";
import { sliceSentenceAudioByGroup } from "./general";

beforeAll(() => {
  const dom = new JSDOM();
  globalThis.DOMParser = dom.window.DOMParser;
  globalThis.Node = dom.window.Node;
  globalThis.Element = dom.window.Element;
});

describe("sliceSentenceAudioByGroup", () => {
  // Real SentenceAudio from a grouped note (技): one grouped sentence audio
  // plus one ungrouped one.
  const grouped =
    '<span data-group-id="11">[sound:N1_0963_2.ogg]</span>[sound:N2_0804_Chap7-Sec1.ogg]';

  it("returns only the audio for the selected group", () => {
    expect(sliceSentenceAudioByGroup(grouped, "11")).toBe(
      '<span data-group-id="11">[sound:N1_0963_2.ogg]</span>',
    );
  });

  it("returns the ungrouped bucket for id '0'", () => {
    expect(sliceSentenceAudioByGroup(grouped, "0")).toBe(
      "[sound:N2_0804_Chap7-Sec1.ogg]",
    );
  });

  it("returns the whole field when no grouping is active", () => {
    expect(sliceSentenceAudioByGroup(grouped, "")).toBe(grouped);
  });

  it("returns an empty string for empty audio", () => {
    expect(sliceSentenceAudioByGroup("", "0")).toBe("");
    expect(sliceSentenceAudioByGroup("   ", "11")).toBe("");
  });

  it("handles a single ungrouped sentence audio (id '0')", () => {
    // Real SentenceAudio from an ungrouped note (必要).
    const single = "[sound:JLPT_Tango_N4_0207-01.ogg]";
    expect(sliceSentenceAudioByGroup(single, "0")).toBe(single);
  });

  it("returns empty when the selected group has no audio", () => {
    expect(sliceSentenceAudioByGroup(grouped, "99")).toBe("");
  });
});
