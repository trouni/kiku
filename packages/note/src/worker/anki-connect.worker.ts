import type { AnkiNote } from "#/util/types";
import type { MainThreadApi } from "./client";

export class AnkiConnect {
  private fetchJson: MainThreadApi["fetchJson"];
  public ankiConnectAddress: string;

  constructor(
    fetchJson: MainThreadApi["fetchJson"],
    ankiConnectAddress: string,
  ) {
    this.fetchJson = fetchJson;
    this.ankiConnectAddress = ankiConnectAddress;
  }

  async invoke(action: string, params: Record<string, unknown> = {}) {
    const result = (await this.fetchJson(this.ankiConnectAddress, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, version: 6, params }),
    })) as { error?: string; result: unknown };
    if (result.error) throw new Error(result.error);
    return result.result;
  }

  async batchFindNotes(queries: string[]) {
    return (await this.invoke("multi", {
      actions: queries.map((query) => ({
        action: "findNotes",
        params: { query },
      })),
    })) as Array<number[]>;
  }

  async batchNotesInfo(noteIdsList: number[][]) {
    return (await this.invoke("multi", {
      actions: noteIdsList.map((ids) => ({
        action: "notesInfo",
        params: { notes: ids },
      })),
    })) as Array<AnkiNote[]>;
  }

  async queryFieldContains({
    kanjiList,
    readingList,
    expressionList,
  }: {
    kanjiList: string[];
    readingList: string[];
    expressionList: string[];
  }) {
    const noteFilter = `("note:Kiku" OR "note:Lapis")`;

    const kanjiQuery =
      kanjiList.length === 0
        ? null
        : `${noteFilter} AND (${kanjiList
            .map((k) => `"Expression:*${k}*"`)
            .join(" OR ")})`;

    const readingQuery =
      readingList.length === 0
        ? null
        : `${noteFilter} AND (${readingList
            .map((r) => `"ExpressionReading:${r}"`)
            .join(" OR ")})`;

    const expressionQuery =
      expressionList.length === 0
        ? null
        : `${noteFilter} AND (${expressionList
            .map((e) => `"Expression:${e}"`)
            .join(" OR ")})`;

    const queries = [kanjiQuery, readingQuery, expressionQuery].filter(
      Boolean,
    ) as string[];
    const idsLists = await this.batchFindNotes(queries);
    const allIds = [...new Set(idsLists.flat())];
    const [allNotes] = await this.batchNotesInfo([allIds]);

    const kanjiListResult: Record<string, AnkiNote[]> = {};
    const readingListResult: Record<string, AnkiNote[]> = {};
    const expressionListResult: Record<string, AnkiNote[]> = {};

    for (const k of kanjiList) {
      kanjiListResult[k] = allNotes.filter((n) =>
        n.fields.Expression?.value.includes(k),
      );
    }

    for (const r of readingList) {
      readingListResult[r] = allNotes.filter(
        (n) => n.fields.ExpressionReading?.value === r,
      );
    }

    for (const e of expressionList) {
      expressionListResult[e] = allNotes.filter(
        (n) => n.fields.Expression?.value === e,
      );
    }

    return {
      kanjiListResult,
      readingListResult,
      expressionListResult,
    };
  }
}
