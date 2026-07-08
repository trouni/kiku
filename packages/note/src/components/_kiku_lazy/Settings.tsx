import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { Portal } from "solid-js/web";
import { useCardContext } from "#/components/shared/CardContext";
import {
  type DefinitionStyle,
  getCssVar,
  type KikuConfig,
  type RootDatasetKey,
  rootDatasetConfigWhitelist,
  type TailwindContainerSize,
  type TailwindSize,
  tailwindContainerSize,
  tailwindFontSizeVar,
  tailwindSize,
} from "#/util/config";
import { defaultConfig } from "#/util/default-config";
import { type WebFont, webFonts } from "#/util/fonts";
import { constants } from "#/util/general";
import { useNavigationTransition, useThemeTransition } from "#/util/hooks";
import { daisyUIThemes } from "#/util/theme";
import { useAnkiFieldContext } from "../shared/AnkiFieldsContext";
import { useConfigContext } from "../shared/ConfigContext";
import { useCtxContext } from "../shared/CtxContext";
import { useGeneralContext } from "../shared/GeneralContext";
import HeaderSettings from "./HeaderSettings";
import { ClipboardCopyIcon, InfoIcon, RefreshCwIcon, UndoIcon } from "./Icons";
import { AnkiConnect } from "./util/anki-connect";
import { capitalize } from "./util/general";

