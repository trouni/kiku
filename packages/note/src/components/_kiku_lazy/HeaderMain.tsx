import { createUniqueId, Match, Show, Switch } from "solid-js";
import { constants } from "#/util/general";
import { useNavigationTransition, useThemeTransition } from "#/util/hooks";
import { nextTheme } from "#/util/theme";
import { useAnkiFieldContext } from "../shared/AnkiFieldsContext";
import { useCardContext } from "../shared/CardContext";
import { useConfigContext } from "../shared/ConfigContext";
import { useGeneralContext } from "../shared/GeneralContext";
import HeaderLayout from "./HeaderLayout";
import {
  ArrowLeftIcon,
  BoltIcon,
  CircleChevronDownIcon,
  PaintbrushIcon,
} from "./Icons";
import MergeContextModal from "./MergeContextModal";
import { capitalize } from "./util/general";

export default function HeaderMain(props: { onExitNested?: () => void }) {
  const [$card, $setCard] = useCardContext();
  const [$config, $setConfig] = useConfigContext();
  const [$general] = useGeneralContext();
  const { navigate, navigateBack } = useNavigationTransition();
  const changeTheme = useThemeTransition();

  return (
    <HeaderLayout>
      <div class="flex gap-1 sm:gap-2 items-center animate-fade-in-sm">
        <Switch>
          <Match when={$card.nested}>
            <button
              on:click={props.onExitNested}
              on:touchend={(e) => e.stopPropagation()}
            >
              <ArrowLeftIcon class="size-5 cursor-pointer text-base-content-soft" />
            </button>
            <MergeContextModal />
          </Match>
          <Match when={!$card.nested}>
            <div class="relative" data-anki-mobile-hide="front">
              <div
                class="tooltip tooltip-bottom flex items-center"
                data-tip={
                  $card.side === "front"
                    ? "Settings page is only accessible from the back side of the card"
                    : undefined
                }
              >
                <button
                  on:click={() => {
                    if ($card.side === "front") return;
                    navigate("settings", "forward", () =>
                      navigate("main", "back"),
                    );
                  }}
                  on:touchend={(e) => e.stopPropagation()}
                >
                  <BoltIcon
                    class="size-5"
                    classList={{
                      "text-base-content-soft cursor-pointer":
                        $card.side === "back",
                      "text-base-content-subtle-100 cursor-not-allowed":
                        $card.side === "front",
                    }}
                  ></BoltIcon>
                </button>
              </div>

              <Show when={$general.isConfigOutOfSync}>
                <div class="status status-warning absolute top-0 right-0 translate-x-0.5 -translate-y-0.5"></div>
              </Show>
            </div>
            <Show when={$config.showTheme}>
              <button
                class="flex gap-1 sm:gap-2 items-center cursor-pointer"
                on:click={() => {
                  if ($general.root) changeTheme(nextTheme($general.root));
                }}
                on:touchend={(e) => e.stopPropagation()}
              >
                <PaintbrushIcon class="size-5 cursor-pointer text-base-content-soft"></PaintbrushIcon>
                <span class="text-base-content-soft text-xs sm:text-sm">
                  {capitalize($config.theme)}
                </span>
              </button>
            </Show>
            <Show when={$config.showStartupTime}>
              <div class="text-base-content-soft bg-warning/10 rounded-sm px-px sm:px-1 text-xs sm:text-sm">
                {Math.round($general.startupTime())}
                {$general.startupTime() !== 0 && "ms"}
              </div>
            </Show>
          </Match>
        </Switch>
      </div>
      <div class="flex gap-1 sm:gap-2 items-center">
        <Show when={!$card.isMergePreview}>
          <Switch>
            <Match
              when={$card.query.status === "loading" && $card.side === "back"}
            >
              <span class="loading loading-spinner loading-xs text-base-content-faint animate-fade-in-sm"></span>
            </Match>
            <Match
              when={$card.query.status === "error" && $card.side === "back"}
            >
              <div class="status status-error animate-ping"></div>
            </Match>
            <Match
              when={$card.query.status === "success" && $card.side === "back"}
            >
              <div class="text-base-content-soft cursor-pointer animate-fade-in-sm">
                <KanjiPageIndicator />
              </div>
            </Match>
          </Switch>
        </Show>
        <Show when={$card.side === "back"}>
          <Frequency />
        </Show>
      </div>
    </HeaderLayout>
  );
}

