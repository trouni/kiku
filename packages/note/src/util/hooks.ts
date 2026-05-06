import { createEffect, createMemo, getOwner, runWithOwner } from "solid-js";
import { unwrap } from "solid-js/store";
import { isServer } from "solid-js/web";
import { useAnkiFieldContext } from "#/components/shared/AnkiFieldsContext";
import { useBreakpointContext } from "#/components/shared/BreakpointContext";
import { useCacheContext } from "#/components/shared/CacheContext";
import { useCardContext } from "#/components/shared/CardContext";
import { useConfigContext } from "#/components/shared/ConfigContext";
import { useCtxContext } from "#/components/shared/CtxContext";
import { useGeneralContext } from "#/components/shared/GeneralContext";
import type { KikuPlugin } from "#/plugins/plugin-types";
import { createNex } from "#/worker/client";
import { constants, extractKanji, parseHtml } from "./general";
import { hatsuon } from "./hatsuon";
import { extractPitchNumbers } from "./pitch";
import type { DaisyUITheme } from "./theme";
import { type PitchType, pitchTypes } from "./types";

export function useViewTransition() {
  function startViewTransition(
    callback: () => void,
    opts: { beforeCallback?: () => void } = {},
  ) {
    if (document.startViewTransition) {
      opts.beforeCallback?.();
      return document.startViewTransition(callback);
    } else {
      callback();
    }
  }
  return startViewTransition;
}

export function useNavigationTransition() {
  const [$card, $setCard] = useCardContext();
  const bp = useBreakpointContext();
  const startViewTransition = useViewTransition();

  function navigate(
    destination: "main" | "settings" | "nested" | "kanji" | (() => void),
    direction: "back" | "forward",
    navigateBack?: () => void,
  ) {
    if (navigateBack) $setCard("navigateBack", (old) => [...old, navigateBack]);
    const start = () => {
      if (typeof destination === "function") {
        destination();
      } else {
        $setCard("page", destination);
      }
    };

    if (!bp.isAtLeast("sm")) {
      startViewTransition(start, {
        beforeCallback() {
          document.documentElement.dataset.transitionDirection = direction;
        },
      })?.finished.then(() => {
        // TODO: this callback is called too fast when naviating to nested card, not sure why.
        document.documentElement.removeAttribute("data-transition-direction");
      });
    } else {
      start();
    }
  }
  function navigateBack() {
    const last = $card.navigateBack[$card.navigateBack.length - 1];
    $setCard("navigateBack", (list) => list.slice(0, -1));
    last?.();
  }

  return { navigate, navigateBack };
}

export function usePitch() {
  const [$card, $setCard] = useCardContext();
  const { ankiFields } = useAnkiFieldContext<"back">();

  const pitchNumbers = createMemo(() =>
    extractPitchNumbers(ankiFields.PitchPosition),
  );

  const reading = createMemo(() => {
    if ($card.nested) return ankiFields.ExpressionReading;
    return ankiFields.ExpressionFurigana
      ? ankiFields["kana:ExpressionFurigana"]
      : ankiFields.ExpressionReading;
  });

  const pitchInfos = createMemo(() => {
    const numbers = pitchNumbers();
    if (!numbers.length) return [];
    const pitchCategories = ankiFields.PitchCategories.split(",").map((s) => {
      let pitchCategory: string | null = s.trim().toLowerCase();
      if (pitchCategory === "平板") pitchCategory = "heiban";
      if (pitchCategory === "頭高") pitchCategory = "atamadaka";
      if (pitchCategory === "中高") pitchCategory = "nakadaka";
      if (pitchCategory === "尾高") pitchCategory = "odaka";
      if (pitchCategory === "起伏") pitchCategory = "kifuku";
      if (!pitchTypes.includes(pitchCategory as PitchType))
        pitchCategory = null;
      return pitchCategory;
    });
    return numbers.map((pitchNum, i) => {
      const result = hatsuon({ reading: reading(), pitchNum, locale: "EN" });
      result.patternName = pitchCategories[i] ?? result.patternName;
      return result;
    });
  });

  const pitchType = createMemo(() => {
    const info = pitchInfos()[0];
    if (!info) return undefined;
    return info.patternName as PitchType;
  });

  createEffect(() => {
    $setCard("pitch", {
      infos: pitchInfos(),
      type: pitchType(),
    });
  });
}

