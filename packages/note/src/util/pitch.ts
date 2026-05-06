import { parseHtml, unique } from "./general";
export function extractPitchNumbers(html: string) {
  if (!html) return [];
  const pitchPositionDoc = parseHtml(html);
  let text = pitchPositionDoc.body.textContent || "";

  // Normalize full-width numbers to half-width
  text = text.replace(/[０-９]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) - 0xfee0),
  );

  const matches = text.match(/\d+/g);
  if (!matches) return [];

  const numbers = matches
    .map(Number)
    // Pitch accents are usually small (0-20).
    // This helps ignore things like years (2024) in the text.
    .filter((n) => n < 50);

  return unique(numbers);
}
