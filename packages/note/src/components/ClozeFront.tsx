import { createEffect, createSignal, lazy, onMount } from "solid-js";
import { isServer } from "solid-js/web";
import { useCardContext } from "#/components/shared/CardContext";
import type { DatasetProp } from "#/util/config";
import { PictureSection } from "./PictureSection";
import { useAnkiFieldContext } from "./shared/AnkiFieldsContext";
import { useFieldGroupContext } from "./shared/FieldGroupContext";
import { useGeneralContext } from "./shared/GeneralContext";

const Lazy = {
  HeaderMain: lazy(async () => ({
    default: (await import("./_kiku_lazy")).HeaderMain,
  })),
  UseAnkiDroid: lazy(async () => ({
    default: (await import("./_kiku_lazy")).UseAnkiDroid,
  })),
};

function createClozeSentence(html: string): string {
  return html.replace(/<b\b[^>]*>([\s\S]*?)<\/b>/gi, "<span class='text-base-content-primary font-bold'>[...]</span>");
}

export function ClozeFront() {
  const [$card, $setCard] = useCardContext();
  const { ankiFields } = useAnkiFieldContext<"front">();
  const { $group } = useFieldGroupContext();
  const [$general, $setGeneral] = useGeneralContext();
  const [translationOpen, setTranslationOpen] = createSignal(false);

  onMount(() => {
    setTimeout(() => {
      $setCard("ready", true);
    }, 0);

    const tags = ankiFields.Tags.split(" ");
    $setCard("isNsfw", tags.map((tag) => tag.toLowerCase()).includes("nsfw"));
  });

  const clozeSentence = () => {
    const sentence = $group.sentenceField;
    if (!sentence) return "";
    return createClozeSentence(sentence);
  };

  // Solid skips setProperty for innerHTML during hydration. Assign imperatively
  // via createEffect so the cloze replacement reliably overrides the SSR content.
  let sentenceEl: HTMLDivElement | undefined;
  createEffect(() => {
    if (!isServer && sentenceEl) sentenceEl.innerHTML = clozeSentence();
  });

  const hintFieldDataset: () => DatasetProp = () => ({
    "data-has-hint": isServer
      ? "{{#Hint}}true{{/Hint}}"
      : ankiFields.Hint
        ? "true"
        : "",
  });

  const translationDataset: () => DatasetProp = () => ({
    "data-has-translation": isServer
      ? "{{#SentenceTranslation}}true{{/SentenceTranslation}}"
      : $group.sentenceTranslationField
        ? "true"
        : "",
  });

  return (
    <>
      {$card.ready && !$card.nested && <Lazy.UseAnkiDroid />}
      {$card.ready && <Lazy.HeaderMain />}
      <div class="flex flex-col gap-4">
        <div class="flex rounded-lg gap-4 flex-col sm:flex-row">
          <div class="flex-1 bg-base-200 p-4 rounded-lg flex flex-col items-center justify-center min-h-40 sm:min-h-56">
            <div
              ref={sentenceEl}
              class="font-secondary text-center text-xl sm:text-2xl leading-relaxed"
            >
              {isServer ? "{{kanji:Sentence}}" : undefined}
            </div>
          </div>

          <PictureSection />
        </div>
      </div>
      <div
        class="flex flex-col items-center text-center translation-hint"
        {...translationDataset()}
      >
        <details
          class="w-full"
          onToggle={(e) => setTranslationOpen(e.currentTarget.open)}
        >
          <summary class="cursor-pointer text-base-content-soft hover:text-base-content text-sm p-2 select-none">
            {translationOpen() ? "Hide translation" : "Show translation"}
          </summary>
          <div
            class="text-base-content-calm text-sm p-2"
            innerHTML={isServer ? undefined : $group.sentenceTranslationField}
          >
            {isServer ? "{{SentenceTranslation}}" : undefined}
          </div>
        </details>
      </div>
      <div
        class={`flex gap-2 items-center justify-center text-center border-t-1 hint text-base-content-calm hint-field border-base-content-soft p-2`}
        {...hintFieldDataset()}
      >
        <div innerHTML={isServer ? undefined : ankiFields.Hint}>
          {isServer ? "{{Hint}}" : undefined}
        </div>
      </div>
    </>
  );
}
