import "#/util/polyfill";
import type { KikuConfig } from "#/util/config";
import type { Constants } from "#/util/general";
import type {
  AnkiFields,
  AnkiNote,
  KanjiInfo,
  KanjiInfoCompact,
  KikuDbMainManifest,
  KikuNotesManifest,
} from "#/util/types";

import { AnkiConnect } from "./anki-connect.worker";
import type { MainThreadApi } from "./client";
import { type NexRemote, NexWorker } from "./nex";

let main: NexRemote<MainThreadApi>;

const log = {
  trace: (...args: unknown[]) => main.log("trace", args),
  debug: (...args: unknown[]) => main.log("debug", args),
  info: (...args: unknown[]) => main.log("info", args),
  warn: (...args: unknown[]) => main.log("warn", args),
  error: (...args: unknown[]) => main.log("error", args),
};

export class WorkerThreadApi {
  assetsPath!: string;
  constants!: Constants;
  config!: KikuConfig;
  preferAnkiConnect!: boolean;
  cache = new Map();
  ankiConnect!: AnkiConnect;

  init(payload: {
    assetsPath: string;
    constants: Constants;
    config: KikuConfig;
    preferAnkiConnect: boolean;
  }) {
    log.debug("init Worker", payload);

    this.assetsPath = payload.assetsPath;
    this.constants = payload.constants;
    this.config = payload.config;
    this.preferAnkiConnect = payload.preferAnkiConnect;
    this.ankiConnect = new AnkiConnect(
      main.fetchJson,
      this.config.ankiConnectAddress,
    );
  }

  chunkCache = new Map<string, AnkiNote[]>();
  async query({
    kanjiList,
    readingList,
    expressionList,
  }: {
    kanjiList: string[];
    readingList: string[];
    expressionList: string[];
  }) {
    const queryWithNotesCache = async () => {
      const kanjiListResult: Record<string, AnkiNote[]> = {};
      const readingListResult: Record<string, AnkiNote[]> = {};
      const expressionListResult: Record<string, AnkiNote[]> = {};

      const manifest = await this.notesManifest();

      const kanjiSet = new Set(kanjiList);
      const readingSet = new Set(readingList);
      const expressionSet = new Set(expressionList);

      for (const chunk of manifest.chunks) {
        let notes = this.chunkCache.get(chunk.file);
        if (!notes) {
          const buf = await main.fetchArrayBuffer(
            `${this.assetsPath}/${chunk.file}`,
          );
          const text = await gunzipArrayBuffer(buf).text();
          notes = JSON.parse(text) as AnkiNote[];
          this.chunkCache.set(chunk.file, notes);
        }

        for (const note of notes) {
          if (note.modelName !== "Kiku" && note.modelName !== "Lapis") continue;

          const expr = note.fields.Expression.value;
          const reading = note.fields.ExpressionReading?.value ?? "";

          // ------- Kanji Search (contains) -------
          for (const kanji of kanjiSet) {
            if (expr.includes(kanji)) {
              kanjiListResult[kanji] ??= [];
              kanjiListResult[kanji].push(note);
            }
          }

          // ------- Reading Search (exact) -------
          if (readingSet.has(reading)) {
            readingListResult[reading] ??= [];
            readingListResult[reading].push(note);
          }

          // ------- Expression Search (exact) -------
          if (expressionSet.has(expr)) {
            expressionListResult[expr] ??= [];
            expressionListResult[expr].push(note);
          }
        }
      }

      return {
        kanjiListResult,
        readingListResult,
        expressionListResult,
      };
    };

    if (this.preferAnkiConnect) {
      try {
        log.info("Querying with AnkiConnect");
        return await this.ankiConnect.queryFieldContains({
          kanjiList,
          readingList,
          expressionList,
        });
      } catch {
        log.warn(
          "Failed to query with AnkiConnect, falling back to notes cache",
        );
        return await queryWithNotesCache();
      }
    }

    try {
      log.info("Querying with notes cache");
      return await queryWithNotesCache();
    } catch {
      log.warn("Failed to query with notes cache, falling back to AnkiConnect");
      return await this.ankiConnect.queryFieldContains({
        kanjiList,
        readingList,
        expressionList,
      });
    }
  }
  debounceTimer: ReturnType<typeof setTimeout> | null = null;
  debounceMs = 200;
  async queryShared({
    kanjiList,
    readingList,
    expressionList,
    ankiFields,
  }: {
    kanjiList: string[];
    readingList?: string[];
    expressionList?: string[];
    ankiFields: AnkiFields;
  }) {
    return new Promise<{
      kanjiResult: Record<string, AnkiNote[]>;
      readingResult: Record<string, AnkiNote[]>;
      expressionResult: Record<string, AnkiNote[]>;
    }>((resolve) => {
      this.pendingQueryShared.push({
        kanjiList,
        readingList: readingList ?? [],
        expressionList: expressionList ?? [],
        ankiFields,
        resolve,
      });
      if (this.debounceTimer) clearTimeout(this.debounceTimer);

      this.debounceTimer = setTimeout(() => {
        this.actualQueryShared();
      }, this.debounceMs);
    });
  }

  pendingQueryShared: {
    kanjiList: string[];
    readingList: string[];
    expressionList: string[];
    ankiFields: AnkiFields;
    resolve: (v: {
      kanjiResult: Record<string, AnkiNote[]>;
      readingResult: Record<string, AnkiNote[]>;
      expressionResult: Record<string, AnkiNote[]>;
    }) => void;
  }[] = [];