function toDashed(str: string) {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function toDatasetKey(str: string) {
  return `data-${str}`;
}

function toDatasetString(obj: Record<string, string | number | boolean>) {
  return Object.entries(obj)
    .map(([key, value]) => {
      const dashed = toDashed(key);
      return `${toDatasetKey(dashed)}="${value}"`;
    })
    .join("\n");
}

function toCssVarString(obj: Record<string, string>) {
  const txt = Object.entries(obj)
    .map(([key, value]) => {
      if (value === "") value = "undefined";
      return `${key}: ${value.replaceAll("\n", "").replaceAll("'", '"')};`;
    })
    .join("\n");
  return txt;
}

export default function Settings() {
  const [$config] = useConfigContext();
  const [$card, _$setCard] = useCardContext();
  const [$general, $setGeneral] = useGeneralContext();
  const { navigateBack } = useNavigationTransition();

  const saveConfig = async () => {
    try {
      $general.logger.debug("Saving config:", $config);
      await AnkiConnect.saveConfig($config);
      $general.toast.success("Saved! Restart Anki to apply changes.");
    } catch (e) {
      $general.toast.error(
        `Failed to save config: ${e instanceof Error ? e.message : ""}`,
      );
    }
  };

  const ctx = useCtxContext();
  onMount(() => {
    try {
      $general.plugin?.onSettingsMount?.({ ctx });
    } catch {}
  });

  return (
    <>
      <HeaderSettings />
      <div>
        <GeneralSettings />
        <div class="divider"></div>
        <DefinitionSettings />
        <div class="divider"></div>
        <ModSettings />
        <div class="divider"></div>
        <ThemeSettings />
        <div class="divider"></div>
        <FontSettings />
        <div class="divider"></div>
        <FontSizeSettings />
        <div class="divider"></div>
        <AnkiDroidSettings />
        <div class="divider"></div>
        <KeybindSettings />
        <div class="divider"></div>
        <DebugSettings />
        <div class="divider"></div>
        <div class="pb-16"></div>
        <Portal mount={$general.layoutRef}>
          <div
            class="bottom-0 w-full"
            classList={{
              fixed: !$general.isAnkiWeb,
              absolute: $general.isAnkiWeb,
            }}
          >
            <div class="mx-auto w-full relative layout-max-width">
              <div class="flex flex-row gap-2 justify-end animate-fade-in mb-4 px-2 sm:px-4">
                <button
                  class="btn"
                  on:click={() => navigateBack()}
                  on:touchend={(e) => e.stopPropagation()}
                >
                  Back
                </button>
                <button
                  class="btn"
                  classList={{
                    "btn-primary": $general.isAnkiConnectAvailable,
                    "btn-disabled bg-base-300 text-base-content-faint":
                      !$general.isAnkiConnectAvailable,
                  }}
                  disabled={!$general.isAnkiConnectAvailable}
                  on:click={saveConfig}
                  on:touchend={(e) => e.stopPropagation()}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </Portal>
      </div>
    </>
  );
}

function KikuVersion() {
  const [latestVersion, setLatestVersion] = createSignal<string | null>(
    (() => {
      const cached = sessionStorage.getItem(
        constants.key["kiku-latest-version"],
      );
      return cached && cached !== constants.KIKU_VERSION ? cached : null;
    })(),
  );

  onMount(async () => {
    try {
      if (
        sessionStorage.getItem(constants.key["kiku-latest-version-checked"])
      ) {
        return;
      }

      const res = await fetch(
        "https://api.github.com/repos/youyoumu/kiku/releases/latest",
      );
      if (!res.ok) return;
      const data = await res.json();
      sessionStorage.setItem(
        constants.key["kiku-latest-version-checked"],
        "true",
      );
      if (data?.tag_name) {
        const v = data.tag_name.replace(/^v/, "");
        sessionStorage.setItem(constants.key["kiku-latest-version"], v);
        if (v !== constants.KIKU_VERSION) {
          setLatestVersion(v);
        }
      }
    } catch (e) {
      // Ignore
    }
  });

  return (
    <div class="flex flex-col items-center text-base-content-faint justify-center">
      <div class="text-base-content-subtle-200 text-6xl">菊</div>
      <div class="flex items-center gap-1.5">
        <div
          classList={{ tooltip: !!latestVersion() }}
          class="tooltip-bottom tooltip-info"
          data-tip={
            latestVersion()
              ? `Update Available: v${latestVersion()}`
              : undefined
          }
        >
          <a
            href="https://github.com/youyoumu/kiku/releases/latest"
            target="_blank"
            rel="noreferrer"
            class="text-sm"
          >
            Kiku Note v{constants.KIKU_VERSION}
          </a>
        </div>
        <Show when={latestVersion()}>
          <span class="status status-info"></span>
        </Show>
      </div>
    </div>
  );
}

function GeneralSettings() {
  const [$general] = useGeneralContext();
  const [$config, $setConfig] = useConfigContext();

  return (
    <div class="flex flex-col gap-4 animate-fade-in relative">
      <KikuVersion />

      <Show when={$general.isConfigOutOfSync}>
        <div role="alert" class="alert alert-warning">
          <span>
            The card template is out of sync with your current theme or display
            settings. Until you click Save and restart Anki, there might be a
            flash of the wrong theme.
          </span>
        </div>
      </Show>
      <div class="flex gap-2 items-center justify-between">
        <div class="text-2xl font-bold">General</div>
      </div>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] rounded-box gap-4">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">
            Web Volume
            <div
              class="tooltip"
              data-tip="Controls the volume of audio played in the webview (Desktop and AnkiWeb only)."
            >
              <InfoIcon class="size-4 text-base-content-calm" />
            </div>
          </legend>

          <input
            on:change={(e) => {
              const value = e.target.value;
              $setConfig("volume", Number(value));
            }}
            type="range"
            min="0"
            max={"100"}
            value={$config.volume.toString()}
            class="range w-full range-sm"
            step="1"
          />
        </fieldset>
        <fieldset class="fieldset py-0">
          <legend class="fieldset-legend">Blur NSFW</legend>
          <label class="label">
            <input
              type="checkbox"
              checked={$config.blurNsfw}
              class="toggle"
              on:change={(e) => {
                $setConfig("blurNsfw", e.target.checked);
              }}
            />
          </label>
        </fieldset>
        <fieldset class="fieldset py-0">
          <legend class="fieldset-legend">Picture on Front</legend>
          <label class="label">
            <input
              type="checkbox"
              checked={$config.pictureOnFront}
              class="toggle"
              on:change={(e) => {
                $setConfig("pictureOnFront", e.target.checked);
              }}
            />
          </label>
        </fieldset>
        <fieldset class="fieldset py-0">
          <legend class="fieldset-legend">
            Mute NSFW
            <div
              class="tooltip"
              data-tip="Prevent SentenceAudio from playing on NSFW cards. Has known problem with old AnkiDroid study screen"
            >
              <InfoIcon class="size-4 text-base-content-calm" />
            </div>
          </legend>
          <label class="label">
            <input
              type="checkbox"
              checked={$config.muteNsfw}
              class="toggle"
              on:change={(e) => {
                $setConfig("muteNsfw", e.target.checked);
              }}
            />
          </label>
        </fieldset>
        <fieldset class="fieldset py-0">
          <legend class="fieldset-legend">Show Theme</legend>
          <label class="label">
            <input
              type="checkbox"
              checked={$config.showTheme}
              class="toggle"
              on:change={(e) => {
                $setConfig("showTheme", e.target.checked);
              }}
            />
          </label>
        </fieldset>
        <fieldset class="fieldset py-0">
          <legend class="fieldset-legend">
            Mobile Layout Alt
            <div
              class="tooltip"
              data-tip="Swap Sentence and Definition position on mobile"
            >
              <InfoIcon class="size-4 text-base-content-calm" />
            </div>
          </legend>
          <label class="label">
            <input
              type="checkbox"
              checked={$config.swapSentenceAndDefinitionOnMobile}
              class="toggle"
              on:change={(e) => {
                $setConfig(
                  "swapSentenceAndDefinitionOnMobile",
                  e.target.checked,
                );
              }}
            />
          </label>
        </fieldset>
        <fieldset class="fieldset py-0">
          <legend class="fieldset-legend">
            Prefer AnkiConnect
            <div
              class="tooltip"
              data-tip="Query notes via AnkiConnect instead of the notes cache (Desktop only). May be slower and cause Anki to lag under heavy queries"
            >
              <InfoIcon class="size-4 text-base-content-calm" />
            </div>
          </legend>
          <label class="label">
            <input
              type="checkbox"
              checked={$config.preferAnkiConnect}
              class="toggle"
              on:change={(e) => {
                $setConfig("preferAnkiConnect", e.target.checked);
              }}
            />
          </label>
        </fieldset>
        <fieldset class="fieldset">
          <legend class="fieldset-legend">Layout Max Width</legend>
          <input
            on:change={(e) => {
              const target = e.target as HTMLInputElement;
              const value = tailwindContainerSize[
                Number(target.value)
              ] as TailwindContainerSize;
              $setConfig("layoutMaxWidth", value);
            }}
            type="range"
            min="0"
            max={(tailwindContainerSize.length - 1).toString()}
            value={tailwindContainerSize
              .indexOf($config.layoutMaxWidth)
              .toString()}
            class="range w-full range-sm"
            step="1"
          />
          <div class="flex justify-between px-2.5 text-xs">
            <For each={tailwindContainerSize}>{(_) => <span>|</span>}</For>
          </div>
          <div class="flex justify-between px-2.5 text-xs">
            <For each={tailwindContainerSize}>
              {(label) => <span>{label}</span>}
            </For>
          </div>
        </fieldset>
      </div>
    </div>
  );
}

