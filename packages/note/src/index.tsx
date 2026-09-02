/* @refresh reload */
import "./util/polyfill.ts";
import { createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { hydrate, render } from "solid-js/web";
import { Back } from "./components/Back.tsx";
import { Front } from "./components/Front.tsx";
import { Layout } from "./components/Layout.tsx";
import { AnkiFieldContextProvider } from "./components/shared/AnkiFieldsContext.tsx";
import { BreakpointContextProvider } from "./components/shared/BreakpointContext.tsx";
import { CacheContextProvider } from "./components/shared/CacheContext.tsx";
import { CardStoreContextProvider } from "./components/shared/CardContext.tsx";
import { ConfigContextProvider } from "./components/shared/ConfigContext.tsx";
import { CtxContextProvider } from "./components/shared/CtxContext.tsx";
import {
  FieldGroupContextProvider,
  RootFieldGroupContextProvider,
} from "./components/shared/FieldGroupContext.tsx";
import { GeneralContextProvider } from "./components/shared/GeneralContext.tsx";
import {
  type KikuConfig,
  type RootDataset,
  updateConfigState,
  validateConfig,
} from "./util/config.ts";
import { defaultConfig } from "./util/default-config";
import { exampleFields } from "./util/examples.ts";
import { constants } from "./util/general.ts";
import { Logger } from "./util/logger.ts";
import {
  type AnkiDroidAPI,
  type AnkiFields,
  ankiFieldsSkeleton,
  type CacheStore,
} from "./util/types.ts";
import "./styles/tailwind.css";

export async function init({
  root,
  side,
  cardType = "mining",
  ankiFields,
  ssr,
  config = defaultConfig,
  aborter = new AbortController(),
  ankiDroidAPI,
  logger = new Logger(),
  cacheStore = {},
  assetsPath = window.location.origin,
  isAnkiWeb = false,
  isAnkiDesktop = typeof pycmd !== "undefined",
  workerPath,
  rootDataset,
}: {
  root: HTMLElement;
  side: "front" | "back";
  cardType?: "mining" | "cloze";
  ankiFields: AnkiFields;
  ssr?: boolean;
  config?: KikuConfig | ((defaultConfig: KikuConfig) => KikuConfig);
  aborter?: AbortController;
  ankiDroidAPI?: AnkiDroidAPI;
  logger?: Logger;
  cacheStore?: CacheStore;
  assetsPath?: string;
  isAnkiWeb?: boolean;
  isAnkiDesktop?: boolean;
  workerPath?: string;
  rootDataset?: RootDataset;
}) {
  const [startupTime, setStartupTime] = createSignal(0);
  const now = performance.now();

  root.part.add("root-part");

  config = typeof config === "function" ? config(defaultConfig) : config;
  updateConfigState(root, config, !isAnkiWeb);
  const [$config, $setConfig] = createStore(config);

  const App = () => (
    <BreakpointContextProvider>
      <CacheContextProvider cacheStore={cacheStore}>
        <GeneralContextProvider
          aborter={aborter}
          isAnkiWeb={isAnkiWeb}
          isAnkiDesktop={isAnkiDesktop}
          workerPath={workerPath}
          templateDataset={rootDataset ?? {}}
          ankiDroidAPI={ankiDroidAPI}
          startupTime={startupTime}
          assetsPath={assetsPath}
          logger={logger}
          root={root}
        >
          <ConfigContextProvider value={[$config, $setConfig]}>
            <AnkiFieldContextProvider ankiFields={ankiFields}>
              <CardStoreContextProvider side={side} cardType={cardType}>
                <FieldGroupContextProvider>
                  <RootFieldGroupContextProvider>
                    <CtxContextProvider>
                      <Layout>{side === "front" ? <Front /> : <Back />}</Layout>
                    </CtxContextProvider>
                  </RootFieldGroupContextProvider>
                </FieldGroupContextProvider>
              </CardStoreContextProvider>
            </AnkiFieldContextProvider>
          </ConfigContextProvider>
        </GeneralContextProvider>
      </CacheContextProvider>
    </BreakpointContextProvider>
  );

  const dispose = ssr ? hydrate(App, root) : render(App, root);
  setStartupTime(performance.now() - now);
  return { dispose, logger };
}

export async function initAnki({
  side,
  ssr,
}: {
  side: "front" | "back";
  ssr?: boolean;
}) {
  if (globalThis.KIKU?.aborter) globalThis.KIKU.aborter.abort();
  if (globalThis.KIKU?.dispose) globalThis.KIKU.dispose();

  const aborter = new AbortController();

  globalThis.KIKU ??= {};
  globalThis.KIKU.aborter = aborter;
  globalThis.KIKU.relax = false;

  if (!globalThis.KIKU.unload && !import.meta.env.DEV) {
    globalThis.KIKU.unload = () => {
      if (typeof pycmd !== "undefined") sessionStorage.clear();
    };
    window.addEventListener("unload", globalThis.KIKU.unload);
  }

  if (!globalThis.KIKU.ankiDroidAPI && typeof AnkiDroidJS !== "undefined") {
    globalThis.KIKU.ankiDroidAPI = new AnkiDroidJS({
      version: "0.0.3",
      developer: "youyoumu",
    });
  }

  let assetsPath = window.location.origin;
  const isAnkiWeb = window.location.origin.includes("ankiuser.net");
  if (isAnkiWeb) {
    assetsPath = `${window.location.origin}/study/media`;
    const kikuCss = document.getElementById("kiku-css");
    kikuCss?.remove();
  }

  try {
    let root = document.getElementById("kiku-root");
    if (!root) {
      const shadowParent = document.querySelector("#kiku-shadow-parent");
      if (shadowParent) {
        const existingRoot = shadowParent.shadowRoot?.querySelector(
          "#kiku-root",
        ) as HTMLElement | undefined | null;
        if (existingRoot && existingRoot.innerHTML.trim() === "") {
          root = existingRoot;
        } else {
          return;
        }
      } else {
        throw new Error("root not found");
      }
    }
    const cardType = (root.dataset.cardType as "mining" | "cloze") ?? "mining";
    const rootDataset = {
      theme: root.dataset.theme,
      blurNsfw: root.dataset.blurNsfw,
      pictureOnFront: root.dataset.pictureOnFront,
      modVertical: root.dataset.modVertical,
    } satisfies RootDataset;

    const qa = document.querySelector("#qa");
    if (!qa) throw new Error("qa not found");
    const shadowParent = document.createElement("div");
    shadowParent.setAttribute("id", "kiku-shadow-parent");
    qa.appendChild(shadowParent);
    const shadow = shadowParent.attachShadow({ mode: "open" });

    const style = qa.querySelector("style");
    if (style) shadow.appendChild(style.cloneNode(true));
    if (isAnkiWeb) style?.remove();

    if (import.meta.env.DEV) {
      const tailwind = document.querySelector(
        'style[type="text/css"][data-vite-dev-id$="tailwind.css"]',
      );
      if (!tailwind) throw new Error("tailwind not found");
      shadow.appendChild(tailwind.cloneNode(true));
    } else {
      const kikuCss = document.createElement("link");
      kikuCss.rel = "stylesheet";
      kikuCss.href = "./_kiku.css";
      shadow.prepend(kikuCss);
    }

    const kikuPluginCss = document.createElement("link");
    kikuPluginCss.rel = "stylesheet";
    kikuPluginCss.href = "./_kiku_plugin.css";
    shadow.prepend(kikuPluginCss);

    shadow.appendChild(root);

    let config: KikuConfig | undefined;
    try {
      const cache = sessionStorage.getItem(constants.key["kiku-config"]);
      if (cache) {
        config = validateConfig(JSON.parse(cache));
      } else {
        const res = await fetch(constants.assets["_kiku_config.json"], {
          cache: "no-store",
        });
        const json = await res.json();
        config = validateConfig(json);
        if (aborter.signal.aborted) return;
        sessionStorage.setItem(
          constants.key["kiku-config"],
          JSON.stringify(config),
        );
      }
    } catch {}

    let divs: NodeListOf<Element> | Element[] | undefined =
      document.querySelectorAll("#anki-fields > div");
    if (import.meta.env.DEV) {
      divs = Object.entries(exampleFields).map(([key, value]) => {
        const div = document.createElement("div");
        div.dataset.field = key;
        div.innerHTML = value;
        return div;
      });
    }
    const ankiFields = divs
      ? Object.fromEntries(
          Array.from(divs).map((el) => [
            (el as HTMLDivElement).dataset.field,
            el.innerHTML.trim(),
          ]),
        )
      : ankiFieldsSkeleton;

    //NOTE: AnkiMobile kanji tooltip hack https://github.com/youyoumu/kiku/issues/12#issuecomment-4216160200
    const kanjiToolTipSyle = document.createElement("style");
    kanjiToolTipSyle.innerHTML = `[data-kanji-tooltip] { display: none !important; }`;
    shadow.appendChild(kanjiToolTipSyle);
    const resetKanjiTooltip = () => {
      const kanjiTooltips = root?.querySelectorAll<HTMLSpanElement>(
        "[data-kanji-tooltip]",
      );
      Array.from(kanjiTooltips ?? []).forEach((el) => {
        el.style.display = "none";
      });
      kanjiToolTipSyle.remove();
    };

    const res = await init({
      root,
      side,
      cardType,
      ankiFields,
      ssr,
      config,
      aborter,
      ankiDroidAPI: globalThis.KIKU.ankiDroidAPI,
      logger: globalThis.KIKU.logger,
      cacheStore: globalThis.KIKU,
      assetsPath,
      isAnkiWeb,
      rootDataset,
    });
    setTimeout(resetKanjiTooltip, 50);

    Object.assign(globalThis.KIKU, res);
    if (import.meta.env.DEV) root.dataset.side = side;
  } catch (e) {
    sessionStorage.clear();
    Object.assign(document.body.style, {
      margin: 0,
      padding: 0,
      height: "100vh",
      width: "100vw",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "oklch(21.15% .012 254.09)",
      color: "oklch(71% .194 13.428)",
      textAlign: "center",
    });
    const isError = e instanceof Error;
    const outdatedAnki = typeof Promise.withResolvers !== "function";
    const updateNotice = `
        <span>Update Anki to at least 
          <a 
            href='https://apps.ankiweb.net/' 
            target='_blank'
            style='color: aqua; text-decoration: underline'
          >
            25.09
          </a>
        </span>`;
    document.body.innerHTML = isError
      ? `
        <span>Failed to render card.</span>
        <span><b>Error Name:</b> ${e.name}</span>
        <span><b>Error Message:</b> ${e.message}</span>
        <span><b>Error Cause:</b> ${e.cause ?? "N/A"}</span>
        <span><b>Error Stack:</b><br>
          <pre style="white-space: pre-wrap; background: oklch(82% .189 84.429); color: oklch(41% .112 45.904); padding: 8px;">
            ${e.stack}
          </pre>
        </span><br>
        ${outdatedAnki ? updateNotice : ""}
        <span>If you feel you messed up something, try to reinstall Kiku.</span>
      `
      : `<span>Something went wrong.</span>`;
  }
}
