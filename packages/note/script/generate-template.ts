import { mkdir, readFile, writeFile } from "node:fs/promises";
import { paths } from "../tools/paths.ts";
import { getVersion, log } from "../tools/util.js";
import { generateSsrTemplate } from "./generate-ssr-template.js";

class Script {
  PATHS = {
    FRONT_SRC: paths["@/template/front.html"],
    BACK_SRC: paths["@/template/back.html"],
    CLOZE_FRONT_SRC: paths["@/template/cloze_front.html"],
    CLOZE_BACK_SRC: paths["@/template/cloze_back.html"],
    STYLE_SRC: paths["@/template/style.css"],

    FRONT_DEST: paths["@/.anki-build/_kiku_front.html"],
    BACK_DEST: paths["@/.anki-build/_kiku_back.html"],
    CLOZE_FRONT_DEST: paths["@/.anki-build/_kiku_cloze_front.html"],
    CLOZE_BACK_DEST: paths["@/.anki-build/_kiku_cloze_back.html"],
    STYLE_DEST: paths["@/.anki-build/_kiku_style.css"],

    PLUGIN_SRC: paths["@/template/_kiku_plugin.js"],
    PLUGIN_DEST: paths["@/.anki-build/_kiku_plugin.js"],

    CSS_PLUGIN_SRC: paths["@/template/_kiku_plugin.css"],
    CSS_PLUGIN_DEST: paths["@/.anki-build/_kiku_plugin.css"],
  };

  async ensureDestDir() {
    await mkdir(paths["@/.anki-build/"], { recursive: true });
  }

  async loadSources() {
    const [front, back, clozeFront, clozeBack, style, plugin, cssPlugin] =
      await Promise.all([
        readFile(this.PATHS.FRONT_SRC, "utf8"),
        readFile(this.PATHS.BACK_SRC, "utf8"),
        readFile(this.PATHS.CLOZE_FRONT_SRC, "utf8"),
        readFile(this.PATHS.CLOZE_BACK_SRC, "utf8"),
        readFile(this.PATHS.STYLE_SRC, "utf8"),
        readFile(this.PATHS.PLUGIN_SRC, "utf8"),
        readFile(this.PATHS.CSS_PLUGIN_SRC, "utf8"),
      ]);
    return { front, back, clozeFront, clozeBack, style, plugin, cssPlugin };
  }

  async buildTemplates(src: {
    front: string;
    back: string;
    clozeFront: string;
    clozeBack: string;
    style: string;
    plugin: string;
    cssPlugin: string;
  }) {
    const version = `v${await getVersion()}`;
    const {
      frontSsrTemplate,
      backSsrTemplate,
      clozeFrontSsrTemplate,
      hydrationScript,
    } = generateSsrTemplate();

    log.yellow("Front SSR Template:");
    log.gray(frontSsrTemplate);
    log.yellow("Back SSR Template:");
    log.gray(backSsrTemplate);
    log.yellow("Cloze Front SSR Template:");
    log.gray(clozeFrontSsrTemplate);
    log.yellow("Hydration Script:");
    log.gray(hydrationScript);

    const front = src.front
      .replace("__VERSION__", version)
      .replace("<!-- SSR_TEMPLATE -->", frontSsrTemplate)
      .replace("<!-- HYDRATION_SCRIPT -->", hydrationScript);
    const back = src.back
      .replace("__VERSION__", version)
      .replace("<!-- SSR_TEMPLATE -->", backSsrTemplate)
      .replace("<!-- HYDRATION_SCRIPT -->", hydrationScript);
    const clozeFront = src.clozeFront
      .replace("__VERSION__", version)
      .replace("<!-- SSR_TEMPLATE -->", clozeFrontSsrTemplate)
      .replace("<!-- HYDRATION_SCRIPT -->", hydrationScript);
    const clozeBack = src.clozeBack
      .replace("__VERSION__", version)
      .replace("<!-- SSR_TEMPLATE -->", backSsrTemplate)
      .replace("<!-- HYDRATION_SCRIPT -->", hydrationScript);
    const style = src.style.replace("__VERSION__", version);
    const plugin = src.plugin;
    const cssPlugin = src.cssPlugin;

    return { front, back, clozeFront, clozeBack, style, plugin, cssPlugin };
  }

  async writeOutputs(templates: {
    front: string;
    back: string;
    clozeFront: string;
    clozeBack: string;
    style: string;
    plugin: string;
    cssPlugin: string;
  }) {
    await Promise.all([
      writeFile(this.PATHS.FRONT_DEST, templates.front),
      writeFile(this.PATHS.BACK_DEST, templates.back),
      writeFile(this.PATHS.CLOZE_FRONT_DEST, templates.clozeFront),
      writeFile(this.PATHS.CLOZE_BACK_DEST, templates.clozeBack),
      writeFile(this.PATHS.STYLE_DEST, templates.style),
      writeFile(this.PATHS.PLUGIN_DEST, templates.plugin),
      writeFile(this.PATHS.CSS_PLUGIN_DEST, templates.cssPlugin),
    ]);
  }

  async run() {
    await this.ensureDestDir();
    const sources = await this.loadSources();
    const templates = await this.buildTemplates(sources);
    await this.writeOutputs(templates);
  }
}

const script = new Script();
script
  .run()
  .then(() => {
    console.log("✅ Generated template");
  })
  .catch((err) => {
    console.error("❌ Failed to generate template:", err);
    process.exit(1);
  });