function DefinitionSettings() {
  const [$config, $setConfig] = useConfigContext();

  return (
    <div class="flex flex-col gap-4 animate-fade-in relative">
      <div class="flex gap-2 items-center justify-between">
        <div class="text-2xl font-bold">Definition</div>
      </div>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] rounded-box gap-4">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">Style</legend>
          <select
            class="select w-full"
            on:change={(e) => {
              const target = e.target as HTMLSelectElement;
              $setConfig("definitionStyle", target.value as DefinitionStyle);
            }}
          >
            <option
              value="normal"
              selected={$config.definitionStyle === "normal"}
            >
              Normal (3 Pages)
            </option>
            <option
              value="single-page"
              selected={$config.definitionStyle === "single-page"}
            >
              Single Page (Appended)
            </option>
            <option
              value="glossary-split"
              selected={$config.definitionStyle === "glossary-split"}
            >
              Glossary Split (Per Dictionary)
            </option>
          </select>
          <div class="fieldset-label text-xs opacity-70">
            {(() => {
              if ($config.definitionStyle === "normal")
                return "Shows Selection, Main Definition, and Glossary as separate pages.";
              if ($config.definitionStyle === "single-page")
                return "Appends all definitions into a single scrollable page.";
              return "Splits the glossary into individual pages for each dictionary.";
            })()}
          </div>
        </fieldset>
        <fieldset class="fieldset py-0">
          <legend class="fieldset-legend">
            Collect Glossary Images
            <div
              class="tooltip"
              data-tip="Show images extracted from the glossary in the definition picture section."
            >
              <InfoIcon class="size-4 text-base-content-calm" />
            </div>
          </legend>
          <label class="label">
            <input
              type="checkbox"
              checked={$config.definitionPictureFromGlossary}
              class="toggle"
              on:change={(e) => {
                $setConfig("definitionPictureFromGlossary", e.target.checked);
              }}
            />
          </label>
        </fieldset>
      </div>
    </div>
  );
}

function ModSettings() {
  const [$config, $setConfig] = useConfigContext();

  return (
    <div class="flex flex-col gap-4 animate-fade-in relative">
      <div class="flex gap-2 items-center justify-between">
        <div class="text-2xl font-bold">Mod</div>
      </div>

      <div>
        <div class="text-lg font-bold flex gap-2 items-center">
          Hidden
          <div class="tooltip" data-tip="Expression fade out after timeout">
            <InfoIcon class="size-4 text-base-content-calm" />
          </div>
        </div>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] rounded-box gap-4">
          <fieldset class="fieldset py-0">
            <legend class="fieldset-legend">Enable</legend>
            <label class="label">
              <input
                type="checkbox"
                checked={$config.modHidden}
                class="toggle"
                on:change={(e) => {
                  $setConfig("modHidden", e.target.checked);
                }}
              />
            </label>
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Timeout</legend>
            <input
              on:change={(e) => {
                const value = e.target.value;
                $setConfig("modHiddenDuration", Number(value));
              }}
              type="range"
              min="1000"
              max={"5000"}
              value={$config.modHiddenDuration.toString()}
              class="range w-full range-sm"
              step="1000"
            />
            <div class="flex justify-between px-2.5 text-xs">
              <span>|</span>
              <span>|</span>
              <span>|</span>
              <span>|</span>
              <span>|</span>
            </div>
            <div class="flex justify-between px-2.5 text-xs">
              <span>1s</span>
              <span>2s</span>
              <span>3s</span>
              <span>4s</span>
              <span>5s</span>
            </div>
          </fieldset>
        </div>
      </div>
      <div>
        <div class="text-lg font-bold flex gap-2 items-center">
          Vertical
          <div
            class="tooltip"
            data-tip="Expression appears in the vertical direction"
          >
            <InfoIcon class="size-4 text-base-content-calm" />
          </div>
        </div>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] rounded-box gap-4">
          <fieldset class="fieldset py-0">
            <legend class="fieldset-legend">Enable</legend>
            <label class="label">
              <input
                type="checkbox"
                checked={$config.modVertical}
                class="toggle"
                on:change={(e) => {
                  $setConfig("modVertical", e.target.checked);
                }}
              />
            </label>
          </fieldset>
        </div>
      </div>
    </div>
  );
}

