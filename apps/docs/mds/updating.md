---
outline: deep
---

# Updating Kiku

::: tip TLDR

1. **Download** the latest `.apkg` from [Releases](https://github.com/youyoumu/kiku/releases).
2. **Clean** existing files via `Tools` > `Kiku Note Manager` > **Delete Kiku files**.
3. **Import** the new `.apkg` into Anki.
4. **Sync** by opening the Kiku settings page and clicking **Save**.

:::

::: info REQUIREMENT
Anki **25.09** or later is required. Please ensure your Anki version is up to date before proceeding.
:::

## 1. Download

Download the latest `Kiku_v*.apkg` from the [Release page](https://github.com/youyoumu/kiku/releases).

## 2. Clean Existing Files

Anki will not overwrite files that already exist. To ensure a successful update, you must delete your existing [Kiku files](./how-things-work.md#kiku-files) before importing the new version.

::: tip Fast Cleanup
You can quickly delete all Kiku files while preserving your settings via the Kiku Note Manager:
Go to **Tools** > **Kiku Note Manager** > **Delete Kiku files**.

This will automatically keep your:

- `_kiku_config.json`
- `_kiku_plugin.js`
- `_kiku_plugin.css`

:::

## 3. Import

Import the `.apkg` into Anki. When prompted, ensure your settings match the options shown below:

![Import Options](/media/import-options.png)

::: info Final Step
After the import is complete, open the **Settings** page and click **Save**. This synchronizes your Front/Back/Styling templates with your current configuration.
:::
