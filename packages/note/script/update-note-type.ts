import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { generateCssVars, getCssVar } from "../src/util/config.js";
import { defaultConfig } from "../src/util/default-config.js";
import { paths } from "../tools/paths.ts";
import { AnkiConnect, log } from "../tools/util.js";

class Script {
  NOTE_TYPE = "Kiku";
  CARD_TYPE = "Mining";
  CLOZE_CARD_TYPE = "Cloze";
  FRONT_PATH = paths["@/.anki-build/_kiku_front.html"];
  BACK_PATH = paths["@/.anki-build/_kiku_back.html"];
  CLOZE_FRONT_PATH = paths["@/.anki-build/_kiku_cloze_front.html"];
  CLOZE_BACK_PATH = paths["@/.anki-build/_kiku_cloze_back.html"];
  STYLE_PATH = paths["@/.anki-build/_kiku_style.css"];

  async readTemplates() {
    const [front, back, clozeFront, clozeBack, style] = await Promise.all([
      readFile(this.FRONT_PATH, "utf8"),
      readFile(this.BACK_PATH, "utf8"),
      readFile(this.CLOZE_FRONT_PATH, "utf8"),
      readFile(this.CLOZE_BACK_PATH, "utf8"),
      readFile(this.STYLE_PATH, "utf8"),
    ]);

    return { front, back, clozeFront, clozeBack, style };
  }

  applyDataAttributes(template: string) {
    return template
      .replace("__DATA_THEME__", "light")
      .replace("__DATA_BLUR_NSFW__", "true")
      .replace("__DATA_PICTURE_ON_FRONT__", "false")
      .replace("__DATA_MOD_VERTICAL__", "false");
  }

  buildStyleTemplate(styleSrc: string) {
    const cssVars = generateCssVars(getCssVar(defaultConfig));
    return styleSrc.replace("/* __CSS_VARIABLE__ */", cssVars);
  }

  async ensureClozeTemplateExists(clozeFrontSrc: string, clozeBackSrc: string) {
    // Check if the Cloze template already exists
    const modelResult = await AnkiConnect.call("modelTemplates", {
      modelName: this.NOTE_TYPE,
    });
    const templates = modelResult.result ?? modelResult;
    const hasClozeTemplate =
      typeof templates === "object" &&
      templates !== null &&
      this.CLOZE_CARD_TYPE in templates;

    if (!hasClozeTemplate) {
      log.gray("Cloze template not found, adding it...");
      const addResult = await AnkiConnect.call("modelTemplateAdd", {
        modelName: this.NOTE_TYPE,
        template: {
          Name: this.CLOZE_CARD_TYPE,
          Front: clozeFrontSrc,
          Back: clozeBackSrc,
        },
      });
      log.gray(`modelTemplateAdd: ${JSON.stringify(addResult)}`);
      console.log(`✅ Added "${this.CLOZE_CARD_TYPE}" card type to "${this.NOTE_TYPE}"`);
    }
  }

  async updateTemplates(
    frontSrc: string,
    backSrc: string,
    clozeFrontSrc: string,
    clozeBackSrc: string,
  ) {
    await this.ensureClozeTemplateExists(clozeFrontSrc, clozeBackSrc);

    const result = await AnkiConnect.call("updateModelTemplates", {
      model: {
        name: this.NOTE_TYPE,
        templates: {
          [this.CARD_TYPE]: {
            Front: frontSrc,
            Back: backSrc,
          },
          [this.CLOZE_CARD_TYPE]: {
            Front: clozeFrontSrc,
            Back: clozeBackSrc,
          },
        },
      },
    });

    log.gray(`updateModelTemplates: ${JSON.stringify(result)}`);
    console.log(
      `✅ Updated "${this.NOTE_TYPE}" Mining + Cloze templates`,
    );
  }

  async updateStyling(styleSrc: string) {
    const result = await AnkiConnect.call("updateModelStyling", {
      model: {
        name: this.NOTE_TYPE,
        css: styleSrc,
      },
    });

    log.gray(`updateModelStyling: ${JSON.stringify(result)}`);
    console.log(
      `✅ Updated "${this.NOTE_TYPE}" style from ${basename(this.STYLE_PATH)}`,
    );
  }

  async run() {
    const { front, back, clozeFront, clozeBack, style } =
      await this.readTemplates();
    const frontTemplate = this.applyDataAttributes(front);
    const backTemplate = this.applyDataAttributes(back);
    const clozeFrontTemplate = this.applyDataAttributes(clozeFront);
    const clozeBackTemplate = this.applyDataAttributes(clozeBack);
    const styleTemplate = this.buildStyleTemplate(style);
    await this.updateTemplates(
      frontTemplate,
      backTemplate,
      clozeFrontTemplate,
      clozeBackTemplate,
    );
    await this.updateStyling(styleTemplate);
  }
}

const script = new Script();
script.run().catch((err) => {
  console.error("❌ Failed to update note type:", err);
  process.exit(1);
});
