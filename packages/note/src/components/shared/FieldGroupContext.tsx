import { createContext, createEffect, useContext } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";
import { createStore, type SetStoreFunction, type Store } from "solid-js/store";
import { nodesToString, parseHtml } from "#/util/general";
import type { AnkiFields, AnkiFrontFields } from "#/util/types";
import { useAnkiFieldContext } from "./AnkiFieldsContext";
import { useCardContext } from "./CardContext";
import { useGeneralContext } from "./GeneralContext";

export type GroupStore = {
  sentenceField: string;
  sentenceTranslationField: string;
  pictureField: string;
  sentenceAudioField: string;
  miscInfoField: string;
  index: number;
  ids: string[];
};

const FieldGroupContext = createContext<{
  $group: Store<GroupStore>;
  $setGroup: SetStoreFunction<GroupStore>;
  $next: () => boolean;
  $prev: () => boolean;
  ankiFields: AnkiFields | AnkiFrontFields;
}>();

export function FieldGroupContextProvider(props: { children: JSX.Element }) {
  const { ankiFields } = useAnkiFieldContext();
  const [$card] = useCardContext();
  const [$general] = useGeneralContext();

  const sentenceField = () => {
    if ($card.side === "front") {
      return ankiFields["kanji:Sentence"];
    }
    if ($card.nested) return ankiFields.Sentence;
    return ankiFields["furigana:SentenceFurigana"]
      ? ankiFields["furigana:SentenceFurigana"]
      : ankiFields["kanji:Sentence"];
  };
  const pictureField = ankiFields.Picture;
  const sentenceAudioField = ankiFields.SentenceAudio;
  const miscInfoField = ankiFields.MiscInfo;
  const sentenceTranslationField = ankiFields.SentenceTranslation;
  const [$group, $setGroup] = createStore<GroupStore>({
    sentenceField: sentenceField(),
    sentenceTranslationField: sentenceTranslationField ?? "",
    pictureField,
    sentenceAudioField,
    miscInfoField,
    index: 0,
    ids: [],
  });
  const ids = new Set<string>();
  const addIds = (id: string | undefined) => {
    if (id) ids.add(id);
    $setGroup("ids", Array.from(ids));
  };

  createEffect(() => {
    ids.clear();
    $setGroup("ids", []);

    const sentenceFieldDoc = parseHtml(sentenceField());
    const sentenceFieldWithGroup =
      sentenceFieldDoc.querySelectorAll("[data-group-id]");
    sentenceFieldWithGroup.forEach((el) => {
      const id = (el as HTMLElement).dataset.groupId;
      addIds(id);
    });

    const sentenceFieldWithoutGroup = Array.from(
      sentenceFieldDoc.body.childNodes,
    ).filter((el) => !(el as HTMLElement).dataset?.groupId);
    const sentenceFieldWithoutGroupHtml = nodesToString(
      sentenceFieldWithoutGroup,
    );

    const sentenceAudioFieldDoc = parseHtml(sentenceAudioField);
    const sentenceAudioFieldWithGroup =
      sentenceAudioFieldDoc.querySelectorAll("[data-group-id]");
    sentenceAudioFieldWithGroup.forEach((el) => {
      const id = (el as HTMLElement).dataset.groupId;
      addIds(id);
    });

    const sentenceAudioFieldWithoutGroup = Array.from(
      sentenceAudioFieldDoc.body.childNodes,
    ).filter((el) => !(el as HTMLElement).dataset?.groupId);
    const sentenceAudioFieldWithoutGroupHtml = nodesToString(
      sentenceAudioFieldWithoutGroup,
    );

    const miscInfoFieldDoc = parseHtml(miscInfoField);
    const miscInfoFieldWithGroup =
      miscInfoFieldDoc.querySelectorAll("[data-group-id]");
    miscInfoFieldWithGroup.forEach((el) => {
      const id = (el as HTMLElement).dataset.groupId;
      addIds(id);
    });

    const miscInfoFieldWithoutGroup = Array.from(
      miscInfoFieldDoc.body.childNodes,
    ).filter((el) => !(el as HTMLElement).dataset?.groupId);
    const miscInfoFieldWithoutGroupHtml = nodesToString(
      miscInfoFieldWithoutGroup,
    );

    const sentenceTranslationFieldDoc = parseHtml(sentenceTranslationField ?? "");
    const sentenceTranslationFieldWithGroup =
      sentenceTranslationFieldDoc.querySelectorAll("[data-group-id]");
    sentenceTranslationFieldWithGroup.forEach((el) => {
      const id = (el as HTMLSpanElement).dataset.groupId;
      addIds(id);
    });

    const sentenceTranslationFieldWithoutGroup = Array.from(
      sentenceTranslationFieldDoc.body.childNodes,
    ).filter((el) => !(el as HTMLSpanElement).dataset?.groupId);
    const sentenceTranslationFieldWithoutGroupHtml = nodesToString(
      sentenceTranslationFieldWithoutGroup,
    );

    // each img has their own separate page. img without group id will be given group id <= 0
    const pictureFieldDoc = parseHtml(pictureField);
    const pictureFieldWithGroup = pictureFieldDoc.querySelectorAll("img");
    pictureFieldWithGroup.forEach((el) => {
      let id = (el as HTMLElement).dataset.groupId;
      if (!id) {
        id = "0";
        el.dataset.groupId = id;
      }
      addIds(id);
    });

    // create img with no src if ungrouped fields has no img
    let dummyImg: HTMLImageElement | undefined;
    if (
      !Array.from(ids)
        .map(Number)
        .some((id) => id <= 0) &&
      (sentenceFieldWithoutGroupHtml.trim() ||
        sentenceAudioFieldWithoutGroupHtml.trim() ||
        miscInfoFieldWithoutGroupHtml.trim() ||
        sentenceTranslationFieldWithoutGroupHtml.trim())
    ) {
      const img = document.createElement("img");
      img.dataset.groupId = "0";
      dummyImg = img;
      addIds("0");
    }

    // Randomize initial index for cloze cards so users see varied sentences
    if ($card.cardType === "cloze" && $group.ids.length > 1 && $group.index === 0) {
      $setGroup("index", Math.floor(Math.random() * $group.ids.length));
    }

    if ($group.ids.length > 0) {
      const sorted = $group.ids
        .map((id) => Number(id))
        .sort((a, b) => {
          if (a === 0) return -1;
          if (b === 0) return 1;
          return b - a;
        });
      const id = sorted[$group.index];
      let sentenceField: string | undefined;
      let sentenceAudioField: string | undefined;
      let miscInfoField: string | undefined;
      let sentenceTranslationField: string | undefined;
      let pictureField: string | undefined;

      const filterById = (nodes: Iterable<Node> | ArrayLike<Node>) =>
        Array.from(nodes)
          .filter(
            (el) => (el as HTMLElement).dataset?.groupId === id.toString(),
          )
          .map((el) => (el as HTMLElement).outerHTML)
          .join("");

      if (id > 0) {
        sentenceField = filterById(sentenceFieldWithGroup);
        sentenceAudioField = filterById(sentenceAudioFieldWithGroup);
        miscInfoField = filterById(miscInfoFieldWithGroup);

        sentenceTranslationField = Array.from(sentenceTranslationFieldWithGroup).find(
          (el) => (el as HTMLSpanElement).dataset.groupId === id.toString(),
        )?.outerHTML ?? (sentenceTranslationFieldWithoutGroupHtml || undefined);

        const pictureFieldArray = Array.from(pictureFieldWithGroup);
        if (dummyImg) pictureFieldArray.push(dummyImg);
        pictureField = filterById(pictureFieldArray);
      } else {
        sentenceField = sentenceFieldWithoutGroupHtml;
        sentenceAudioField = sentenceAudioFieldWithoutGroupHtml;
        miscInfoField = miscInfoFieldWithoutGroupHtml;
        sentenceTranslationField = sentenceTranslationFieldWithoutGroupHtml;

        const pictureFieldArray = Array.from(pictureFieldWithGroup);
        if (dummyImg) pictureFieldArray.push(dummyImg);
        pictureField = filterById(pictureFieldArray);
      }
      $setGroup("sentenceField", sentenceField ?? "");
      $setGroup("sentenceTranslationField", sentenceTranslationField ?? "");
      $setGroup("sentenceAudioField", sentenceAudioField ?? "");
      $setGroup("miscInfoField", miscInfoField ?? "");
      $setGroup("pictureField", pictureField ?? "");

      // biome-ignore lint format: this looks nicer
      { $general.logger.info("[Groups] sentenceField:", sentenceField);
        $general.logger.info("[Groups] sentenceTranslationField:", sentenceTranslationField);
        $general.logger.info("[Groups] sentenceAudioField:", sentenceAudioField,);
        $general.logger.info("[Groups] miscInfoField:", miscInfoField);
        $general.logger.info("[Groups] pictureField:", pictureField); }
    }
  });

  function $next() {
    let changed = false;
    $setGroup("index", (prev) => {
      const newIndex = (prev + 1 + $group.ids.length) % $group.ids.length;
      if (newIndex !== prev) changed = true;
      return newIndex;
    });
    return changed;
  }

  function $prev() {
    let changed = false;
    $setGroup("index", (prev) => {
      const newIndex = (prev - 1 + $group.ids.length) % $group.ids.length;
      if (newIndex !== prev) changed = true;
      return newIndex;
    });
    return changed;
  }

  return (
    <FieldGroupContext.Provider
      value={{
        $group,
        $setGroup,
        $next,
        $prev,
        ankiFields,
      }}
    >
      {props.children}
    </FieldGroupContext.Provider>
  );
}

export function useFieldGroupContext() {
  const fieldGroup = useContext(FieldGroupContext);
  if (!fieldGroup) throw new Error("Missing FieldGroupContext");
  return fieldGroup;
}

const RootFieldGroupConext = createContext<{
  $group: Store<GroupStore>;
  $setGroup: SetStoreFunction<GroupStore>;
  $next: () => void;
  $prev: () => void;
  ankiFields: AnkiFields | AnkiFrontFields;
}>();

export function RootFieldGroupContextProvider(props: {
  children: JSX.Element;
}) {
  const value = useFieldGroupContext();

  return (
    <RootFieldGroupConext.Provider value={value}>
      {props.children}
    </RootFieldGroupConext.Provider>
  );
}

export function useRootFieldGroupContext() {
  const fieldGroup = useContext(RootFieldGroupConext);
  if (!fieldGroup) throw new Error("Missing RootFieldGroupContext");
  return fieldGroup;
}