function ThemeSettings() {
  const [$config, _$setConfig] = useConfigContext();
  const changeTheme = useThemeTransition();

  return (
    <div class="flex flex-col gap-4 animate-fade-in">
      <div class="text-2xl font-bold">Theme</div>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] rounded-box gap-4">
        {daisyUIThemes.map((theme) => {
          return (
            <div
              class="border-base-content/20 hover:border-base-content/40 overflow-hidden rounded-lg border outline-2 outline-offset-2 tappable"
              classList={{
                "outline-2": theme === $config.theme,
              }}
              on:click={() => {
                changeTheme(theme);
              }}
              on:touchend={(e) => e.stopPropagation()}
            >
              <div class="bg-base-100 text-base-content w-full cursor-pointer">
                <div class="grid grid-cols-5 grid-rows-3" data-theme={theme}>
                  <div class="bg-base-200 col-start-1 row-span-2 row-start-1"></div>
                  <div class="bg-base-300 col-start-1 row-start-3"></div>
                  <div class="bg-base-100 col-span-4 col-start-2 row-span-3 row-start-1 flex flex-col gap-1 p-2">
                    <div class="font-bold">{capitalize(theme)}</div>
                    <div class="flex flex-wrap gap-1">
                      <div class="bg-primary flex aspect-square w-5 items-center justify-center rounded">
                        <div class="text-primary-content text-sm font-bold">
                          A
                        </div>
                      </div>
                      <div class="bg-secondary flex aspect-square w-5 items-center justify-center rounded">
                        <div class="text-secondary-content text-sm font-bold">
                          A
                        </div>
                      </div>
                      <div class="bg-accent flex aspect-square w-5 items-center justify-center rounded">
                        <div class="text-accent-content text-sm font-bold">
                          A
                        </div>
                      </div>
                      <div class="bg-neutral flex aspect-square w-5 items-center justify-center rounded">
                        <div class="text-neutral-content text-sm font-bold">
                          A
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FontSettings() {
  const [$config, $setConfig] = useConfigContext();

  return (
    <div class="flex flex-col gap-4 animate-fade-in">
      <div class="text-2xl font-bold">Font</div>
      <div>
        <div class="text-lg font-bold">Primary</div>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] rounded-box gap-4">
          <fieldset
            class="fieldset"
            classList={{
              hidden: $config.useSystemFontPrimary,
            }}
            on:change={(e) => {
              const target = e.target as HTMLSelectElement;
              $setConfig("webFontPrimary", target.value as WebFont);
            }}
          >
            <legend class="fieldset-legend">Web Font</legend>
            <select class="select w-full">
              {webFonts.map((font) => {
                return (
                  <option
                    value={font}
                    selected={$config.webFontPrimary === font}
                  >
                    <span class="font-primary" style={{ "font-family": font }}>
                      {font}
                    </span>
                  </option>
                );
              })}
            </select>
          </fieldset>
          <fieldset
            class="fieldset"
            classList={{
              hidden: !$config.useSystemFontPrimary,
            }}
          >
            <legend class="fieldset-legend">
              System Font
              <button
                on:click={() => {
                  $setConfig(
                    "systemFontPrimary",
                    defaultConfig.systemFontPrimary,
                  );
                }}
                on:touchend={(e) => e.stopPropagation()}
              >
                <UndoIcon
                  class="size-4 cursor-pointer"
                  classList={{
                    hidden:
                      $config.systemFontPrimary ===
                      defaultConfig.systemFontPrimary,
                  }}
                />
              </button>
            </legend>
            <input
              type="text"
              class="input w-full"
              placeholder={
                "'Inter', 'SF Pro Display', 'Liberation Sans', 'Segoe UI', 'Hiragino Kaku Gothic ProN', 'Noto Sans CJK JP', 'Noto Sans JP', 'Meiryo', HanaMinA, HanaMinB, sans-serif"
              }
              value={$config.systemFontPrimary}
              on:input={(e) => {
                $setConfig(
                  "systemFontPrimary",
                  (e.target as HTMLInputElement).value,
                );
              }}
            />
          </fieldset>

          <fieldset class="fieldset bg-base-100 border-base-300 rounded-box w-64 py-4">
            <legend class="fieldset-legend">Use System Font</legend>
            <label class="label text-base-content-soft">
              <input
                type="checkbox"
                checked={$config.useSystemFontPrimary}
                class="toggle"
                on:change={(e) => {
                  $setConfig("useSystemFontPrimary", e.target.checked);
                }}
              />
              {$config.useSystemFontPrimary
                ? "Using System Font"
                : "Using Web Font"}
            </label>
          </fieldset>
        </div>
      </div>

      <div>
        <div class="text-lg font-bold">Secondary</div>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] rounded-box gap-4">
          <fieldset
            class="fieldset"
            classList={{
              hidden: $config.useSystemFontSecondary,
            }}
            on:change={(e) => {
              const target = e.target as HTMLSelectElement;
              $setConfig("webFontSecondary", target.value as WebFont);
            }}
          >
            <legend class="fieldset-legend">Web Font</legend>
            <select class="select w-full">
              {webFonts.map((font) => {
                return (
                  <option
                    value={font}
                    selected={$config.webFontSecondary === font}
                  >
                    <span
                      class="font-secondary"
                      style={{ "font-family": font }}
                    >
                      {font}
                    </span>
                  </option>
                );
              })}
            </select>
          </fieldset>
          <fieldset
            class="fieldset"
            classList={{
              hidden: !$config.useSystemFontSecondary,
            }}
          >
            <legend class="fieldset-legend">
              System Font
              <button
                on:click={() => {
                  $setConfig(
                    "systemFontSecondary",
                    defaultConfig.systemFontSecondary,
                  );
                }}
                on:touchend={(e) => e.stopPropagation()}
              >
                <UndoIcon
                  class="size-4 cursor-pointer"
                  classList={{
                    hidden:
                      $config.systemFontSecondary ===
                      defaultConfig.systemFontSecondary,
                  }}
                />
              </button>
            </legend>
            <input
              type="text"
              class="input w-full"
              placeholder={
                "'Hiragino Mincho ProN', 'Noto Serif CJK JP', 'Noto Serif JP', 'Yu Mincho', HanaMinA, HanaMinB, serif"
              }
              value={$config.systemFontSecondary}
              on:input={(e) => {
                $setConfig(
                  "systemFontSecondary",
                  (e.target as HTMLInputElement).value,
                );
              }}
            />
          </fieldset>

          <fieldset class="fieldset bg-base-100 border-base-300 rounded-box w-64 py-4">
            <legend class="fieldset-legend">Use System Font</legend>
            <label class="label text-base-content-soft">
              <input
                type="checkbox"
                checked={$config.useSystemFontSecondary}
                class="toggle"
                on:change={(e) => {
                  $setConfig("useSystemFontSecondary", e.target.checked);
                }}
              />
              {$config.useSystemFontSecondary
                ? "Using System Font"
                : "Using Web Font"}
            </label>
          </fieldset>
        </div>
      </div>
    </div>
  );
}

function FontSizeSettings() {
  return (
    <div class="flex flex-col gap-4 animate-fade-in">
      <div class="collapse gap-4 collapse-arrow">
        <input type="checkbox" />
        <div class="collapse-title p-0">
          <div class="text-2xl font-bold">Font Size</div>
        </div>
        <div class="collapse-content p-0 flex flex-col gap-4">
          <div>
            <div class="text-lg font-bold">Mobile</div>
            {/* biome-ignore format: this looks nicer */}
            <div class="grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] rounded-box gap-x-4 gap-y-4 sm:gap-y-2">
          <FontSizeSettingsFieldset configKey="fontSizeBaseExpression" label="Expression" />
          <FontSizeSettingsFieldset configKey="fontSizeBasePitch" label="Pitch" />
          <FontSizeSettingsFieldset configKey="fontSizeBaseSentence" label="Sentence" />
          <FontSizeSettingsFieldset configKey="fontSizeBaseMiscInfo" label="Misc Info" />
          <FontSizeSettingsFieldset configKey="fontSizeBaseHint" label="Hint" />
        </div>
          </div>
          <div>
            <div class="text-lg font-bold">Desktop</div>
            {/* biome-ignore format: this looks nicer */}
            <div class="grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] rounded-box gap-x-4 gap-y-4 sm:gap-y-2">
          <FontSizeSettingsFieldset configKey="fontSizeSmExpression" label="Expression" />
          <FontSizeSettingsFieldset configKey="fontSizeSmPitch" label="Pitch" />
          <FontSizeSettingsFieldset configKey="fontSizeSmSentence" label="Sentence" />
          <FontSizeSettingsFieldset configKey="fontSizeSmMiscInfo" label="Misc Info" />
          <FontSizeSettingsFieldset configKey="fontSizeSmHint" label="Hint" />
        </div>
          </div>
          <FontScaleSettings />
        </div>
      </div>
    </div>
  );
}

function FontScaleSettings() {
  const [$config, $setConfig] = useConfigContext();

  return (
    <div>
      <div class="text-lg font-bold flex gap-2 items-center">
        Scale with Reviews
        <div
          class="tooltip"
          data-tip="Shrink the expression as a card's review interval grows"
        >
          <InfoIcon class="size-4 text-base-content-calm" />
        </div>
      </div>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] rounded-box gap-x-4 gap-y-4 sm:gap-y-2">
        <fieldset class="fieldset py-0">
          <legend class="fieldset-legend">Enable</legend>
          <label class="label">
            <input
              type="checkbox"
              checked={$config.fontScaleEnabled}
              class="toggle"
              on:change={(e) => {
                $setConfig("fontScaleEnabled", e.target.checked);
              }}
            />
          </label>
        </fieldset>
        <FontScaleRangeFieldset
          configKey="fontScaleMinPx"
          label="Min Font Size"
          min={8}
          max={48}
          step={1}
          unit="px"
        />
        <FontScaleRangeFieldset
          configKey="fontScaleMaxPx"
          label="Max Font Size"
          min={16}
          max={128}
          step={2}
          unit="px"
        />
        <FontScaleRangeFieldset
          configKey="fontScaleMaxIntervalDays"
          label="Max Interval"
          min={5}
          max={120}
          step={5}
          unit="d"
        />
      </div>
    </div>
  );
}

function FontScaleRangeFieldset(props: {
  configKey: "fontScaleMinPx" | "fontScaleMaxPx" | "fontScaleMaxIntervalDays";
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}) {
  const [$config, $setConfig] = useConfigContext();
  const value = () => $config[props.configKey];
  const disabled = () => !$config.fontScaleEnabled;

  return (
    <fieldset class="fieldset" classList={{ "opacity-50": disabled() }}>
      <legend class="fieldset-legend">
        {props.label}{" "}
        <button
          on:click={() => {
            $setConfig(props.configKey, defaultConfig[props.configKey]);
          }}
          on:touchend={(e) => e.stopPropagation()}
        >
          <UndoIcon
            class="size-4 cursor-pointer"
            classList={{
              hidden:
                $config[props.configKey] === defaultConfig[props.configKey],
            }}
          />
        </button>
      </legend>
      <input
        type="range"
        min={props.min.toString()}
        max={props.max.toString()}
        step={props.step.toString()}
        value={value().toString()}
        disabled={disabled()}
        class="range range-xs w-full"
        on:change={(e) => {
          $setConfig(props.configKey, Number(e.target.value));
        }}
      />
      <div class="flex justify-between px-2 mt-1 text-xs">
        <span>
          {props.min}
          {props.unit}
        </span>
        <span>
          {value()}
          {props.unit}
        </span>
        <span>
          {props.max}
          {props.unit}
        </span>
      </div>
    </fieldset>
  );
}

function FontSizeSettingsFieldset(props: {
  configKey: keyof KikuConfig;
  label: string;
}) {
  const [$config, $setConfig] = useConfigContext();
  const configValue = () => $config[props.configKey] as TailwindSize;

  return (
    <div class="w-full">
      <fieldset class="fieldset">
        <legend class="fieldset-legend">
          {props.label}{" "}
          <button
            on:click={() => {
              $setConfig(props.configKey, defaultConfig[props.configKey]);
            }}
            on:touchend={(e) => e.stopPropagation()}
          >
            <UndoIcon
              class="size-4 cursor-pointer"
              classList={{
                hidden:
                  $config[props.configKey] === defaultConfig[props.configKey],
              }}
            />
          </button>
        </legend>

        <div class="tooltip">
          <div class="tooltip-content">
            <div
              class={`font-secondary`}
              style={{
                "font-size": tailwindFontSizeVar[configValue()].fontSize,
                "line-height": tailwindFontSizeVar[configValue()].lineHeight,
              }}
            >
              あ
            </div>
          </div>
          <input
            on:change={(e) => {
              const target = e.target as HTMLInputElement;
              const value = tailwindSize[Number(target.value)] as TailwindSize;
              $setConfig(props.configKey, value);
            }}
            type="range"
            min="0"
            max={(tailwindSize.length - 1).toString()}
            value={tailwindSize.indexOf(configValue()).toString()}
            class="range range-xs w-full "
            step="1"
          />
        </div>
        <div class="flex justify-between px-2 mt-1 text-xs">
          <For each={tailwindSize}>{(_) => <span>|</span>}</For>
        </div>
        <div class="flex justify-between px-2 mt-1 text-xs">
          <For each={tailwindSize}>{(label) => <span>{label}</span>}</For>
        </div>
      </fieldset>
    </div>
  );
}

function ClipboardCopyButton(props: { text: string | (() => string) }) {
  const [$general] = useGeneralContext();

  function copyToClipboard() {
    const text = typeof props.text === "function" ? props.text() : props.text;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        $general.toast.success("Copied to clipboard!");
      })
      .catch(() => {
        $general.toast.error(
          "Copy to clipboard is not supported, you can select and CTRL+C manually.",
        );
      });
  }

  return (
    <button
      on:click={copyToClipboard}
      on:touchend={(e) => e.stopPropagation()}
      classList={{
        hidden: $general.isAnkiDesktop,
      }}
    >
      <ClipboardCopyIcon class="size-4 text-base-content-calm cursor-pointer" />
    </button>
  );
}

