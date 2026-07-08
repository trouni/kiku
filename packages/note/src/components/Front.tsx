import { createEffect, createSignal, lazy, onMount } from "solid-js";
import { isServer } from "solid-js/web";
import { useCardContext } from "#/components/shared/CardContext";
import type { DatasetProp } from "#/util/config";
import { fetchCardInterval, getScaledFontSizePx } from "#/util/font-scaling";
import { useLoadPlugin } from "#/util/hooks";
import { ClozeFront } from "./ClozeFront";
import { FieldGroupPaginationSection } from "./FieldGroupPaginationSection";
import { PictureSection } from "./PictureSection";
import { useAnkiFieldContext } from "./shared/AnkiFieldsContext";
import { useConfigContext } from "./shared/ConfigContext";
import { useFieldGroupContext } from "./shared/FieldGroupContext";
import { useGeneralContext } from "./shared/GeneralContext";

// biome-ignore format: this looks nicer
const Lazy = {
  AudioButtons: lazy(async () => ({ default: (await import("./_kiku_lazy")).AudioButtons, })),
  HeaderMain: lazy(async () => ({ default: (await import("./_kiku_lazy")).HeaderMain, })),
  FieldGroupPagination: lazy(async () => ({ default: (await import("./_kiku_lazy")).FieldGroupPagination, })),
  UseAnkiDroid: lazy(async () => ({ default: (await import("./_kiku_lazy")).UseAnkiDroid, })),
  Sentence: lazy(async () => ({ default: (await import("./_kiku_lazy")).Sentence, })),
};

export function Front() {
  const [$card] = useCardContext();
  if ($card.cardType === "cloze") {
    return <ClozeFront />;
  }
  return <MiningFront />;
}

