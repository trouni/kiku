import { createEffect, For, onMount, Show } from "solid-js";
import { useCardContext } from "#/components/shared/CardContext";
import { nodesToString, sliceSentenceAudioByGroup } from "#/util/general";
import { useAnkiFieldContext } from "../shared/AnkiFieldsContext";
import { useBreakpointContext } from "../shared/BreakpointContext";
import { useConfigContext } from "../shared/ConfigContext";
import { useFieldGroupContext } from "../shared/FieldGroupContext";
import { useGeneralContext } from "../shared/GeneralContext";
import { PlayIcon } from "./Icons";

function AudioTag(props: { text: string }) {
  const [$general] = useGeneralContext();
  // Find all `[sound:filename.mp3]` occurrences
  const matches = () => [...props.text.matchAll(/\[sound:([^\]]+)\]/g)];
  const sounds = () => matches().map((m) => m[1]);
  $general.logger.info("Using sounds:", sounds().join(", "));

  return (
    <Show when={sounds().length > 0}>
      <div class="flex flex-wrap gap-2">
        <For each={sounds()}>
          {(src) => {
            return <audio src={src} preload="none" />;
          }}
        </For>
      </div>
    </Show>
  );
}

// Trigger Anki playback for a soundLink anchor. On AnkiMobile (iOS WKWebView),
// inline `onclick="pycmd(...)"` handlers attached via innerHTML are not always
// executed when the element is clicked from inside a Shadow DOM. Parse the
// command out of the attribute and invoke `pycmd` directly so playback works
// regardless of where the cloned anchor lives.
function clickAnkiSoundLink(link: HTMLAnchorElement | null | undefined) {
  if (!link) return false;
  const onclickStr = link.getAttribute("onclick") ?? "";
  const match = onclickStr.match(/pycmd\(\s*['"]([^'"]+)['"]\s*\)/);
  const pycmdFn = (globalThis as { pycmd?: (cmd: string) => void }).pycmd;
  if (match && typeof pycmdFn === "function") {
    pycmdFn(match[1]);
    return true;
  }
  link.click();
  return true;
}

export function NotePlayIcon(props: {
  "on:click"?: () => void;
  color: "primary" | "secondary";
}) {
  return (
    <button
      on:click={props["on:click"]}
      on:touchend={(e) => e.stopPropagation()}
    >
      <PlayIcon
        class="bg-primary rounded-full text-primary-content p-1 w-8 h-8 cursor-pointer"
        classList={{
          "bg-primary text-primary-content": props.color === "primary",
          "bg-secondary text-secondary-content": props.color === "secondary",
        }}
      />
    </button>
  );
}

