import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";
import {
  countAudioTags,
  needsHtml5Audio,
  sliceSentenceAudioByGroup,
} from "./general";

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

describe("countAudioTags", () => {
  it("counts raw [sound:...] markup", () => {
    expect(
      countAudioTags(
        '<span data-group-id="11">[sound:N1_0963_2.ogg]</span>[sound:N2_0804.ogg]',
      ),
    ).toBe(2);
    expect(countAudioTags("[sound:only.ogg]")).toBe(1);
  });

  it("counts rendered pycmd soundLinks", () => {
    const rendered =
      '<span data-group-id="10"><a onclick="pycmd(\'play:a:1\'); return false;"></a></span>' +
      "<a onclick=\"pycmd('play:a:2'); return false;\"></a>";
    expect(countAudioTags(rendered)).toBe(2);
  });

  it("returns 0 for empty fields", () => {
    expect(countAudioTags("")).toBe(0);
    expect(countAudioTags("<span></span>")).toBe(0);
  });
});

describe("needsHtml5Audio", () => {
  it("is true for ogg/opus the native mobile player can't decode", () => {
    expect(needsHtml5Audio("[sound:1376_Chap12-Sec5.ogg]")).toBe(true);
    expect(needsHtml5Audio('<audio src="voice.opus"></audio>')).toBe(true);
    expect(
      needsHtml5Audio(
        '<span data-group-id="2">[sound:a.ogg]</span>[sound:b.mp3]',
      ),
    ).toBe(true);
  });

  it("is false for mp3/aac/wav that autoplay natively", () => {
    expect(needsHtml5Audio("[sound:hypertts-062dcaf.mp3]")).toBe(false);
    expect(needsHtml5Audio("[sound:yomitan_audio_6aceaf.mp3]")).toBe(false);
    expect(needsHtml5Audio("")).toBe(false);
  });
});
