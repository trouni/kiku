import { describe, expect, it } from "vitest";
import { parseFurigana } from "./parse-furigana";

describe("parseFurigana", () => {
  it("should handle plain text without furigana", () => {
    const input = "こんにちは";
    const result = parseFurigana(input);
    expect(result).toEqual([{ type: "text", text: "こんにちは" }]);
  });

  it("should handle kanji with furigana", () => {
    const input = "漢字[かんじ]";
    const result = parseFurigana(input);
    expect(result).toEqual([{ type: "ruby", text: "漢字", reading: "かんじ" }]);
  });

  it("should handle mixed text with multiple furigana", () => {
    const input = "私の名前は田中[たなか]です。";
    const result = parseFurigana(input);
    expect(result).toEqual([
      { type: "text", text: "私の名前は" },
      { type: "ruby", text: "田中", reading: "たなか" },
      { type: "text", text: "です。" },
    ]);
  });

  it("should handle kanji without furigana as plain text", () => {
    const input = "漢字のみ";
    const result = parseFurigana(input);
    expect(result).toEqual([{ type: "text", text: "漢字のみ" }]);
  });

  it("should handle latin text and numbers", () => {
    const input = "Hello 123";
    const result = parseFurigana(input);
    expect(result).toEqual([{ type: "text", text: "Hello 123" }]);
  });

  it("should handle empty string", () => {
    const input = "";
    const result = parseFurigana(input);
    expect(result).toEqual([]);
  });

  it("should handle multiple ruby blocks", () => {
    const input = "青[あお]い海[うみ]";
    const result = parseFurigana(input);
    expect(result).toEqual([
      { type: "ruby", text: "青", reading: "あお" },
      { type: "text", text: "い" },
      { type: "ruby", text: "海", reading: "うみ" },
    ]);
  });

  it("should handle furigana for punctuation/other characters if preceded by kanji", () => {
    const input = "漢[ ]";
    const result = parseFurigana(input);
    expect(result).toEqual([{ type: "ruby", text: "漢", reading: " " }]);
  });

  it("should handle consecutive kanji blocks with furigana", () => {
    const input = "漢字[かんじ]漢字[かんじ]";
    const result = parseFurigana(input);
    expect(result).toEqual([
      { type: "ruby", text: "漢字", reading: "かんじ" },
      { type: "ruby", text: "漢字", reading: "かんじ" },
    ]);
  });

  it("should ignore furigana if there is no preceding kanji", () => {
    const input = "[かんじ]漢字";
    const result = parseFurigana(input);
    expect(result).toEqual([{ type: "text", text: "漢字" }]);
  });

  it("should handle 為す術もない[なすすべもない]", () => {
    const input = "為す術もない[なすすべもない]";
    const result = parseFurigana(input);
    expect(result).toEqual([
      { type: "ruby", text: "為す術もない", reading: "なすすべもない" },
    ]);
  });

  it("should handle 為す術もない[なすすべもない] with a leading space", () => {
    const input = " 為す術もない[なすすべもない]";
    const result = parseFurigana(input);
    expect(result).toEqual([
      { type: "ruby", text: "為す術もない", reading: "なすすべもない" },
    ]);
  });

  it("should handle mixed text with space-delimited ruby in the middle", () => {
    const input = "この 為す術もない[なすすべもない]状態";
    const result = parseFurigana(input);
    expect(result).toEqual([
      { type: "text", text: "この" },
      { type: "ruby", text: "為す術もない", reading: "なすすべもない" },
      { type: "text", text: "状態" },
    ]);
  });

  it("should handle space-delimited ruby followed by text", () => {
    const input = " 為す術もない[なすすべもない]です";
    const result = parseFurigana(input);
    expect(result).toEqual([
      { type: "ruby", text: "為す術もない", reading: "なすすべもない" },
      { type: "text", text: "です" },
    ]);
  });

  it("should still correctly handle standard kanji furigana when mixed with kana", () => {
    const input = "私は田中[たなか]です";
    const result = parseFurigana(input);
    expect(result).toEqual([
      { type: "text", text: "私は" },
      { type: "ruby", text: "田中", reading: "たなか" },
      { type: "text", text: "です" },
    ]);
  });

  it("should handle 食べる[たべる]", () => {
    const input = "食べる[たべる]";
    const result = parseFurigana(input);
    expect(result).toEqual([
      { type: "ruby", text: "食べる", reading: "たべる" },
    ]);
  });

  it("should handle full-width numbers followed by kanji with furigana", () => {
    const input = "１０日[とおか]";
    const result = parseFurigana(input);
    expect(result).toEqual([
      { type: "ruby", text: "１０日", reading: "とおか" },
    ]);
  });

  it("should handle half-width numbers followed by kanji with furigana", () => {
    const input = "10日[とおか]";
    const result = parseFurigana(input);
    expect(result).toEqual([{ type: "ruby", text: "10日", reading: "とおか" }]);
  });

  it("should handle number-kanji ruby in mixed text", () => {
    const input = "次の１０日[とおか]に会う";
    const result = parseFurigana(input);
    expect(result).toEqual([
      { type: "text", text: "次の" },
      { type: "ruby", text: "１０日", reading: "とおか" },
      { type: "text", text: "に会う" },
    ]);
  });

  it("should handle 擽[くすぐ]る[ ] with empty ruby after kana", () => {
    const input = "擽[くすぐ]る[ ]";
    const result = parseFurigana(input);
    expect(result).toEqual([
      { type: "ruby", text: "擽", reading: "くすぐ" },
      { type: "ruby", text: "る", reading: " " },
    ]);
  });
});