function AnkiDroidSettings() {
  const [$config, $setConfig] = useConfigContext();

  return (
    <div class="flex flex-col gap-2 animate-fade-in">
      <div class="text-2xl font-bold">AnkiDroid</div>
      <div>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] rounded-box gap-x-4 gap-y-2">
          <fieldset class="fieldset bg-base-100 border-base-300 rounded-box">
            <legend class="fieldset-legend">Enable Integration</legend>
            <label class="label">
              <input
                type="checkbox"
                checked={$config.ankiDroidEnableIntegration}
                class="toggle"
                on:change={(e) => {
                  $setConfig("ankiDroidEnableIntegration", e.target.checked);
                }}
              />
            </label>
          </fieldset>

          <fieldset class="fieldset bg-base-100 border-base-300 rounded-box">
            <legend class="fieldset-legend">Reverse Swipe Direction</legend>
            <label class="label">
              <input
                type="checkbox"
                checked={$config.ankiDroidReverseSwipeDirection}
                class="toggle"
                on:change={(e) => {
                  $setConfig(
                    "ankiDroidReverseSwipeDirection",
                    e.target.checked,
                  );
                }}
              />
            </label>
          </fieldset>
        </div>
      </div>
    </div>
  );
}

function KeybindSettings() {
  return (
    <div class="flex flex-col gap-4 animate-fade-in relative">
      <div class="text-2xl font-bold">Keybind</div>

      <div class="grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] rounded-box gap-4">
        <div>
          <div class="text-lg font-bold">Definition Page</div>
          <div class="grid grid-cols-2 gap-4">
            <KeybindInput label="Previous" configKey="keybindDefinitionPrev" />
            <KeybindInput label="Next" configKey="keybindDefinitionNext" />
          </div>
        </div>
        <div>
          <div class="text-lg font-bold">Field Group</div>
          <div class="grid grid-cols-2 gap-4">
            <KeybindInput label="Previous" configKey="keybindFieldGroupPrev" />
            <KeybindInput label="Next" configKey="keybindFieldGroupNext" />
          </div>
        </div>
      </div>
    </div>
  );
}

