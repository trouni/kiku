import { createEffect, createSignal, For, onMount, Show } from "solid-js";
import { useCardContext } from "#/components/shared/CardContext";
import {
  countAudioTags,
  needsHtml5Audio,
  nodesToString,
  sliceSentenceAudioByGroup,
} from "#/util/general";
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

// Run `play` once the audio `file` (from the embedded DB) finishes — used to
// start the shown group's sentence right after the expression, when the
// expression plays through a channel that gives no `ended` event (Anki's native
// player). We read the duration from a metadata-only probe and subtract the
// time already elapsed since the expression started, so the sentence isn't
// delayed. Falls back to a fixed gap when the length can't be measured.
function playAfterAudio(
  file: string | undefined,
  startedAt: number,
  play: () => void,
) {
  if (!file) {
    setTimeout(play, 1200);
    return;
  }
  const probe = document.createElement("audio");
  probe.preload = "metadata";
  probe.src = file;
  probe.addEventListener("loadedmetadata", () => {
    const dur = probe.duration;
    const wait = Number.isFinite(dur)
      ? Math.max(0, dur * 1000 - (Date.now() - startedAt) + 150)
      : 1200;
    setTimeout(play, wait);
  });
  probe.addEventListener("error", () => setTimeout(play, 1200));
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
    // Only route through HTML5 when the native mobile player can't decode the
    // codec (ogg). mp3/aac autoplay natively, so keep those on the soundLink
    // path — that lets the grouped takeover below drive them via pycmd, and
    // avoids playing the same sound through both players at once.
    (needsHtml5Audio($card.selfAudio.expressionAudio) ||
      needsHtml5Audio($card.selfAudio.sentenceAudio));

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
          // The card has ogg the native player can't decode. Native autoplay
          // stalls on the first ogg tag and never reaches the sounds after it,
          // so drive the shown group through the webview's HTML5 <audio>: play
          // its sentence whatever the codec, and the expression too when it's
          // ogg. A native-playable (mp3) expression is left to native — it's
          // first in the queue, so native plays it before stalling.
          const expressionAudio =
            $card.expressionAudioRef?.querySelector("audio");
          const sentenceAudio = $card.sentenceAudioRef?.querySelector("audio");
          const exprRaw = $card.selfAudio?.expressionAudio ?? "";
          const exprNeedsHtml5 = needsHtml5Audio(exprRaw);
          const playExpression = !!expressionAudio && exprNeedsHtml5;
          // Once the expression is ogg, native has stalled, so its sentence
          // never sounds natively either — play it here regardless of codec.
          const playSentence =
            !!sentenceAudio &&
            (exprNeedsHtml5 || needsHtml5Audio(currentGroupRawSentenceAudio()));
          if (playExpression || playSentence) {
            autoPlay = false;
            if (playExpression) {
              expressionAudio.play();
              if (playSentence) {
                expressionAudio.onended = () => sentenceAudio?.play();
              }
            } else if (playSentence) {
              // Expression is mp3 (autoplaying natively); delay the sentence
              // until it ends so the two don't overlap.
              const exprFile = exprRaw.match(/\[sound:([^\]]+)\]/)?.[1];
              if (exprFile) {
                playAfterAudio(exprFile, Date.now(), () =>
                  sentenceAudio?.play(),
                );
              } else {
                sentenceAudio?.play();
              }
            }
          }
        } else if ($card.selfAudioReady) {
          const grouped = countAudioTags(ankiFields.SentenceAudio) > 1;
          if (grouped) {
            // Grouped, native-playable (mp3): the takeover effect below drives
            // it via pycmd so only the shown group sounds.
          } else if ($card.selfAudio) {
            // mp3 in the DB: Anki's native player autoplays it — take no action,
            // just stop retrying so the onMount backstop doesn't re-fire it.
            autoPlay = false;
          } else {
            // Not in the DB: native autoplay is unreliable on mobile, so trigger
            // the native player via the soundLink, like the manual play button.
            const expressionLink = $card.expressionAudioRef?.querySelector("a");
            if (expressionLink) {
              autoPlay = false;
              clickAnkiSoundLink(expressionLink);
            }
          }
        }
        // else: DB lookup still pending — wait; this effect re-runs when
        // selfAudio/selfAudioReady update, and onMount has a native backstop.
      }
    }
  });

  // Anki's native back-side autoplay plays every `[sound:...]` in
  // `{{SentenceAudio}}`. For a grouped note that's every group's sentence, not
  // just the one on screen. When there are 2+ sentence sounds we take over:
  // clicking a soundLink runs `pycmd('play:a:N')`, which clears Anki's autoplay
  // queue and interrupts it, so the off-screen groups never sound. We play the
  // expression first, then the shown group's sentence once the expression ends.
  // Runs wherever pycmd drives native playback (desktop, AnkiMobile) — but only
  // when soundLinks are rendered, i.e. NOT in htmlAudioMode, so ogg cards keep
  // the HTML5 path above (which already slices to the shown group). AnkiWeb is
  // excluded (no pycmd queue control).
  const [tookOver, setTookOver] = createSignal(false);
  let sentenceQueued = false;
  let expressionStartedAt = 0;

  createEffect(() => {
    if (tookOver()) return;
    if (
      props.position !== 1 ||
      $card.side !== "back" ||
      $card.nested ||
      !$general.isAnkiDesktop ||
      $general.isAnkiWeb
    ) {
      return;
    }
    // Re-runs once the shown group's soundLink is mounted. Absent in
    // htmlAudioMode (ogg) — those render <audio>, not <a>, so this no-ops and
    // the HTML5 path handles them.
    const sentenceAnchor = $card.sentenceAudioRef?.querySelector("a");
    if (!sentenceAnchor) return;
    // A single sentence sound autoplays fine natively — leave it alone.
    if (countAudioTags(ankiFields.SentenceAudio) <= 1) return;

    expressionStartedAt = Date.now();
    setTookOver(true);
    // Stop the mobile branch / onMount backstop from also firing.
    autoPlay = false;
    const expressionAnchor = $card.expressionAudioRef?.querySelector("a");
    if (expressionAnchor) {
      // Playing the expression also clears the native queue; the sentence
      // follows once we know how long the expression runs.
      clickAnkiSoundLink(expressionAnchor);
    } else {
      // No expression audio — just play the shown group's sentence.
      clickAnkiSoundLink(sentenceAnchor);
      sentenceQueued = true;
    }
  });

  // Start the shown group's sentence right after the expression finishes. Its
  // length comes from the embedded-DB audio once it loads; we subtract the time
  // already elapsed so the sentence isn't delayed, and fall back to a fixed gap
  // when the note has no DB audio to measure.
  createEffect(() => {
    $card.selfAudio;
    if (!tookOver() || sentenceQueued || !$card.selfAudioReady) return;
    const sentenceAnchor = $card.sentenceAudioRef?.querySelector("a");
    if (!sentenceAnchor) return;
    sentenceQueued = true;

    const file =
      $card.selfAudio?.expressionAudio?.match(/\[sound:([^\]]+)\]/)?.[1];
    playAfterAudio(file, expressionStartedAt, () =>
      clickAnkiSoundLink(sentenceAnchor),
    );
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
