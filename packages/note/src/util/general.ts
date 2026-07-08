const version: string =
  // @ts-expect-error: injected by vite
  typeof __VERSION__ !== "undefined" ? __VERSION__ : "unknown";

const assets = {
  "_kiku_config.json": "_kiku_config.json",
  "_kiku_front.html": "_kiku_front.html",
  "_kiku_back.html": "_kiku_back.html",
  "_kiku_cloze_front.html": "_kiku_cloze_front.html",
  "_kiku_cloze_back.html": "_kiku_cloze_back.html",
  "_kiku_style.css": "_kiku_style.css",
  "_kiku_notes_manifest.json": "_kiku_notes_manifest.json",
  "_kiku_db_main.tar": "_kiku_db_main.tar",
  "_kiku_db_main_manifest.json": "_kiku_db_main_manifest.json",
  "_kiku_plugin.js": "_kiku_plugin.js",

  "_kiku.js": "_kiku.js",
  "_kiku_libs.js": "_kiku_libs.js",
  "_kiku_shared.js": "_kiku_shared.js",
  "_kiku_lazy.js": "_kiku_lazy.js",
  "_kiku_worker.js": "_kiku_worker.js",
  "_kiku_plugin.css": "_kiku_plugin.css",
  "_kiku.css": "_kiku.css",

  "_kiku_font_hina-mincho.woff2": "_kiku_font_hina-mincho.woff2",
  "_kiku_font_ibm-plex-sans-jp.woff2": "_kiku_font_ibm-plex-sans-jp.woff2",
  "_kiku_font_klee-one.woff2": "_kiku_font_klee-one.woff2",
};

// biome-ignore format: this looks nicer
export const constants = {
  KIKU_VERSION: version,
  KIKU_NOTE_TYPE: "Kiku",
  KIKU_CARD_TYPE: "Mining",
  KIKU_CLOZE_CARD_TYPE: "Cloze",
  key: {
    "kiku-config": "kiku-config",
    "kiku-latest-version": "kiku-latest-version",
    "kiku-latest-version-checked": "kiku-latest-version-checked",
  },
  assets,
  tar: {
    "kiku_db_kanji_compact.json.gz": "kiku_db_kanji_compact.json.gz",
  },
  KIKU_IMPORTANT_FILES: [
    assets["_kiku.js"],
    assets["_kiku_libs.js"],
    assets["_kiku_shared.js"],
    assets["_kiku_lazy.js"],
    assets["_kiku_worker.js"],
    assets["_kiku_plugin.js"],
    assets["_kiku_plugin.css"],

    assets["_kiku_front.html"],
    assets["_kiku_back.html"],
    assets["_kiku_cloze_front.html"],
    assets["_kiku_cloze_back.html"],
    assets["_kiku_style.css"],
    assets["_kiku.css"],

    assets["_kiku_font_hina-mincho.woff2"],
    assets["_kiku_font_ibm-plex-sans-jp.woff2"],
    assets["_kiku_font_klee-one.woff2"],

    assets["_kiku_db_main.tar"],
    assets["_kiku_db_main_manifest.json"],
    assets["_kiku_notes_manifest.json"],
  ],
  //TODO: remove this
  SAME_READING: "__SAME_READING__",
  SAME_EXPRESSION: "__SAME_EXPRESSION__",
};

export type Constants = typeof constants;

export function extractKanji(str: string): string[] {
  // Match all CJK Unified Ideographs (Kanji range)
  const matches = str.match(/\p{Script=Han}/gu);
  return matches ? Array.from(new Set(matches)) : [];
}

export function isHtmlEffectivelyEmpty(html: string): boolean {
  if (!html || html.trim() === "") return true;
  const doc = new DOMParser().parseFromString(html, "text/html");

  // Remove elements that never count as content
  doc.querySelectorAll("script, style, template").forEach((el) => {
    el.remove();
  });

  // Check for meaningful text
  const text = doc.body.textContent
    ?.replace(/\u00a0/g, "") // nbsp
    .trim();

  if (text && text.length > 0) return false;

  // Check for meaningful non-text content
  const meaningfulSelectors = [
    "img",
    "video",
    "audio",
    "svg",
    "iframe",
    "canvas",
  ];

  return !meaningfulSelectors.some((sel) => doc.body.querySelector(sel));
}

export function parseHtml(html: string) {
  return new DOMParser().parseFromString(html, "text/html");
}

export function nodesToString(nodes: Node[]) {
  return nodes
    .map((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return (node as Element).outerHTML;
      }
      return node.textContent ?? "";
    })
    .join("");
}

/**
 * Return the raw `[sound:...]` markup for one field group, mirroring how
 * FieldGroupContext slices the processed field. Used to feed the on-screen
 * group's sentence audio into an HTML5 <audio> element.
 *
 * - `currentId === ""` → no grouping active, return the whole field.
 * - `currentId === "0"` → the ungrouped bucket (top-level nodes without an id).
 * - otherwise → the node(s) tagged with that `data-group-id`.
 */
export function sliceSentenceAudioByGroup(raw: string, currentId: string) {
  if (!raw.trim()) return "";
  if (!currentId) return raw;
  const doc = parseHtml(raw);
  if (currentId === "0") {
    const withoutGroup = Array.from(doc.body.childNodes).filter(
      (node) => !(node as HTMLElement).dataset?.groupId,
    );
    return nodesToString(withoutGroup);
  }
  const withGroup = Array.from(doc.querySelectorAll("[data-group-id]")).filter(
    (el) => (el as HTMLElement).dataset.groupId === currentId,
  );
  return nodesToString(withGroup);
}

export function unique<T>(arr: readonly T[]): T[] {
  return Array.from(new Set(arr));
}