function KeybindInput(props: { label: string; configKey: keyof KikuConfig }) {
  const [$config, $setConfig] = useConfigContext();
  const [isRecording, setIsRecording] = createSignal(false);

  const onKeyDown = (e: KeyboardEvent) => {
    if (!isRecording()) return;
    e.preventDefault();
    $setConfig(props.configKey, e.key);
    setIsRecording(false);
  };

  return (
    <fieldset class="fieldset">
      <legend class="fieldset-legend">
        {props.label}{" "}
        <button
          on:click={() => {
            $setConfig(props.configKey, defaultConfig[props.configKey]);
          }}
          on:touchend={(e) => e.stopPropagation()}
        >
          <UndoIcon
            class="size-4 cursor-pointer"
            classList={{
              hidden:
                $config[props.configKey] === defaultConfig[props.configKey],
            }}
          />
        </button>
      </legend>
      <button
        type="button"
        class="btn btn-sm w-full font-mono"
        classList={{ "btn-primary": isRecording() }}
        on:click={() => setIsRecording(!isRecording())}
        on:touchend={(e) => e.stopPropagation()}
        on:keydown={onKeyDown}
      >
        {isRecording()
          ? "Press any key..."
          : ($config[props.configKey] as string)}
      </button>
    </fieldset>
  );
}

