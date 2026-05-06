import { arrow, computePosition, flip, offset, shift } from "@floating-ui/dom";
import { createEffect, createSignal, type JSX, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { Portal } from "solid-js/web";
import { extractKanji, parseHtml } from "#/util/general";
import { parseFurigana } from "#/util/parse-furigana";
import { useAnkiFieldContext } from "../shared/AnkiFieldsContext";
import { useBreakpointContext } from "../shared/BreakpointContext";
import { useCardContext } from "../shared/CardContext";
import { useGeneralContext } from "../shared/GeneralContext";
import { XIcon } from "./Icons";
import { KanjiContextProvider, useKanjiContext } from "./KanjiContext";
import { KanjiInfo, KanjiInfoExtra } from "./KanjiInfo";

export default function Expression() {
  const [$card, $setCard] = useCardContext();
  const { ankiFields } = useAnkiFieldContext<"back">();
  const [activeKey, setActiveKey] = createSignal<string | null>(null);
  let timeout: ReturnType<typeof setTimeout>;

  onMount(() => {
    setTimeout(() => {
      $setCard("expressionReady", true);
    }, 100);
  });

  function CharSpan(props: { char: string; i: number; j: number }) {
    const [anchorRef, setAnchorRef] = createSignal<HTMLSpanElement>();
    const key = `${props.char}-${props.i}-${props.j}`;
    const show = () => activeKey() === key;

    const handleActive = () => {
      clearTimeout(timeout);
      setActiveKey(key);
    };

    const handleInactive = () => {
      timeout = setTimeout(() => {
        setActiveKey(null);
      }, 50);
    };

    return (
      <span
        ref={setAnchorRef}
        tabindex={0}
        class="tappable"
        on:mouseenter={handleActive}
        on:mouseleave={handleInactive}
        on:focus={handleActive}
        on:blur={handleInactive}
        on:touchstart={handleActive}
        on:touchend={(e) => e.stopPropagation()}
      >
        <KanjiContextProvider kanji={extractKanji(props.char)[0] ?? ""}>
          <KanjiTooltip
            show={show()}
            anchor={anchorRef()}
            onActive={handleActive}
            onInactive={handleInactive}
          />
        </KanjiContextProvider>
        {props.char}
      </span>
    );
  }

  const doc = parseHtml(ankiFields.ExpressionFurigana);
  const isRuby = doc.querySelector("ruby");

  if (isRuby) {
    let groupIndex = 0;
    const renderNode = (node: Node): JSX.Element => {
      if (node.nodeType === Node.TEXT_NODE) {
        const i = groupIndex++;
        return node.textContent
          ?.split("")
          .map((char, j) => <CharSpan char={char} i={i} j={j} />);
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();

        if (tagName === "rt") {
          return <rt innerHTML={el.innerHTML} />;
        }
        if (tagName === "rp") {
          return <rp innerHTML={el.innerHTML} />;
        }

        const children = Array.from(el.childNodes);
        if (tagName === "ruby") {
          return <ruby>{children.map((child) => renderNode(child))}</ruby>;
        }
        if (tagName === "rb") {
          // <rb> is deprecated
          // return <rb>{children.map((child) => renderNode(child))}</rb>;
          return children.map((child) => renderNode(child));
        }

        return <span innerHTML={el.outerHTML} />;
      }
      return null;
    };

    return (
      <>{Array.from(doc.body.childNodes).map((node) => renderNode(node))}</>
    );
  }

  const furiganaData = parseFurigana(ankiFields.ExpressionFurigana);

  if (
    furiganaData.length === 0 ||
    !ankiFields.ExpressionFurigana.includes("[")
  ) {
    return (
      <ruby>
        {ankiFields.Expression.split("").map((char, i) => (
          <CharSpan char={char} i={i} j={0} />
        ))}
        <Show
          when={
            ankiFields.ExpressionFurigana &&
            extractKanji(ankiFields.Expression).length > 0
          }
        >
          <rt>{ankiFields.ExpressionReading}</rt>
        </Show>
      </ruby>
    );
  }

  return (
    <>
      {furiganaData.map((item, i) => {
        const chars = item.text.trim().split("");

        if (item.type === "ruby") {
          return (
            <ruby>
              {chars.map((char, j) => (
                <CharSpan char={char} i={i} j={j} />
              ))}
              <Show when={item.reading.trim() !== "" || item.reading === " "}>
                <rt>{item.reading}</rt>
              </Show>
            </ruby>
          );
        }

        return (
          <span>
            {chars.map((char, j) => (
              <CharSpan char={char} i={i} j={j} />
            ))}
          </span>
        );
      })}
    </>
  );
}

function KanjiTooltip(props: {
  show: boolean;
  anchor: HTMLElement | undefined;
  onActive: () => void;
  onInactive: () => void;
}) {
  const [$general] = useGeneralContext();
  const [$kanji] = useKanjiContext();
  if (!$kanji.kanji) return null;

  const [tooltipRef, setTooltipRef] = createSignal<HTMLDivElement>();
  const [arrowRef, setArrowRef] = createSignal<HTMLDivElement>();

  const [position, setPosition] = createStore({
    x: 0,
    y: 0,
    arrowX: 0,
    arrowY: 0,
    staticSide: "",
  });

  const bp = useBreakpointContext();

  createEffect(() => {
    const tooltip = tooltipRef();
    const arrowEl = arrowRef();
    if (props.show && props.anchor && tooltip && arrowEl) {
      computePosition(props.anchor, tooltip, {
        placement: bp.isAtLeast("sm") ? "bottom-start" : "bottom",
        middleware: [
          offset({ mainAxis: -5, crossAxis: 0 }),
          flip(),
          shift({ padding: 5 }),
          arrow({
            element: arrowEl,
          }),
        ],
      }).then(({ x, y, placement, middlewareData }) => {
        const { x: arrowX, y: arrowY } = middlewareData.arrow ?? {};
        const staticSide =
          {
            top: "bottom",
            right: "left",
            bottom: "top",
            left: "right",
          }[placement.split("-")[0]] ?? "";

        setPosition({
          x,
          y,
          arrowX: arrowX ?? 0,
          arrowY: arrowY ?? 0,
          staticSide,
        });
      });
    }
  });

  return (
    <Portal mount={$general.layoutRef}>
      <div
        ref={setTooltipRef}
        class="absolute z-10 overflow-hidden rounded-lg horizontal-tb text-start tooltip tappable"
        tabindex={0}
        data-kanji-tooltip
        on:mouseenter={props.onActive}
        on:mouseleave={props.onInactive}
        on:focus={props.onActive}
        on:blur={props.onInactive}
        on:touchstart={props.onActive}
        on:touchend={(e) => e.stopPropagation()}
        style={{
          display: props.show ? "block" : "none",
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        <div
          ref={setArrowRef}
          class="absolute bg-base-content-faint size-8 rotate-45 z-20 -translate-y-6"
          style={{
            left: `${position.arrowX}px`,
            top: `${position.arrowY}px`,
            right: "",
            bottom: "",
            ...(position.staticSide ? { [position.staticSide]: "-4px" } : {}),
          }}
        ></div>
        <button
          data-anki-mobile-only="block"
          class="absolute z-20 top-2 right-2"
          on:click={props.onInactive}
          on:touchend={(e) => e.stopPropagation()}
        >
          <XIcon class="size-5 cursor-pointer text-base-content-soft" />
        </button>
        <div
          class="relative text-base bg-base-200/97 z-10 p-2 sm:p-4 border border-base-300 rounded-lg font-primary w-xs sm:w-md lg:w-lg shadow-lg max-h-[75vh] overflow-auto"
          style={{ color: "initial" }}
        >
          <KanjiInfo />
          <div class="text-sm mt-2 sm:mt-4 flex flex-col gap-1 sm:gap-2">
            <KanjiInfoExtra />
          </div>
        </div>
      </div>
    </Portal>
  );
}