  async actualQueryShared() {
    const requests = this.pendingQueryShared;
    this.pendingQueryShared = [];

    const batchedKanjiList = [...new Set(requests.flatMap((r) => r.kanjiList))];
    const batchedReadingList = [
      ...new Set(requests.flatMap((r) => r.readingList)),
    ];
    const batchedExpressionList = [
      ...new Set(requests.flatMap((r) => r.expressionList)),
    ];

    const { kanjiListResult, readingListResult, expressionListResult } =
      await this.query({
        kanjiList: batchedKanjiList,
        readingList: batchedReadingList,
        expressionList: batchedExpressionList,
      });

    for (const req of requests) {
      const { kanjiList, readingList, expressionList, ankiFields } = req;

      const filterSameNote = (note: AnkiNote) => {
        if (note.cards.includes(Number(ankiFields.CardID))) return false;
        return true;
      };
      const filterSameExpression = (note: AnkiNote) => {
        return note.fields.Expression.value !== ankiFields.Expression;
      };

      // --- kanji ---
      const kanjiResult: Record<string, AnkiNote[]> = {};
      for (const kanji of kanjiList) {
        kanjiResult[kanji] =
          kanjiListResult[kanji]
            ?.filter(filterSameNote)
            .filter(filterSameExpression) ?? [];
      }

      // --- reading ---
      const readingResult: Record<string, AnkiNote[]> = {};
      for (const reading of readingList) {
        readingResult[reading] =
          readingListResult[reading]
            ?.filter(filterSameNote)
            .filter(filterSameExpression) ?? [];
      }

      // --- expression ---
      const expressionResult: Record<string, AnkiNote[]> = {};
      for (const expression of expressionList) {
        expressionResult[expression] =
          expressionListResult[expression]?.filter(filterSameNote) ?? [];
      }

      req.resolve({
        kanjiResult,
        readingResult,
        expressionResult,
      });
    }
  }

  lookupKanjiPromise:
    | PromiseWithResolvers<Record<string, KanjiInfo>>
    | undefined;
  async lookupKanji(kanji: string): Promise<KanjiInfo | undefined> {
    const key = this.lookupKanji.name;
    const cached = this.cache.get(key);
    let result: KanjiInfo | undefined;
    if (cached) {
      result = cached[kanji];
    } else if (this.lookupKanjiPromise) {
      result = (await this.lookupKanjiPromise.promise)[kanji];
    } else {
      this.lookupKanjiPromise = Promise.withResolvers();
      const manifest = await this.dbMainManifest();
      const file =
        manifest.files[this.constants.tar["kiku_db_kanji_compact.json.gz"]];
      const buf = await main.fetchArrayBuffer(
        `${this.assetsPath}/${this.constants.assets["_kiku_db_main.tar"]}`,
        {
          headers: { Range: `bytes=${file.start}-${file.end}` },
        },
        {
          range: {
            start: file.start,
            end: file.end,
            size: file.size,
          },
        },
      );

      const text = await gunzipArrayBuffer(buf).text();
      const dbKanjiCompact = JSON.parse(text);
      const dbKanji: Record<string, KanjiInfo> = {};
      for (const kanji of Object.keys(dbKanjiCompact)) {
        const data = fromCompact(dbKanjiCompact[kanji]);
        if (data) dbKanji[kanji] = data;
      }
      this.cache.set(key, dbKanji);
      this.lookupKanjiPromise.resolve(dbKanji);
      result = dbKanji[kanji];
    }
    return result;
  }

  async dbMainManifest(): Promise<KikuDbMainManifest> {
    const key = this.dbMainManifest.name;
    if (this.cache.has(key)) return this.cache.get(key);
    let manifest: KikuDbMainManifest;
    try {
      manifest = (await main.fetchJson(
        `${this.assetsPath}/${this.constants.assets["_kiku_db_main_manifest.json"]}`,
        { cache: "no-store" },
      )) as KikuDbMainManifest;
    } catch {
      log.error("Failed to load db main manifest");
      throw new Error("Failed to load db main manifest");
    }
    this.cache.set(key, manifest);
    return manifest;
  }

  async notesManifest(): Promise<KikuNotesManifest> {
    const key = this.notesManifest.name;
    if (this.cache.has(key)) return this.cache.get(key);
    let manifest: KikuNotesManifest;
    try {
      manifest = (await main.fetchJson(
        `${this.assetsPath}/${this.constants.assets["_kiku_notes_manifest.json"]}`,
        { cache: "no-store" },
      )) as KikuNotesManifest;
    } catch {
      log.error("Failed to load manifest");
      throw new Error("Failed to load manifest");
    }
    this.cache.set(key, manifest);
    return manifest;
  }
}

function gunzipArrayBuffer(buf: ArrayBuffer) {
  if (buf.byteLength === 0) {
    throw new Error("No body for empty buffer");
  }
  const res = new Response(buf);
  if (!res.body) {
    throw new Error("No body for buffer");
  }
  const ds = new DecompressionStream("gzip");
  const decompressed = res.body.pipeThrough(ds);
  return new Response(decompressed);
}

function fromCompact(c: KanjiInfoCompact | undefined): KanjiInfo | undefined {
  if (!c) return undefined;
  return {
    composedOf: c[0],
    usedIn: c[1],
    wkMeaning: c[2],
    meanings: c[3],
    keyword: c[4],
    readings: c[5],
    frequency: c[6],
    kind: c[7],
    visuallySimilar: c[8],
    related: c[9],
  };
}

const workerThreadApi = new WorkerThreadApi();
const nexWorker = new NexWorker<MainThreadApi>();
main = nexWorker.wrap(workerThreadApi);
