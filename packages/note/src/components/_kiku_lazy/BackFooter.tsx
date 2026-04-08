import { createSignal, ErrorBoundary, Show } from "solid-js";
import { isHtmlEffectivelyEmpty } from "#/util/general";
import { useAnkiFieldContext } from "../shared/AnkiFieldsContext";
import { useCtxContext } from "../shared/CtxContext";
import { useFieldGroupContext } from "../shared/FieldGroupContext";
import { useGeneralContext } from "../shared/GeneralContext";
import { InfoIcon, NotebookPenIcon } from "./Icons";

export default function BackFooter(props: { tags: string[] }) {
  const [$general] = useGeneralContext();
  const { $group } = useFieldGroupContext();
  const { ankiFields } = useAnkiFieldContext<"back">();
  const ctx = useCtxContext();
  const tags = () => props.tags.filter(Boolean);
  const [notesExpanded, setNotesExpanded] = createSignal(false);

  const hasNotes = () => !isHtmlEffectivelyEmpty(ankiFields.Notes?.trim());

  function DefaultFooter() {
    return (
      <>
        {hasNotes() && (
          <div class="animate-fade-in notes-section">
            <button
              type="button"
              class="flex gap-2 items-center w-full bg-base-200 p-2 rounded-lg cursor-pointer hover:bg-base-300 transition-colors"
              on:click={() => setNotesExpanded((prev) => !prev)}
            >
              <div class="min-w-4">
                <NotebookPenIcon class="size-4 text-base-content-calm" />
              </div>
              <span class="text-base-content-calm text-sm font-medium">
                Notes
              </span>
              <svg
                class="size-4 text-base-content-calm ml-auto transition-transform"
                classList={{ "rotate-180": notesExpanded() }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {notesExpanded() && (
              <div
                class="bg-base-200 px-3 pb-3 -mt-1 rounded-b-lg overflow-auto max-h-60 text-sm text-base-content-calm animate-fade-in"
                innerHTML={ankiFields.Notes}
              ></div>
            )}
          </div>
        )}
        {$group.miscInfoField && (
          <div
            class={`flex gap-2 items-center justify-center bg-base-200 p-2 rounded-lg animate-fade-in misc-info`}
          >
            <div class="min-w-4">
              <InfoIcon class="size-4 text-base-content-calm" />
            </div>
            <div
              class="text-base-content-calm"
              innerHTML={$group.miscInfoField}
            ></div>
          </div>
        )}
        <Show when={tags().length}>
          <div class="flex gap-2 items-center justify-center animate-fade-in flex-wrap">
            {tags().map((tag) => {
              return <div class="badge badge-secondary">{tag}</div>;
            })}
          </div>
        </Show>
      </>
    );
  }

  return (
    <ErrorBoundary fallback={<DefaultFooter />}>
      <Show when={$general.plugin?.Footer} fallback={<DefaultFooter />}>
        {(get) => {
          const Footer = get();
          return <Footer ctx={ctx} DefaultFooter={DefaultFooter} />;
        }}
      </Show>
    </ErrorBoundary>
  );
}