export function useThemeTransition() {
  const [$general] = useGeneralContext();
  const [$config, $setConfig] = useConfigContext();
  const startViewTransition = useViewTransition();
  const [$card, $setCard] = useCardContext();

  function changeTheme(theme: DaisyUITheme) {
    if ($card.query.status === "loading" || $general.isAnkiDesktop) {
      $setConfig("theme", theme);
    } else {
      startViewTransition(() => $setConfig("theme", theme), {
        beforeCallback() {
          document.documentElement.dataset.themeTransition = "true";
        },
      })?.finished.then(() => {
        document.documentElement.removeAttribute("data-theme-transition");
      });
    }
  }
  return changeTheme;
}

export function useKanji() {
  const [$config] = useConfigContext();
  const [$card, $setCard] = useCardContext();
  const { ankiFields } = useAnkiFieldContext<"back">();
  const [$general, $setGeneral] = useGeneralContext();
  const cacheStore = useCacheContext();

  let set = false;
  async function setKanji() {
    set = true;
    try {
      const kanjiList = extractKanji(
        ankiFields.ExpressionFurigana
          ? $card.nested
            ? ankiFields.Expression
            : ankiFields["furigana:ExpressionFurigana"]
          : ankiFields.Expression,
      );
      const readingList = ankiFields.ExpressionReading
        ? [ankiFields.ExpressionReading]
        : [];
      const expressionList = ankiFields.Expression
        ? [ankiFields.Expression]
        : [];

      const opts = {
        env: constants,
        config: unwrap($config),
        assetsPath: import.meta.env.DEV ? "" : $general.assetsPath,
        preferAnkiConnect: $config.preferAnkiConnect && $general.isAnkiDesktop,
        workerPath: $general.workerPath,
      };
      const nex = await createNex(opts, $general.logger, cacheStore?.nex);
      $general.nex.resolve(nex);
      if (cacheStore && !cacheStore.nex) {
        cacheStore.nex = nex;
      }
      const { kanjiResult, readingResult, expressionResult } =
        await nex.queryShared({
          kanjiList,
          readingList,
          ankiFields: unwrap(ankiFields),
          expressionList,
        });

      if ($general.aborter.signal.aborted) return;

      $setCard("query", {
        status: "success",
        noteList: Object.entries(kanjiResult),
        sameReading: readingResult[ankiFields.ExpressionReading],
        sameExpression: expressionResult[ankiFields.Expression],
      });

      nex
        .notesManifest()
        .then((manifest) => $setGeneral("notesManifest", manifest))
        .catch(() => {
          $general.logger.warn("Failed to load manifest");
        });
    } catch (e) {
      $setCard("query", { status: "error" });
      $general.logger.error(
        "Failed to load kanji information:",
        e instanceof Error ? e.message : "",
      );
    }
  }

  createEffect(() => {
    if (!set && $card.ready) {
      setKanji();
    }
  });
}

function isSvg(src: string | null) {
  if (!src) return false;
  const s = src.toLowerCase();
  return s.endsWith(".svg") || s.startsWith("data:image/svg+xml");
}

const defaultFilter = (img: HTMLImageElement) => {
  const src = img.getAttribute("src");
  return (
    !!src &&
    !isSvg(src) &&
    (img.height === 0 || img.height > 100) &&
    (img.width === 0 || img.width > 100) &&
    !img.closest('span[data-sc-pixiv="read-more-link"] a')
  );
};

export function useCollectGlossaryImgs() {
  const [$general] = useGeneralContext();

  function collectGlossaryImgs(glossaryHtml: string) {
    if (isServer) return [];

    const doc = parseHtml(glossaryHtml);

    return Array.from(doc.querySelectorAll("img"))
      .filter($general.plugin?.glossaryImagesFilter ?? defaultFilter)
      .map((img) => {
        const src = img.getAttribute("src") ?? "";
        const newImg = document.createElement("img");
        newImg.setAttribute("src", src);
        return {
          src,
          html: newImg.outerHTML,
        };
      });
  }

  return collectGlossaryImgs;
}

export function useLoadPlugin() {
  const [$general, $setGeneral] = useGeneralContext();
  const ctx = useCtxContext();
  const owner = getOwner();

  async function getPlugin(assetsPath: string) {
    try {
      const plugin = (
        await import(
          /* @vite-ignore */
          `${assetsPath}/${constants.assets["_kiku_plugin.js"]}`
        )
      ).plugin as KikuPlugin;
      return plugin;
    } catch {}
  }

  function loadPlugin() {
    getPlugin($general.assetsPath).then((plugin) => {
      try {
        runWithOwner(owner, () => {
          plugin?.onPluginLoad?.({ ctx });
        });
      } catch {}
      $setGeneral("plugin", plugin);
    });
  }

  return loadPlugin;
}