function DebugSettings() {
  const [$config, $setConfig] = useConfigContext();
  const [$card] = useCardContext();
  const { ankiFields } = useAnkiFieldContext<"back">();
  const [kikuFiles, setKikuFiles] = createSignal<string>();
  const [missingFiles, setMissingFiles] = createSignal<string>();
  const [$general, _$setGeneral] = useGeneralContext();

  createEffect(async () => {
    if ($general.isAnkiConnectAvailable) {
      const files = await AnkiConnect.getKikuFiles();
      setKikuFiles(JSON.stringify(files, null, 2));
      const missing = constants.KIKU_IMPORTANT_FILES.filter((file) => {
        return !files.includes(file);
      });
      setMissingFiles(missing.join(", "));
    }
  });

  const [logs, setLogs] = createSignal<string>();
  onMount(() => {
    const id = setInterval(() => {
      setLogs($general.logger.get());
    }, 8000);
    onCleanup(() => {
      clearInterval(id);
    });
    setLogs($general.logger.get());
  });

  const rootDataset = () => {
    return Object.fromEntries(
      Object.entries($config).filter(([key]) => {
        return rootDatasetConfigWhitelist.has(key as RootDatasetKey);
      }),
    );
  };

  const cssVar = () => getCssVar($config);

  return (
    <div class="collapse collapse-arrow">
      <input type="checkbox" />
      <div class="collapse-title text-2xl font-bold p-0">Debug</div>
      <div class="collapse-content p-0">
        <div class="flex flex-col gap-4 animate-fade-in ">
          <div class="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] rounded-box gap-x-4 gap-y-2">
            <fieldset class="fieldset">
              <legend class="fieldset-legend">
                AnkiConnect Address
                <button
                  on:click={() => {
                    $setConfig(
                      "ankiConnectAddress",
                      defaultConfig.ankiConnectAddress,
                    );
                  }}
                  on:touchend={(e) => e.stopPropagation()}
                >
                  <UndoIcon
                    class="size-4 cursor-pointer"
                    classList={{
                      hidden:
                        $config.ankiConnectAddress ===
                        defaultConfig.ankiConnectAddress,
                    }}
                  />
                </button>
              </legend>
              <input
                type="text"
                class="input w-full"
                placeholder={defaultConfig.ankiConnectAddress}
                value={$config.ankiConnectAddress}
                on:input={(e) => {
                  const value = (e.target as HTMLInputElement).value;
                  $setConfig("ankiConnectAddress", value);
                }}
              />
            </fieldset>
            <fieldset class="fieldset bg-base-100 border-base-300 rounded-box w-64 py-4">
              <legend class="fieldset-legend">Show Startup Time</legend>
              <label class="label">
                <input
                  type="checkbox"
                  checked={$config.showStartupTime}
                  class="toggle"
                  on:change={(e) => {
                    $setConfig("showStartupTime", e.target.checked);
                  }}
                />
              </label>
            </fieldset>
          </div>
          <div class="flex flex-col gap-2">
            <div class="flex gap-2 items-center">
              <div class="text-lg">Expected Root Dataset</div>
              <ClipboardCopyButton
                text={() => toDatasetString(rootDataset())}
              />
            </div>
            <pre class="text-xs bg-base-200 p-4 rounded-lg overflow-auto">
              <span class="opacity-25 select-none">{"<div\n"}</span>
              {toDatasetString(rootDataset())}
              <span class="opacity-25 select-none">{"\n>"}</span>
            </pre>
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex gap-2 items-center">
              <div class="text-lg">Expected CSS Variable</div>
              <ClipboardCopyButton text={() => toCssVarString(cssVar())} />
            </div>
            <pre class="text-xs bg-base-200 p-4 rounded-lg overflow-auto">
              <span class="opacity-25 select-none">{":root, :host {\n"}</span>
              {toCssVarString(cssVar())}
              <span class="opacity-25 select-none">{"\n}"}</span>
            </pre>
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex gap-2 items-center">
              <div class="text-lg">Config</div>
              <ClipboardCopyButton
                text={() => JSON.stringify({ ...$config }, null, 2)}
              />
            </div>
            <pre class="text-xs bg-base-200 p-4 rounded-lg overflow-auto">
              {JSON.stringify({ ...$config }, null, 2)}
            </pre>
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex gap-2 items-center">
              <div class="text-lg">Anki Fields</div>
              <ClipboardCopyButton
                text={() => JSON.stringify({ ...ankiFields }, null, 2)}
              />
            </div>
            <pre class="text-xs bg-base-200 p-4 rounded-lg overflow-auto">
              {JSON.stringify({ ...ankiFields }, null, 2)}
            </pre>
          </div>
          <Show when={kikuFiles()}>
            <div class="flex flex-col gap-2">
              <div class="flex gap-2 items-center">
                <div class="text-lg">Kiku Files</div>
                <ClipboardCopyButton text={() => kikuFiles() ?? ""} />
              </div>

              <Show when={missingFiles()}>
                <div role="alert" class="alert alert-warning">
                  <span>
                    Some files are missing, things may not work as expected.
                    <br />
                    <span class="text-xs ">{missingFiles()}</span>
                  </span>
                </div>
              </Show>
              <pre class="text-xs bg-base-200 p-4 rounded-lg overflow-auto">
                {kikuFiles()}
              </pre>
            </div>
          </Show>
          <div class="flex flex-col gap-2">
            <div class="flex gap-2 items-center">
              <div class="text-lg">Logs</div>
              <ClipboardCopyButton text={() => logs() ?? ""} />

              <button
                on:click={() => {
                  setLogs($general.logger.get());
                }}
                on:touchend={(e) => e.stopPropagation()}
              >
                <RefreshCwIcon class="size-4 text-base-content-calm cursor-pointer" />
              </button>
            </div>
            <pre class="text-xs bg-base-200 p-4 rounded-lg overflow-auto max-h-[90svh]">
              {logs()}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
