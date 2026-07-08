import type { AnkiDroidAPI } from "./types";

// Defaults for review-based font scaling (overridable via config)
export const DEFAULT_FONT_SCALE_MIN_PX = 12;
export const DEFAULT_FONT_SCALE_MAX_PX = 48;
export const DEFAULT_FONT_SCALE_MAX_INTERVAL_DAYS = 30;

export type FontScaleOptions = {
  enabled: boolean;
  minPx: number;
  maxPx: number;
  maxIntervalDays: number;
};

/**
 * Map a card's review interval to a font size in pixels: the expression
 * shrinks from `maxPx` (fresh card) toward `minPx` as the interval grows,
 * reaching `minPx` once the interval hits `maxIntervalDays`.
 *
 * Returns `undefined` when no override is needed (scaling disabled or a
 * brand-new/unreviewed card), letting the CSS-configured size apply.
 */
export function getScaledFontSizePx(
  options: FontScaleOptions,
  intervalDays: number,
): number | undefined {
  const { enabled, minPx, maxPx, maxIntervalDays } = options;
  if (!enabled) return undefined;
  if (intervalDays <= 0) return undefined; // no override needed
  if (maxIntervalDays <= 0) return minPx;
  if (intervalDays >= maxIntervalDays) return minPx;
  const t = intervalDays / maxIntervalDays;
  return Math.round(maxPx - t * (maxPx - minPx));
}

export async function fetchCardInterval(
  ankiDroidAPI: AnkiDroidAPI | undefined,
  ankiConnectAddress: string,
  cardId?: string,
): Promise<number> {
  // Try AnkiDroid JS API first
  if (ankiDroidAPI) {
    try {
      const res = await ankiDroidAPI.ankiGetCardInterval();
      if (res.success && res.value != null) return Number(res.value);
    } catch {}
  }

  // Try AnkiConnect — use cardId from template if available (works on desktop and mobile)
  if (ankiConnectAddress) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const invoke = async (
        action: string,
        params: Record<string, unknown> = {},
      ) => {
        const res = await fetch(ankiConnectAddress, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, version: 6, params }),
          signal: controller.signal,
        });
        return await res.json();
      };

      const resolvedCardId = cardId
        ? Number(cardId)
        : (await invoke("guiCurrentCard"))?.result?.cardId;

      if (resolvedCardId) {
        const info = await invoke("cardsInfo", { cards: [resolvedCardId] });
        clearTimeout(timeoutId);
        const interval = info?.result?.[0]?.interval;
        if (interval != null) return Number(interval);
      }
      clearTimeout(timeoutId);
    } catch {}
  }

  return 0;
}
