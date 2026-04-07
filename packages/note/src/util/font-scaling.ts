import type { TailwindSize } from "./config";
import type { AnkiDroidAPI } from "./types";

// Tailwind v4 default font sizes in pixels (assuming 16px root)
const tailwindSizePixels: Record<TailwindSize, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
  "6xl": 60,
  "7xl": 72,
  "8xl": 96,
  "9xl": 128,
};

export const MIN_FONT_SIZE_PX = 10;
const MAX_INTERVAL_DAYS = 30;

export function getScaledFontSizePx(
  configuredSize: TailwindSize,
  intervalDays: number,
): number | undefined {
  if (intervalDays <= 0) return undefined; // no override needed
  const maxPx = tailwindSizePixels[configuredSize];
  if (intervalDays >= MAX_INTERVAL_DAYS) return MIN_FONT_SIZE_PX;
  const t = intervalDays / MAX_INTERVAL_DAYS;
  return Math.round(maxPx - t * (maxPx - MIN_FONT_SIZE_PX));
}

export async function fetchCardInterval(
  ankiDroidAPI: AnkiDroidAPI | undefined,
  ankiConnectAddress: string,
): Promise<number> {
  // Try AnkiDroid JS API first
  if (ankiDroidAPI) {
    try {
      const res = await ankiDroidAPI.ankiGetCardInterval();
      if (res.success && res.value != null) return Number(res.value);
    } catch {}
  }

  // Try AnkiConnect (desktop)
  if (ankiConnectAddress) {
    try {
      const invoke = async (action: string, params: Record<string, unknown> = {}) => {
        const res = await fetch(ankiConnectAddress, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, version: 6, params }),
        });
        return await res.json();
      };

      const gui = await invoke("guiCurrentCard");
      const cardId = gui?.result?.cardId;
      if (cardId) {
        const info = await invoke("cardsInfo", { cards: [cardId] });
        const interval = info?.result?.[0]?.interval;
        if (interval != null) return Number(interval);
      }
    } catch {}
  }

  return 0;
}
