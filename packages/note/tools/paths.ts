import { join } from "node:path";

const TOOLS_DIR = import.meta.dirname;
const ROOT = join(TOOLS_DIR, "..");

const p = (path: string) => join(ROOT, path);

/**
 * Common paths used in the note package.
 * Keys starting with "@" represent the package root.
 * Directories end with "/", files do not.
 */
// biome-ignore format: this looks nicer
export const paths = {
  "@/":                                        `${ROOT}/`,
  "@/.env":                                    p(".env"),
  "@/package.json":                            p("package.json"),

  "@/src/":                                    p("src/"),
  "@/plugins/":                                p("plugins/"),
  "@/dist/":                                   p("dist/"),
  "@/preprocess/":                             p("preprocess/"),
  "@/script/":                                 p("script/"),
  "@/tools/":                                  p("tools/"),
  "@/.anki-build/":                            p(".anki-build/"),

  "@/src/index.tsx":                           p("src/index.tsx"),

  "@/template/":                               p("template/"),
  "@/template/front.html":                     p("template/front.html"),
  "@/template/back.html":                      p("template/back.html"),
  "@/template/cloze_front.html":               p("template/cloze_front.html"),
  "@/template/cloze_back.html":                p("template/cloze_back.html"),
  "@/template/style.css":                      p("template/style.css"),
  "@/template/_kiku_plugin.js":                p("template/_kiku_plugin.js"),
  "@/template/_kiku_plugin.css":               p("template/_kiku_plugin.css"),

  "@/dist/_kiku.js":                           p("dist/_kiku.js"),
  "@/dist/_kiku_lazy.js":                      p("dist/_kiku_lazy.js"),
  "@/dist/_kiku_libs.js":                      p("dist/_kiku_libs.js"),
  "@/dist/_kiku_shared.js":                    p("dist/_kiku_shared.js"),
  "@/dist/_kiku_worker.js":                    p("dist/_kiku_worker.js"),
  "@/dist/_kiku.css":                          p("dist/_kiku.css"),

  "@/.anki-build/_kiku_front.html":            p(".anki-build/_kiku_front.html"),
  "@/.anki-build/_kiku_back.html":             p(".anki-build/_kiku_back.html"),
  "@/.anki-build/_kiku_cloze_front.html":      p(".anki-build/_kiku_cloze_front.html"),
  "@/.anki-build/_kiku_cloze_back.html":       p(".anki-build/_kiku_cloze_back.html"),
  "@/.anki-build/_kiku_style.css":             p(".anki-build/_kiku_style.css"),
  "@/.anki-build/_kiku.css":                   p(".anki-build/_kiku.css"),
  "@/.anki-build/_kiku_plugin.js":             p(".anki-build/_kiku_plugin.js"),
  "@/.anki-build/_kiku_plugin.css":            p(".anki-build/_kiku_plugin.css"),

  "@/.anki-build/_kiku.js":                    p(".anki-build/_kiku.js"),
  "@/.anki-build/_kiku_lazy.js":               p(".anki-build/_kiku_lazy.js"),
  "@/.anki-build/_kiku_libs.js":               p(".anki-build/_kiku_libs.js"),
  "@/.anki-build/_kiku_shared.js":             p(".anki-build/_kiku_shared.js"),
  "@/.anki-build/_kiku_worker.js":             p(".anki-build/_kiku_worker.js"),

  "@/.collection.media/":                      p(".collection.media/"),

  "@/.db/":                                    p(".db/"),
  "@/.db/kiku_db_kanji.json":                  p(".db/kiku_db_kanji.json"),
  "@/.db/kiku_db_kanji_compact.json":          p(".db/kiku_db_kanji_compact.json"),
  "@/.db/kiku_db_kanji_compact.json.gz":       p(".db/kiku_db_kanji_compact.json.gz"),
  "@/.db/_kiku_db_main.tar":                   p(".db/_kiku_db_main.tar"),
  "@/.db/_kiku_db_main_manifest.json":         p(".db/_kiku_db_main_manifest.json"),

  "@/.dicts/":                                 p(".dicts/"),
  "@/.fonts/":                                 p(".fonts/"),
  "@/.release/":                               p(".release/"),

  "@/.jmdict/":                                p(".jmdict/"),
  "@/.jmdict/JMdict_e":                        p(".jmdict/JMdict_e"),
  "@/.jmdict/term.json":                       p(".jmdict/term.json"),
  "@/.jmdict/termMap.json":                    p(".jmdict/termMap.json"),

  "@/.jpdb/":                                  p(".jpdb/"),
  "@/.jpdb/kanji-by-frequency/":               p(".jpdb/kanji-by-frequency/"),
  "@/.jpdb/kanji-by-frequency/kyoiku.html":    p(".jpdb/kanji-by-frequency/kyoiku.html"),
  "@/.jpdb/kanji-by-frequency/joyo.html":      p(".jpdb/kanji-by-frequency/joyo.html"),
  "@/.jpdb/kanji-by-frequency/jinmeiyo.html":  p(".jpdb/kanji-by-frequency/jinmeiyo.html"),
  "@/.jpdb/kanji-by-frequency/hyogai.html":    p(".jpdb/kanji-by-frequency/hyogai.html"),
  "@/.jpdb/kanji-by-frequency/kyoiku.json":    p(".jpdb/kanji-by-frequency/kyoiku.json"),
  "@/.jpdb/kanji-by-frequency/joyo.json":      p(".jpdb/kanji-by-frequency/joyo.json"),
  "@/.jpdb/kanji-by-frequency/jinmeiyo.json":  p(".jpdb/kanji-by-frequency/jinmeiyo.json"),
  "@/.jpdb/kanji-by-frequency/hyogai.json":    p(".jpdb/kanji-by-frequency/hyogai.json"),
  "@/.jpdb/kanji/":                            p(".jpdb/kanji/"),
  "@/.jpdb/kanji.json":                        p(".jpdb/kanji.json"),
  "@/.jpdb/kanji-error.json":                  p(".jpdb/kanji-error.json"),
 
  "@/.kanjivg/":                               p(".kanjivg/"),
  "@/.kanjivg/kanjivg.zip":                    p(".kanjivg/kanjivg.zip"),
  "@/.kanjivg/kanji/":                         p(".kanjivg/kanji/"),
  "@/.kanjivg/kanji.json":                     p(".kanjivg/kanji.json"),

  "@/.wk/":                                    p(".wk/"),
  "@/.wk/pleasant.html":                       p(".wk/pleasant.html"),
  "@/.wk/painful.html":                        p(".wk/painful.html"),
  "@/.wk/death.html":                          p(".wk/death.html"),
  "@/.wk/hell.html":                           p(".wk/hell.html"),
  "@/.wk/paradise.html":                       p(".wk/paradise.html"),
  "@/.wk/reality.html":                        p(".wk/reality.html"),
  "@/.wk/vocab_pleasant.html":                 p(".wk/vocab_pleasant.html"),
  "@/.wk/vocab_painful.html":                  p(".wk/vocab_painful.html"),
  "@/.wk/vocab_death.html":                    p(".wk/vocab_death.html"),
  "@/.wk/vocab_hell.html":                     p(".wk/vocab_hell.html"),
  "@/.wk/vocab_paradise.html":                 p(".wk/vocab_paradise.html"),
  "@/.wk/vocab_reality.html":                  p(".wk/vocab_reality.html"),
  "@/.wk/all_kanji.json":                      p(".wk/all_kanji.json"),
  "@/.wk/kanji/":                              p(".wk/kanji/"),
  "@/.wk/failed_kanji.json":                   p(".wk/failed_kanji.json"),
  "@/.wk/wk_kanji_info.json":                  p(".wk/wk_kanji_info.json"),
  "@/.wk/vocab/":                              p(".wk/vocab/"),
  "@/.wk/all_vocab.json":                      p(".wk/all_vocab.json"),
  "@/.wk/failed_vocab.json":                   p(".wk/failed_vocab.json"),
} as const;
