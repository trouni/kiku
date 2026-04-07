import { access, stat } from "node:fs/promises";
import { join } from "node:path";
import { loadEnvFile } from "node:process";
import { paths } from "./paths.ts";

// 1. Try to load the .env file, but don't crash if it's missing
try {
  await access(paths["@/.env"]);
  loadEnvFile(paths["@/.env"]);
} catch {
  console.warn("! No .env file found at", paths["@/.env"], "- skipping load.");
}

const BASE_DIR =
  process.platform === "win32"
    ? (process.env.APPDATA ?? "")
    : process.platform === "darwin"
      ? join(process.env.HOME ?? "", "Library/Application Support")
      : join(process.env.HOME ?? "", ".local/share");

const ANKI_USER = process.env.ANKI_USER ?? "User 1";

const ANKI_COLLECTION_MEDIA_PATH =
  process.env.ANKI_COLLECTION_MEDIA_PATH ||
  join(BASE_DIR, `Anki2/${ANKI_USER}/collection.media`);

// 2. Only validate the path if we are NOT in a CI environment (like Vercel)
if (process.env.CI !== "true") {
  try {
    await stat(ANKI_COLLECTION_MEDIA_PATH);
  } catch {
    throw new Error(
      `ANKI_COLLECTION_MEDIA_PATH does not exist at: ${ANKI_COLLECTION_MEDIA_PATH}\n` +
        "Please check your .env file or ensure the path is correct.",
    );
  }
} else {
  console.log("🚀 CI detected: Skipping local file system validation.");
}

export const env = {
  ANKI_COLLECTION_MEDIA_PATH,
};