export default function AudioButtons(props: { position: 1 | 2 }) {
  const [$general] = useGeneralContext();
  const { ankiFields } = useAnkiFieldContext<"back">();
  const [$card, $setCard] = useCardContext();
  const { $group } = useFieldGroupContext();
  const [$config] = useConfigContext();
  const bp = useBreakpointContext();
  const hiddenStyle = {
    width: "0",
    height: "0",
    overflow: "hidden",
    position: "absolute",
  } as const;

  // On mobile, Anki's native player can't decode some codecs (notably ogg),
  // and native back-side autoplay is unreliable. When we have the note's raw
  // `[sound:...]` refs (from the embedded DB), render real <audio> elements and
  // play them through the webview instead — same path nested cards already use,
  // which decodes ogg fine. Desktop/AnkiWeb keep native playback.
  const htmlAudioMode = () =>
    !$card.nested &&
    !bp.isAtLeast("sm") &&
    !$general.isAnkiWeb &&
    !!$card.selfAudio &&
    (!!$card.selfAudio.expressionAudio.trim() ||
      !!$card.selfAudio.sentenceAudio.trim());

  // Raw sentence audio for the group currently on screen.
  const currentGroupRawSentenceAudio = () =>
    sliceSentenceAudioByGroup(
      $card.selfAudio?.sentenceAudio ?? "",
      $group.currentId,
    );

  createEffect(() => {
    $group.sentenceAudioField;
    // Re-run when we switch into HTML5 mode so `sentenceAudios` picks up the
    // <audio> elements instead of the (now absent) soundLink anchors.
    $card.selfAudio;
    const anchors = $card.sentenceAudioRef?.querySelectorAll("a");
    if (anchors?.length) {
      $setCard("sentenceAudios", Array.from(anchors));
      const anchorsHtml = nodesToString(Array.from(anchors));
      $general.logger.info("Anchors in sentence audios:", anchorsHtml);
    }

    const audios = $card.sentenceAudioRef?.querySelectorAll("audio");
    if (audios?.length) {
      $setCard("sentenceAudios", Array.from(audios));
      const audiosHtml = nodesToString(Array.from(audios));
      $general.logger.info("Audios in sentence audios:", audiosHtml);
    }

    if (!anchors?.length && !audios?.length) {
      $setCard("sentenceAudios", undefined);
    }
  });

  let autoPlay = true;
  createEffect(() => {
    $group.sentenceAudioField;
    // Track raw-audio arrival so autoplay re-evaluates once the DB lookup lands.
    $card.selfAudio;
    $card.selfAudioReady;
    const useWebVolume = bp.isAtLeast("sm") || $general.isAnkiWeb;
    $card.expressionAudioRef?.querySelectorAll("audio").forEach((el) => {
      el.volume = useWebVolume ? $config.volume / 100 : 1;
    });
    $card.sentenceAudioRef?.querySelectorAll("audio").forEach((el) => {
      el.volume = useWebVolume ? $config.volume / 100 : 1;
    });

    if (autoPlay) {
      if ($card.nested) {
        const audio = $card.expressionAudioRef?.querySelector("audio");
        if (audio) {
          autoPlay = false;
          audio.play();
          audio.onpause = () => {
            const audio = $card.sentenceAudioRef?.querySelectorAll("audio")[0];
            if (audio) {
              audio.play();
            }
          };
        }
      } else if (
        props.position === 1 &&
        $card.side === "back" &&
        !bp.isAtLeast("sm") &&
        !$general.isAnkiWeb
      ) {
        // Mobile native Anki (AnkiDroid/AnkiMobile) doesn't reliably autoplay
        // back-side audio. Gated by position to avoid the second instance
        // double-firing.
        if (htmlAudioMode()) {
          // Play through the webview's HTML5 <audio> (decodes ogg, which the
          // native player can't). Expression first, then the shown sentence —
          // the order desktop autoplay uses.
          const expressionAudio =
            $card.expressionAudioRef?.querySelector("audio");
          const sentenceAudio = $card.sentenceAudioRef?.querySelector("audio");
          if (expressionAudio || sentenceAudio) {
            autoPlay = false;
            if (expressionAudio) {
              expressionAudio.play();
              expressionAudio.onended = () => sentenceAudio?.play();
            } else {
              sentenceAudio?.play();
            }
          }
        } else if ($card.selfAudioReady) {
          // No raw audio for this note (not in the DB) — fall back to Anki's
          // native player via the soundLink, like the manual play button.
          const expressionLink = $card.expressionAudioRef?.querySelector("a");
          if (expressionLink) {
            autoPlay = false;
            clickAnkiSoundLink(expressionLink);
          }
        }
        // else: DB lookup still pending — wait; this effect re-runs when
        // selfAudio/selfAudioReady update, and onMount has a native backstop.
      }
    }
  });

  onMount(() => {
    if ($card.isNsfw && $config.muteNsfw) {
      clickAnkiSoundLink($card.expressionAudioRef?.querySelector("a"));
    }

    // Backstop: if the notes-DB lookup never settles (worker hang, missing DB),
    // don't leave the card silent — fall back to the native player.
    if (
      props.position === 1 &&
      $card.side === "back" &&
      !bp.isAtLeast("sm") &&
      !$general.isAnkiWeb
    ) {
      setTimeout(() => {
        if (autoPlay && !htmlAudioMode()) {
          const expressionLink = $card.expressionAudioRef?.querySelector("a");
          if (expressionLink) {
            autoPlay = false;
            clickAnkiSoundLink(expressionLink);
          }
        }
      }, 2500);
    }
  });

  const NotePlayIcons = () => {
    return (
      <>
        {ankiFields.ExpressionAudio && (
          <NotePlayIcon
            color="primary"
            on:click={() => {
              clickAnkiSoundLink($card.expressionAudioRef?.querySelector("a"));
              $card.expressionAudioRef?.querySelector("audio")?.play();
            }}
          ></NotePlayIcon>
        )}
        {$card.sentenceAudios?.map((el) => {
          return (
            <NotePlayIcon
              color="secondary"
              on:click={() => {
                if (el instanceof HTMLAnchorElement) clickAnkiSoundLink(el);
                else el.click();
                if (el instanceof HTMLAudioElement) el.play();
              }}
            ></NotePlayIcon>
          );
        })}
      </>
    );
  };

  if (props.position === 1)
    return (
      <>
        {/* In HTML5 mode, render a distinct <audio> div (via <Show>) rather
            than mutating innerHTML in place — swapping the element cleanly drops
            the native soundLink so it can't linger and double-fire. */}
        <Show
          when={htmlAudioMode()}
          fallback={
            <div
              style={hiddenStyle}
              ref={(ref) => $setCard("expressionAudioRef", ref)}
              innerHTML={$card.nested ? undefined : ankiFields.ExpressionAudio}
            >
              {$card.nested && <AudioTag text={ankiFields.ExpressionAudio} />}
            </div>
          }
        >
          <div
            style={hiddenStyle}
            ref={(ref) => $setCard("expressionAudioRef", ref)}
          >
            <AudioTag text={$card.selfAudio?.expressionAudio ?? ""} />
          </div>
        </Show>
        <Show
          when={htmlAudioMode()}
          fallback={
            <div
              style={hiddenStyle}
              ref={(ref) => $setCard("sentenceAudioRef", ref)}
              innerHTML={$card.nested ? undefined : $group.sentenceAudioField}
            >
              {$card.nested && <AudioTag text={$group.sentenceAudioField} />}
            </div>
          }
        >
          <div
            style={hiddenStyle}
            ref={(ref) => $setCard("sentenceAudioRef", ref)}
          >
            <AudioTag text={currentGroupRawSentenceAudio()} />
          </div>
        </Show>
        <NotePlayIcons />
      </>
    );
}
