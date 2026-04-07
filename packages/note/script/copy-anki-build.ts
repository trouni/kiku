import { cp, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { env } from "../tools/env.ts";
import { paths } from "../tools/paths.ts";

class Script {
  async ensureAnkiDir() {
    await stat(env.ANKI_COLLECTION_MEDIA_PATH);
  }

  async copyAssetsFromDistToAnkiBuild() {
    const ASSETS = [
      [paths["@/dist/_kiku.js"], paths["@/.anki-build/_kiku.js"]],
      [paths["@/dist/_kiku_lazy.js"], paths["@/.anki-build/_kiku_lazy.js"]],
      [paths["@/dist/_kiku_libs.js"], paths["@/.anki-build/_kiku_libs.js"]],
      [paths["@/dist/_kiku_shared.js"], paths["@/.anki-build/_kiku_shared.js"]],
      [paths["@/dist/_kiku_worker.js"], paths["@/.anki-build/_kiku_worker.js"]],
      [paths["@/dist/_kiku.css"], paths["@/.anki-build/_kiku.css"]],
    ] as const;

    console.log("\n📁 Copying assets from dist to .anki-build...");
    for (const [src, dest] of ASSETS) {
      await cp(src, dest);
      console.log(`✅ Copied ${basename(src)} to .anki-build`);
    }
  }

  async copyFiles(files: string[], srcDir: string) {
    for (const file of files) {
      const src = join(srcDir, file);
      await stat(src);
      const dest = join(env.ANKI_COLLECTION_MEDIA_PATH, file);
      await cp(src, dest);
      console.log(`✅ Copied ${basename(src)}`);
    }
  }

  async copyAnkiBuild() {
    const FILES = [
      "_kiku_front.html",
      "_kiku_back.html",
      "_kiku_cloze_front.html",
      "_kiku_cloze_back.html",
      "_kiku_style.css",
      "_kiku.css",
      "_kiku.js",
      "_kiku_lazy.js",
      "_kiku_libs.js",
      "_kiku_shared.js",
      "_kiku_worker.js",
      "_kiku_plugin.js",
      "_kiku_plugin.css",
    ];

    console.log("\n📁 Copying ANKI BUILD files...");
    await this.copyFiles(FILES, paths["@/.anki-build/"]);
  }

  async copyFonts() {
    const FONTS = [
      "_kiku_font_hina-mincho.woff2",
      "_kiku_font_klee-one.woff2",
      "_kiku_font_ibm-plex-sans-jp.woff2",
    ];

    console.log("\n📁 Copying FONTS...");
    await this.copyFiles(FONTS, paths["@/.fonts/"]);
  }

  async copyDatabases() {
    const DBS = ["_kiku_db_main.tar", "_kiku_db_main_manifest.json"];

    console.log("\n📁 Copying DATABASES...");
    await this.copyFiles(DBS, paths["@/.db/"]);
  }

  async run() {
    console.log(
      `🔍 Checking Anki collection at: ${env.ANKI_COLLECTION_MEDIA_PATH}`,
    );
    await this.ensureAnkiDir();
    await this.copyAssetsFromDistToAnkiBuild();
    await this.copyAnkiBuild();
    await this.copyFonts();
    await this.copyDatabases();
    console.log("\n🎉 Done!");
  }
}

const script = new Script();
script.run();
