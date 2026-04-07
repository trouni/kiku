import {
  createMemo,
  createSignal,
  ErrorBoundary,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import type { DatasetProp } from "#/util/config";
import { isHtmlEffectivelyEmpty, parseHtml } from "#/util/general";
import { useAnkiFieldContext } from "../shared/AnkiFieldsContext";
import { useConfigContext } from "../shared/ConfigContext";
import { useCtxContext } from "../shared/CtxContext";
import { useGeneralContext } from "../shared/GeneralContext";
import DefinitionPictureSection from "./DefinitionPictureSection";
import Sentence from "./Sentence";

export default function BackBody(props: {
  onDefinitionPictureClick?: (picture: string) => void;
}) {
  let definitionEl: HTMLDivElement | undefined;
  let modalRef: HTMLDialogElement | undefined;
  const { ankiFields } = useAnkiFieldContext<"back">();
  const [$config] = useConfigContext();
  const [showTranslation, setShowTranslation] = createSignal(false);

  const hasTranslation = () =>
    !isHtmlEffectivelyEmpty(ankiFields.SentenceTranslation?.trim());

  const glossary = () => {
    // empty glossary if it's the same as main definition
    if (ankiFields.MainDefinition === ankiFields.Glossary) return "";
    return removeMainDefinitionFromGlossary(
      ankiFields.Glossary,
      ankiFields.MainDefinition,
    );
  };

  const pages = createMemo(() => {
    const p: { name: string; html: string }[] = [];
    const selection = !isHtmlEffectivelyEmpty(ankiFields.SelectionText)
      ? ankiFields.SelectionText
      : "";
    const main = !isHtmlEffectivelyEmpty(ankiFields.MainDefinition)
      ? ankiFields.MainDefinition
      : "";
    const gHtml = glossary();

    if ($config.definitionStyle === "single-page") {
      const combined = [selection, main, gHtml].filter(Boolean);
      if (combined.length > 0) {
        const html = combined.join('<div class="divider my-4"></div>');
        p.push({ name: "Definition", html });
      }
      return p;
    }

    if (selection) {
      p.push({ name: "Selection Text", html: selection });
    }
    if (main) {
      let name = "Main Definition";
      if ($config.definitionStyle === "glossary-split") {
        const doc = parseHtml(main);
        const li = doc.querySelector("li[data-dictionary]");
        const dictName = li?.getAttribute("data-dictionary");
        if (dictName) {
          name = `Main Definition (${dictName})`;
        }
      }
      p.push({ name, html: main });
    }

    if (!isHtmlEffectivelyEmpty(gHtml)) {
      const doc = parseHtml(gHtml);
      const entries = doc.querySelectorAll("li[data-dictionary]");
      if ($config.definitionStyle === "glossary-split" && entries.length > 0) {
        const styles = Array.from(doc.querySelectorAll("style"))
          .map((s) => s.outerHTML)
          .join("");
        const dictGroups = new Map<string, string>();
        for (const li of entries) {
          const dictName = li.getAttribute("data-dictionary") || "Glossary";
          const prevHtml = dictGroups.get(dictName);
          const divider = prevHtml ? '<div class="divider"></div>' : "";
          dictGroups.set(dictName, (prevHtml || "") + divider + li.outerHTML);
        }
        for (const [name, html] of dictGroups) {
          p.push({
            name: name,
            html: `<div style="text-align: left;" class="yomitan-glossary"><ol>${styles}${html}</ol></div>`,
          });
        }
      } else {
        p.push({ name: "Glossary", html: gHtml });
      }
    }
    return p;
  });

  const [definitionIndex, setDefinitionIndex] = createSignal(0);
  const currentPage = () => pages()[definitionIndex()];

  function changePage(direction: 1 | -1) {
    if (pages().length === 0) return;
    setDefinitionIndex(
      (prev) => (prev + direction + pages().length) % pages().length,
    );
  }

  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === $config.keybindDefinitionPrev) changePage(-1);
      if (e.key === $config.keybindDefinitionNext) changePage(1);
    };

    window.addEventListener("keydown", handler);
    onCleanup(() => window.removeEventListener("keydown", handler));
  });

  const definitionDataset: () => DatasetProp = () => ({
    "data-dictionary": currentPage()?.name,
  });

  return (
    <div
      class="flex sm:flex-col gap-8"
      classList={{
        "flex-col-reverse": $config.swapSentenceAndDefinitionOnMobile,
        "flex-col": !$config.swapSentenceAndDefinitionOnMobile,
      }}
    >
      <div class="flex flex-col justify-center gap-2 items-center text-center">
        <Sentence />
        {hasTranslation() && !showTranslation() && (
          <button
            class="btn btn-ghost btn-sm text-base-content-soft hover:text-base-content animate-fade-in"
            on:click={() => setShowTranslation(true)}
          >
            Show Translation
          </button>
        )}
        {hasTranslation() && showTranslation() && (
          <div
            class="text-base-content-calm text-sm animate-fade-in"
            innerHTML={ankiFields.SentenceTranslation}
          ></div>
        )}
      </div>
      {pages().length > 0 && (
        <div class="animate-fade-in" {...definitionDataset()}>
          {pages().length > 1 && (
            <div
              class="flex justify-between text-base-content-calm text-sm cursor-pointer hover:text-base-content transition-colors mb-1 tappable"
              on:click={() => modalRef?.showModal()}
              on:touchend={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  color:
                    "var(--dictionary-color, var(--color-base-content-calm)",
                }}
              >
                {currentPage()?.name}
              </div>
              <div class="text-base-content-soft">{`${definitionIndex() + 1}/${pages().length}`}</div>
            </div>
          )}
          <div
            class="relative bg-base-200 p-4 border-s-4 text-base sm:text-xl rounded-lg definition-field"
            style={{
              "border-color": "var(--dictionary-color, var(--color-primary)",
            }}
            data-definition-style={$config.definitionStyle}
          >
            <div class="overflow-auto" ref={definitionEl}>
              <DefinitionPictureSection
                onDefinitionPictureClick={props.onDefinitionPictureClick}
                currentHtml={currentPage()?.html}
              />
              <div class="contents" innerHTML={currentPage()?.html}></div>
            </div>
            {pages().length > 1 && (
              <div class="absolute inset-y-0 left-0 right-0 flex justify-between pointer-events-none">
                <button
                  type="button"
                  class="h-full w-6 hover:bg-base-content/10 cursor-pointer pointer-events-auto transition-colors rounded-l-lg"
                  on:click={() => changePage(-1)}
                  on:touchend={(e) => e.stopPropagation()}
                />
                <button
                  type="button"
                  class="h-full w-6 hover:bg-base-content/10 cursor-pointer pointer-events-auto transition-colors rounded-r-lg"
                  on:click={() => changePage(1)}
                  on:touchend={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </div>
          <div class="flex justify-end py-2 gap-2">
            <ExternalLinks />
          </div>
        </div>
      )}

      <dialog class="modal" ref={modalRef}>
        <div class="modal-box max-w-sm max-h-[80svh] flex flex-col p-4 gap-2">
          <h3 class="font-bold text-lg px-2 text-center">Select Page</h3>
          <div class="flex flex-col gap-1 overflow-auto p-2">
            <For each={pages()}>
              {(page, i) => (
                <button
                  type="button"
                  class="btn btn-ghost btn-sm justify-start font-normal text-left"
                  classList={{ "btn-active": i() === definitionIndex() }}
                  on:click={() => {
                    setDefinitionIndex(i());
                    modalRef?.close();
                  }}
                  on:touchend={(e) => e.stopPropagation()}
                >
                  <span class="truncate">
                    {i() + 1}. {page.name}
                  </span>
                </button>
              )}
            </For>
          </div>
          <div class="modal-action mt-2">
            <form method="dialog">
              <button class="btn btn-sm">Close</button>
            </form>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
}

function removeMainDefinitionFromGlossary(
  glossary: string,
  mainDefinition: string,
) {
  const parser = new DOMParser();
  const glossaryDoc = parser.parseFromString(glossary, "text/html");
  const mainDefinitionDoc = parser.parseFromString(mainDefinition, "text/html");

  const mainDefinitionLi = mainDefinitionDoc.querySelector(
    'div[class="yomitan-glossary"] > ol > li[data-dictionary]',
  );
  if (!mainDefinitionLi) return glossary;
  const mainDefinitionDictionary =
    mainDefinitionLi.getAttribute("data-dictionary");
  if (!mainDefinitionDictionary) return glossary;

  const glossaries = glossaryDoc.querySelectorAll(
    `div[class="yomitan-glossary"] > ol > li[data-dictionary]`,
  );
  for (const glossaryLi of glossaries) {
    if (
      glossaryLi.getAttribute("data-dictionary") === mainDefinitionDictionary
    ) {
      glossaryLi.remove();
    }
  }
  return glossaryDoc.body.innerHTML;
}

function ExternalLinks() {
  const [$general] = useGeneralContext();
  const ctx = useCtxContext();

  return (
    <ErrorBoundary fallback={<DefaultExternalLinks />}>
      <Show
        when={$general.plugin?.ExternalLinks}
        fallback={<DefaultExternalLinks />}
      >
        {(get) => {
          const ExternalLinks = get();
          return (
            <ExternalLinks
              ctx={ctx}
              DefaultExternalLinks={DefaultExternalLinks}
            />
          );
        }}
      </Show>
    </ErrorBoundary>
  );
}

function DefaultExternalLinks() {
  const { ankiFields } = useAnkiFieldContext<"back">();

  return (
    <>
      <a
        href={(() => {
          const url = new URL("https://jpdb.io/search");
          url.searchParams.set("q", ankiFields.Expression);
          return url.toString();
        })()}
        target="_blank"
      >
        <img
          class="size-5 object-contain rounded-xs"
          src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAXRQTFRF//////39/6+v/2dn/7Oz//7+/9zc/x8f/wAA/yUl/+Li/9/f/yQk/yoq/+Tk/7u7/3h4/7+/+vr65+fn5eXl+/v77+/v5OTk8vLy9PT01tbWx8fH0NDQ6+vr4eHhZmZmWVlZZ2dn4+PjnZ2dV1dXWFhYqqqqzMzMc3NzUVFRS0tLTk5OZGRkqamp9vb23d3dVFRURUVFVVVV4ODgkpKSRERERkZGWlpaUFBQTU1NSEhIl5eXVlZWR0dHYmJitLS019fXysrKhoaGSkpKxMTEzc3Nfn5+g4ODfX19v7+/7Ozs2NjYUlJSnJyc3Nzc3t7ei4uL/v7+zs7OXFxc5ubm6urqnp6ecnJyjo6O/f39+Pj4wMDApqamU1NTZWVlgoKCdnZ2a2tr6enpioqKQkJCbW1t1dXVxcXFgYGBsrKyy8vLX19flpaW/Pz80dHR+fn5xsbGlZWV29vbSUlJwsLCm5ub8/Pzvr6+2tra9fX139/f7e3tX4KuCgAAAVZJREFUeJxjZCAAGOmngBEEfuNRwAZS8A2PAm7GP6yMn/AoYOViZHxPkSOFGBn/M71mEGNkYHwhCXLPYzQFciDBewzKjAhwCUWBPkjoLIMJI+Mn/v9MjH8ZWBivv0NRwMzC9h2o4C8nM0T/r3eSe7Aq4PksupuBQVL3w2+xc6+xKWAQPwsS9/z1mYNnG1YFXEdBfG/GV+/4z2JVILMZxPd7xPZHdiNWBfKM64H8oJvcsoxrsClg/aa5GsgPe/Bb7fol7N6UPmrDyHhK4qfaEuzhoHwWGFonRb4YMM7DqoBV9+I3K4aLHBqMs9CCmu3dr0dgb14PPWvyQnLLY9TIyjr/1/TVapAC6ykMDLlP1qNEt5Cz5Ke7X8TVJ8IUIAGwAu+HPP9+6whPYADGJoNNP6aColvqe3/4PF3OwFD64rLaKkwFZYxAr7WDWF4GDIytmArwATooAAA9VoEhkeDABAAAAABJRU5ErkJggg=="
          alt="JPDB"
        />
      </a>

      <a
        href={`https://jisho.org/search/${ankiFields.Expression}`}
        target="_blank"
      >
        <img
          class="size-5 object-contain rounded-xs"
          src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAFpQTFRFVtkm////+f73vPCpXdovWtort++j+P32u++osu2c9Pvx6vjl9Pvy9Pry2u/S5vTh4vLcSLYgR7Qfa79M6/bmc8JWR7QgU9Alf8pjfspiUs4kVc0pVM0nVtgmNSyDBQAAAH5JREFUeJxjZCAAGEcVwBXAFTEyMv5hYGVk/AUT+I+mgIGB/QcD5w8EF1MB5zcG7m/4FACFeL4SUMD7ZVQBDgV8MD7jJ7AC/n8wgU8QBYJwBYyMbxj42Rh/wwTeo6cHccYXDJKMz5CF0BKM9FMGmScMeBTIPgYhPAowwWBQAADBWTUhzGucIAAAAABJRU5ErkJggg=="
          alt="Jisho"
        />
      </a>
      <a
        href={(() => {
          const url = new URL("https://www.google.co.jp/search");
          url.searchParams.set("q", ankiFields.Expression);
          return url.toString();
        })()}
        target="_blank"
      >
        <img
          class="size-5 object-contain rounded-xs"
          src="data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsSAAALEgHS3X78AAAE3ElEQVRYhc2XW2xUVRSGv30uU9rTMhUaCuVixQSMpLYmPIhYwAcTIyKFROI1KQmkxBgj8UEf5MEYiSYmPvhAfCASY02MUaFEHjSRQYtGNDAqIhKxQJVeodPLMJ2Zc/by4cz91tZ4+5Od2Wf2Xuv/z9lrr722EhFmiTagA9gEbCwz5wQQAg4D4Vl5FZGZWqeIhGXuCKdsK/qvNNgsIqG/QFyIUMrXnAR0iEjkbyBPI5LyWcSlpDgGOoG3S67XV71wshd+CMPwEAiAAShoXIy0tsL6dtS6u8qt+E7gUO4fhQI6gI+LzM6ehjf2w9AQJC1QgCi/KRMwQZmIYSLKRBYvwXj2KVTLmlIituEHaZGAZvzIDeZN/+BVOPwhTAX850QgS44CZWWaoBDTRgzbd77lfoxdTxYKGMffUZfA/35pHCoif+8F+Pxdvx/wSr1NPpSR/3z2HERvFM4KkrMMaYtOCvf2p8/A5W5ouAHz4+AkoDoJpguGB6QEpT6GAKJUVsstKzBe2QdOTSmpG1OcmSUIA62Z4eEeCD0BV+pgnoahOhhwwBCwVsL23bCuHZxaf340Cl9/g+5+H0YjcOvKSuRpfA+0KRFpA87kDX2xCgYHIWpDNOALmLLhju2w4/kscSGiUeTIMdTWzTORp3GnhR/5WYwdhUA/NBhQKzDtQZUHddvhkZcru3Mc1GMPz4Y4jQ4LP7dnETkK8wywACVgu2DUwQOvzcXxbLHJojD4pnuz/WoBF1j2KATyN0ga310p41pAkc0xCqEpqFhcr3JnbbSK7OJ9oAyUpcAEAsDSLWVfYXd3OQGFGVaxpx262vP/Ldi4KelCZk+LoWDeirICykKpbEs/l0CRABGd7aeMhNLGcxJTxk/xFxAN4uJpl6R4TIuLG79U0b+gEbxU06TSUqpVRlEMEGhGJy4zJRpLmVzXHtWRIzTUbSjpoOueNInK++35EQbGZ+THwi+jMjtB17bjXesDDKLaT7f9I+9Q37QPy6wvcrCnXeWQ+5ichu5v08IkM7725iLzEwZ+DZeB1G9lVAv9nseg1vziac7EJ/nk1z0zv04KB89EGXVjRO0pkkYCVyVJGgnWFsdyyCDnbAaw6zsYtldwUQtXtTCshUEx+HL0Mw5e2MuUO1mR/MBPf7A//DvjNcNMVI8QC0zhGR4PtZQM5MMlD6OJiRDHz91LRBTjYtAnDtd1DWPikAi0squ5i/sa1hO0nIynnoGLvHn+Ar0DMQKx5VhuNbZbg5MIYno2x3fXsTSYJyJzGEGJMizUt5fjVw8wLjaXJciEOEyKw5DXSJwASapI6lpqzflEkh6SDEJ8CYiJii3HdB0CroMdX0BXy0Je2lAUPzuBQ7kVUYiCtNx9oYuPhnoYkIV4YjGmb2JSGnBReFKFxsbVVSgE8Rz09BJQGuJNWLEmPMOlrXYZJ7fdXkh+gtQZlJsHOvHLpQweX/UWmxp3ABCXQHZAzEzXUG6mr6yJTN+1x3lw+SKObV5dSD6e4vJtZlOUnoqc5rmfX+e32AQxCSIYCCag0NryT01dhXjVSHIBtbKUF29bx9OrVxW6ggpFaRqdlCnLj42c4uhImN6x8/RPXwMUIgYKYb5Zz93BNrY0ruHBRS0E7apSLorK8v/8YvK/vZr9a5fTUjFQDv/I9fxPxUx0d1WRkbMAAAAASUVORK5CYII="
          alt="Google"
        />
      </a>
    </>
  );
}