function MiningFront() {
  const [$card, $setCard] = useCardContext();
  const { ankiFields } = useAnkiFieldContext<"front">();
  const [clicked, setClicked] = createSignal(false);
  const [hideExpression, setHideExpression] = createSignal(false);
  const [showSentence, setShowSentence] = createSignal(false);
  const [showHint, setShowHint] = createSignal(false);
  const [scaledFontSize, setScaledFontSize] = createSignal<
    number | undefined
  >();
  const { $group } = useFieldGroupContext();
  const [$config] = useConfigContext();
  const [$general] = useGeneralContext();
  const loadPlugin = useLoadPlugin();

  onMount(() => {
    setTimeout(() => {
      $setCard("ready", true);
      loadPlugin();
    }, 0);

    const tags = ankiFields.Tags.split(" ");
    $setCard("isNsfw", tags.map((tag) => tag.toLowerCase()).includes("nsfw"));

    if ($config.modHidden) {
      setTimeout(() => {
        setHideExpression(true);
      }, $config.modHiddenDuration);
    }

    fetchCardInterval(
      $general.ankiDroidAPI,
      $config.ankiConnectAddress,
      ankiFields.CardID,
    ).then((interval) => {
      setScaledFontSize(
        getScaledFontSizePx(
          {
            enabled: $config.fontScaleEnabled,
            minPx: $config.fontScaleMinPx,
            maxPx: $config.fontScaleMaxPx,
            maxIntervalDays: $config.fontScaleMaxIntervalDays,
          },
          interval,
        ),
      );
    });
  });

  createEffect(() => {
    if (
      ankiFields.IsAudioCard &&
      $card.sentenceFieldRef &&
      $group.sentenceField
    ) {
      const boldElements = $card.sentenceFieldRef.querySelectorAll("b");
      boldElements.forEach((el) => {
        el.innerHTML = "[...]";
        el.classList.add("text-base-content-primary");
      });
    }
  });

  const hidden = () => {
    if (isServer) return true;
    if (
      ankiFields.IsSentenceCard ||
      ankiFields.IsWordAndSentenceCard ||
      ankiFields.IsAudioCard
    ) {
      return false;
    }
    if (ankiFields.IsClickCard && clicked()) {
      return false;
    }
    if (showSentence()) {
      return false;
    }
    return true;
  };

  const isRegularWordCard = () => {
    return (
      !ankiFields.IsSentenceCard &&
      !ankiFields.IsWordAndSentenceCard &&
      !ankiFields.IsAudioCard &&
      !ankiFields.IsClickCard &&
      $group.sentenceField
    );
  };

  const hintFieldDataset: () => DatasetProp = () => ({
    "data-has-hint": isServer
      ? "{{#Hint}}true{{/Hint}}"
      : ankiFields.Hint
        ? "true"
        : "",
  });

  return (
    <>
      {$card.ready && !$card.nested && <Lazy.UseAnkiDroid />}
      {$card.ready && <Lazy.HeaderMain />}
      <div class="flex flex-col gap-4">
        <div
          class="flex rounded-lg gap-4 flex-col sm:flex-row tappable"
          on:click={() => {
            setClicked((prev) => !prev);
            setHideExpression(false);
          }}
          on:touchend={(e) => e.stopPropagation()}
        >
          <div class="flex-1 bg-base-200 p-4 rounded-lg flex flex-col items-center justify-center min-h-40 sm:min-h-56">
            <div
              class="expression font-secondary text-center vertical-rl"
              classList={{
                "border-b-2 border-dotted border-base-content-soft":
                  !!ankiFields.IsClickCard,
                "transition-opacity duration-[1000ms] opacity-0":
                  hideExpression(),
              }}
              style={
                scaledFontSize()
                  ? {
                      "font-size": `${scaledFontSize()}px`,
                      "line-height": "1.2",
                    }
                  : undefined
              }
              innerHTML={
                isServer
                  ? undefined
                  : !ankiFields.IsSentenceCard && !ankiFields.IsAudioCard
                    ? ankiFields.Expression
                    : "?"
              }
            >
              {isServer
                ? `{{#IsSentenceCard}} <span>?</span> {{/IsSentenceCard}} {{#IsAudioCard}} <span>?</span> {{/IsAudioCard}} {{^IsSentenceCard}} {{^IsAudioCard}} {{Expression}} {{/IsAudioCard}} {{/IsSentenceCard}}`
                : undefined}
            </div>
          </div>

          <PictureSection />
        </div>
        {$card.ready && !hidden() && <FieldGroupPaginationSection />}
      </div>
      {$card.ready &&
        (scaledFontSize() || (isRegularWordCard() && !showSentence())) && (
          <div class="flex justify-center gap-2 animate-fade-in">
            {scaledFontSize() && (
              <button
                class="btn btn-ghost btn-sm text-base-content-soft hover:text-base-content"
                on:click={() => setScaledFontSize(undefined)}
              >
                Enlarge
              </button>
            )}
            {isRegularWordCard() && !showSentence() && (
              <button
                class="btn btn-ghost btn-sm text-base-content-soft hover:text-base-content"
                on:click={() => setShowSentence(true)}
              >
                Show Sentence
              </button>
            )}
          </div>
        )}
      <div
        class="flex flex-col gap-4 items-center text-center justify-center"
        classList={{
          "transition-opacity duration-[1000ms] opacity-0": hideExpression(),
        }}
      >
        {$card.ready && !hidden() && <Lazy.Sentence />}
      </div>
      {$card.ready && ankiFields.IsAudioCard && (
        <div class="flex gap-2 justify-center animate-fade-in-sm">
          <Lazy.AudioButtons position={1} />
        </div>
      )}
      <div
        class={`flex gap-2 items-center justify-center text-center border-t-1 hint text-base-content-calm hint-field border-base-content-soft p-2`}
        {...hintFieldDataset()}
      >
        {$card.ready && !showHint() && (
          <button
            class="btn btn-ghost btn-sm text-base-content-soft hover:text-base-content"
            on:click={() => setShowHint(true)}
          >
            Show Hint
          </button>
        )}
        <div
          classList={{ hidden: $card.ready && !showHint() }}
          innerHTML={isServer ? undefined : ankiFields.Hint}
        >
          {isServer ? "{{Hint}}" : undefined}
        </div>
      </div>
    </>
  );
}
