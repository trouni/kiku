import { cp } from "node:fs/promises";
import { join } from "node:path";
import { defineConfig, type HeadConfig } from "vitepress";

const umamiScript: HeadConfig = [
  "script",
  {
    defer: "true",
    src: process.env.VITE_UMAMI_URL ?? "",
    "data-website-id": process.env.VITE_UMAMI_WEBSITE_ID ?? "",
  },
];

const dirname = import.meta.dirname;

function copyKikuCss() {
  return {
    name: "copy-kiku-css",
    async writeBundle() {
      const src = join(dirname, "../../packages/note/dist/_kiku.css");
      const dest = join(dirname, "./.vitepress/dist/_kiku.css");
      await cp(src, dest, { force: true });
    },
  };
}

export default defineConfig({
  srcDir: "mds",
  title: "Kiku",
  description: "Modern Anki notes, built like web apps.",
  head: [["link", { rel: "icon", href: "/favicon.ico" }], umamiScript],
  vite: {
    publicDir: "../public",
    plugins: [copyKikuCss()],
  },
  themeConfig: {
    lastUpdated: {},
    nav: [{ text: "Home", link: "/" }],
    sidebar: [
      {
        text: "Getting Started",
        items: [
          { text: "Installation", link: "/installation" },
          { text: "Updating Kiku", link: "/updating" },
          { text: "Switching From Lapis", link: "/migration" },
        ],
      },
      {
        text: "Learn More",
        items: [
          { text: "Features", link: "/features" },
          { text: "Field Grouping", link: "/field-grouping" },
          { text: "Plugin", link: "/plugin" },
          { text: "How Things Work", link: "/how-things-work" },
          { text: "Development", link: "/development" },
        ],
      },
      {
        text: "Recipes",
        items: [
          { text: "Add More External Links", link: "/add-more-external-links" },
          { text: "Display Extra Fields", link: "/display-extra-fields" },
          {
            text: "Unblur Picture Automatically",
            link: "/unblur-picture-automatically",
          },
          { text: "Random Font", link: "/random-font" },
          { text: "Custom Dictionary Style", link: "/custom-dictionary-style" },
          { text: "Custom Theme", link: "/custom-theme" },
          {
            text: "Custom Pitch Accent Color",
            link: "/custom-pitch-accent-color",
          },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/youyoumu/kiku" }],
  },
});