function KanjiPageIndicator() {
  const [$general] = useGeneralContext();
  const [$card, $setCard] = useCardContext();
  const { navigate } = useNavigationTransition();

  const length = () =>
    $card.query.noteList.length +
    ($card.query.sameReading?.length ? 1 : 0) +
    ($card.query.sameExpression?.length ? 1 : 0);

  const onClick = (key: string | symbol) => {
    const isKanjiResult = $card.query.noteList.length > 0;
    const isSameReadingResult = ($card.query.sameReading?.length ?? 0) > 0;
    if (
      isKanjiResult ||
      isSameReadingResult ||
      key === constants.SAME_EXPRESSION ||
      key === constants.SAME_READING
    ) {
      $setCard("focus", "kanji", key);
      $setCard("uniqueId", createUniqueId());
      navigate("kanji", "forward", () => navigate("main", "back"));
    }
  };

  function KanjiIndicator() {
    return $card.query.noteList.map(([kanji, data]) => {
      return (
        <button
          class="flex gap-px sm:gap-0.5 items-start hover:text-base-content transition-colors cursor-pointer"
          on:click={() => {
            onClick(kanji);
          }}
          on:touchend={(e) => e.stopPropagation()}
        >
          <span>{kanji}</span>
          <span
            class="bg-base-content/5 leading-none text-xs sm:text-sm rounded-xs"
            classList={{
              "p-px": length() <= 4,
              "p-0": length() > 4,
            }}
          >
            {data.length}
          </span>
        </button>
      );
    });
  }

  function SameReadingIndicator() {
    return (
      <button
        class="flex gap-px sm:gap-0.5 items-start hover:text-base-content transition-colors cursor-pointer"
        on:click={() => {
          onClick(constants.SAME_READING);
        }}
        on:touchend={(e) => e.stopPropagation()}
      >
        <span>読</span>
        <span
          class="bg-base-content/5 leading-none text-xs sm:text-sm rounded-xs"
          classList={{
            "p-px": length() <= 4,
            "p-0": length() > 4,
          }}
        >
          {$card.query.sameReading?.length ?? 0}
        </span>
      </button>
    );
  }

  function SameExpressionIndicator() {
    return (
      <button
        class="flex gap-px sm:gap-0.5 items-start hover:text-base-content transition-colors cursor-pointer"
        on:click={() => {
          onClick(constants.SAME_EXPRESSION);
        }}
        on:touchend={(e) => e.stopPropagation()}
      >
        <span>同</span>
        <span
          class="bg-base-content/5 leading-none text-xs sm:text-sm rounded-xs"
          classList={{
            "p-px": length() <= 4,
            "p-0": length() > 4,
          }}
        >
          {$card.query.sameExpression?.length ?? 0}
        </span>
      </button>
    );
  }

  return (
    <div
      class="flex sm:gap-2 items-center flex-wrap"
      classList={{
        "gap-1": length() <= 4,
        "gap-0": length() > 4,
      }}
    >
      <KanjiIndicator />

      <Show
        when={
          $card.query.sameReading?.length || $card.query.sameExpression?.length
        }
      >
        <span>•</span>
      </Show>
      <Show when={$card.query.sameReading?.length}>
        <SameReadingIndicator />
      </Show>
      <Show when={$card.query.sameExpression?.length}>
        <SameExpressionIndicator />
      </Show>
    </div>
  );
}

function Frequency() {
  const { ankiFields } = useAnkiFieldContext<"back">();
  return (
    <div class="flex gap-1 sm:gap-2 items-center animate-fade-in-sm relative hover:[&_#frequency]:block">
      <div
        class="text-base-content-soft text-sm sm:text-base"
        innerHTML={ankiFields.FreqSort}
        classList={{
          hidden: ankiFields.FreqSort === "9999999",
        }}
      ></div>
      {ankiFields.Frequency && (
        <>
          <CircleChevronDownIcon class="size-5 text-base-content-soft" />
          <div
            id="frequency"
            class="absolute top-0 translate-y-6 right-2 w-fit [&_li]:text-nowrap [&_li]:whitespace-nowrap bg-base-200/95 text-sm sm:text-base p-2 sm:p-4 rounded-lg border border-base-300 shadow-lg hidden text-base-content-calm"
            innerHTML={ankiFields.Frequency}
          ></div>
        </>
      )}
    </div>
  );
}
